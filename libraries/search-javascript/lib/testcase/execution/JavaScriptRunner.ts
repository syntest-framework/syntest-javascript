/*
 * Copyright 2020-2023 Delft University of Technology and SynTest contributors
 *
 * This file is part of SynTest Framework - SynTest Javascript.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { unlinkSync, writeFileSync } from "node:fs";
import * as path from "node:path";

import { Datapoint, EncodingRunner, ExecutionResult } from "@syntest/core";
import {
  InstrumentationData,
  MetaData,
} from "@syntest/instrumentation-javascript";
import { getLogger } from "@syntest/logging";
import cloneDeep = require("lodash.clonedeep");
import { Runner } from "mocha";
import Mocha = require("mocha");
import originalrequire = require("original-require");

import {
  JavaScriptExecutionResult,
  JavaScriptExecutionStatus,
} from "../../search/JavaScriptExecutionResult";
import { JavaScriptSubject } from "../../search/JavaScriptSubject";
import { JavaScriptDecoder } from "../../testbuilding/JavaScriptDecoder";
import { JavaScriptTestCase } from "../JavaScriptTestCase";

import { ExecutionInformationIntegrator } from "./ExecutionInformationIntegrator";
import { SilentMochaReporter } from "./SilentMochaReporter";

export class JavaScriptRunner implements EncodingRunner<JavaScriptTestCase> {
  private static LOGGER = getLogger("JavaScriptRunner");

  protected decoder: JavaScriptDecoder;
  protected tempTestDirectory: string;
  protected executionInformationIntegrator: ExecutionInformationIntegrator;

  constructor(decoder: JavaScriptDecoder, temporaryTestDirectory: string) {
    this.decoder = decoder;
    this.tempTestDirectory = temporaryTestDirectory;
    this.executionInformationIntegrator = new ExecutionInformationIntegrator();

    process.on("uncaughtException", (reason) => {
      throw reason;
    });
    process.on("unhandledRejection", (reason) => {
      throw reason;
    });
  }

  writeTestCase(
    filePath: string,
    testCase: JavaScriptTestCase,
    targetName: string,
    addLogs = false
  ): void {
    const decodedTestCase = this.decoder.decode(testCase, targetName, addLogs);

    writeFileSync(filePath, decodedTestCase);
  }

  /**
   * Deletes a certain file.
   *
   * @param filepath  the filepath of the file to delete
   */
  deleteTestCase(filepath: string): void {
    try {
      unlinkSync(filepath);
    } catch (error) {
      JavaScriptRunner.LOGGER.debug(error);
    }
  }

  async run(paths: string[]): Promise<Runner> {
    paths = paths.map((p) => path.resolve(p));

    const argv: Mocha.MochaOptions = <Mocha.MochaOptions>(<unknown>{
      spec: paths,
      reporter: SilentMochaReporter,
    });

    const mocha = new Mocha(argv); // require('ts-node/register')

    // eslint-disable-next-line unicorn/prefer-module
    require("regenerator-runtime/runtime");
    // eslint-disable-next-line unicorn/prefer-module, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-var-requires
    require("@babel/register")({
      // eslint-disable-next-line unicorn/prefer-module
      presets: [require.resolve("@babel/preset-env")],
    });

    for (const _path of paths) {
      delete originalrequire.cache[_path];
      mocha.addFile(_path);
    }

    let runner: Runner;

    // Finally, run mocha.
    await new Promise((resolve) => {
      runner = mocha.run((failures) => resolve(failures));
    });

    mocha.dispose();
    return runner;
  }

  async execute(
    subject: JavaScriptSubject,
    testCase: JavaScriptTestCase
  ): Promise<ExecutionResult> {
    const testPath = path.resolve(
      path.join(this.tempTestDirectory, "tempTest.spec.js")
    );

    this.writeTestCase(testPath, testCase, subject.name);

    const runner = await this.run([testPath]);
    const test = runner.suite.suites[0].tests[0];
    const stats = runner.stats;

    // If one of the executions failed, log it
    this.executionInformationIntegrator.process(testCase, test, stats);

    // Retrieve execution traces
    const instrumentationData = <InstrumentationData>(
      cloneDeep(<InstrumentationData>global.__coverage__)
    );
    const metaData = <MetaData>cloneDeep(<MetaData>global.__meta__);

    const traces: Datapoint[] = [];
    for (const key of Object.keys(instrumentationData)) {
      for (const functionKey of Object.keys(instrumentationData[key].fnMap)) {
        const function_ = instrumentationData[key].fnMap[functionKey];
        const hits = instrumentationData[key].f[functionKey];

        traces.push({
          id: `f-${function_.line}`,
          type: "function",
          path: key,
          line: function_.line,

          hits: hits,
        });
      }

      for (const statementKey of Object.keys(
        instrumentationData[key].statementMap
      )) {
        const statement = instrumentationData[key].statementMap[statementKey];
        const hits = instrumentationData[key].s[statementKey];

        traces.push({
          id: `s-${statement.start.line}`,
          type: "statement",
          path: key,
          line: statement.start.line,

          hits: hits,
        });
      }

      for (const branchKey of Object.keys(instrumentationData[key].branchMap)) {
        const branch = instrumentationData[key].branchMap[branchKey];
        const hits = <number[]>instrumentationData[key].b[branchKey];
        const meta = metaData[key]?.meta?.[branchKey];

        traces.push(
          {
            id: `b-${branch.line}`,
            path: key,
            type: "branch",
            line: branch.line,

            hits: hits[0],

            condition_ast: meta?.condition_ast,
            condition: meta?.condition,
            variables: meta?.variables,
          },
          {
            id: `b-${branch.line}`,
            path: key,
            type: "branch",
            line: branch.line,

            hits: hits[1],

            condition_ast: meta?.condition_ast,
            condition: meta?.condition,
            variables: meta?.variables,
          }
        );
      }
    }

    // Retrieve execution information
    let executionResult: JavaScriptExecutionResult;
    if (
      runner.suite.suites.length > 0 &&
      runner.suite.suites[0].tests.length > 0
    ) {
      const test = runner.suite.suites[0].tests[0];

      let status: JavaScriptExecutionStatus;
      let exception: string;

      if (test.isPassed()) {
        status = JavaScriptExecutionStatus.PASSED;
      } else if (test.timedOut) {
        status = JavaScriptExecutionStatus.TIMED_OUT;
      } else {
        status = JavaScriptExecutionStatus.FAILED;
        exception = test.err.message;
      }

      const duration = test.duration;

      executionResult = new JavaScriptExecutionResult(
        status,
        traces,
        duration,
        exception
      );
    } else {
      executionResult = new JavaScriptExecutionResult(
        JavaScriptExecutionStatus.FAILED,
        traces,
        stats.duration
      );
    }

    // Reset instrumentation data (no hits)
    this.resetInstrumentationData();

    // Remove test file
    this.deleteTestCase(testPath);

    return executionResult;
  }

  resetInstrumentationData() {
    for (const key of Object.keys(<InstrumentationData>global.__coverage__)) {
      for (const statementKey of Object.keys(
        (<InstrumentationData>global.__coverage__)[key].s
      )) {
        (<InstrumentationData>global.__coverage__)[key].s[statementKey] = 0;
      }
      for (const functionKey of Object.keys(
        (<InstrumentationData>global.__coverage__)[key].f
      )) {
        (<InstrumentationData>global.__coverage__)[key].f[functionKey] = 0;
      }
      for (const branchKey of Object.keys(
        (<InstrumentationData>global.__coverage__)[key].b
      )) {
        (<InstrumentationData>global.__coverage__)[key].b[branchKey] = [0, 0];
      }
    }
  }
}