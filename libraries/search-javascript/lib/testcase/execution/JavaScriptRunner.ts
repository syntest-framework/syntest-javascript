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

import * as path from "node:path";

import { Datapoint, EncodingRunner, ExecutionResult } from "@syntest/search";
import { getLogger, Logger } from "@syntest/logging";

import {
  JavaScriptExecutionResult,
  JavaScriptExecutionStatus,
} from "../../search/JavaScriptExecutionResult";
import { JavaScriptSubject } from "../../search/JavaScriptSubject";
import { JavaScriptDecoder } from "../../testbuilding/JavaScriptDecoder";
import { JavaScriptTestCase } from "../JavaScriptTestCase";

import { ExecutionInformationIntegrator } from "./ExecutionInformationIntegrator";
import { StorageManager } from "@syntest/storage";
import { DoneMessage, Message, Suite } from "./TestExecutor";
import { ChildProcess, fork } from "node:child_process";
import {
  InstrumentationData,
  MetaData,
} from "@syntest/instrumentation-javascript";
import cloneDeep = require("lodash.clonedeep");
import { Runner } from "mocha";
import Mocha = require("mocha");
import { SilentMochaReporter } from "./SilentMochaReporter";

export class JavaScriptRunner implements EncodingRunner<JavaScriptTestCase> {
  protected static LOGGER: Logger;

  protected storageManager: StorageManager;
  protected decoder: JavaScriptDecoder;
  protected tempTestDirectory: string;
  protected executionInformationIntegrator: ExecutionInformationIntegrator;

  private workers: number;
  private processes: ChildProcess[];
  private currentProcessIndex: number;

  constructor(
    storageManager: StorageManager,
    decoder: JavaScriptDecoder,
    executionInformationIntergrator: ExecutionInformationIntegrator,
    temporaryTestDirectory: string
  ) {
    JavaScriptRunner.LOGGER = getLogger(JavaScriptRunner.name);
    this.storageManager = storageManager;
    this.decoder = decoder;
    this.executionInformationIntegrator = executionInformationIntergrator;
    this.tempTestDirectory = temporaryTestDirectory;

    this.processes = [];
    this.workers = 2;
    this.currentProcessIndex = 0;
    for (let index = 0; index < this.workers; index++) {
      // eslint-disable-next-line unicorn/prefer-module
      this.processes.push(fork(path.join(__dirname, "TestExecutor.js")));
    }
  }

  async run(paths: string[]): Promise<Omit<DoneMessage, "message">> {
    paths = paths.map((p) => path.resolve(p));
    // const childProcess = fork(path.join(__dirname, 'TestExecutor.js'))

    const childProcess = this.processes[this.currentProcessIndex];

    childProcess.send({ message: "run", paths: paths });

    return await new Promise((resolve) => {
      childProcess.on("message", (data: Message) => {
        if (typeof data !== "object") {
          throw new TypeError("Invalid data received from child process");
        }
        if (data.message === "done") {
          // childProcess.kill()
          resolve(data);
        }
      });
    });
  }

  async runOld(paths: string[]): Promise<Omit<DoneMessage, "message">> {
    paths = paths.map((p) => path.resolve(p));

    const argv: Mocha.MochaOptions = <Mocha.MochaOptions>(<unknown>{
      reporter: SilentMochaReporter,
      // diff: false,
      // checkLeaks: false,
      // slow: 75,
      // timeout: 100,

      // watch: false,
      // parallel: false,
      // recursive: false,
      // sort: false,
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
      // eslint-disable-next-line unicorn/prefer-module
      delete require.cache[_path];
      mocha.addFile(_path);
    }

    let runner: Runner;

    // Finally, run mocha.
    await new Promise((resolve) => {
      runner = mocha.run((failures) => resolve(failures));
    });

    const suites: Suite[] = runner.suite.suites.map((suite) => {
      return {
        tests: suite.tests.map((test) => {
          let status: JavaScriptExecutionStatus;
          if (test.isPassed()) {
            status = JavaScriptExecutionStatus.PASSED;
          } else if (test.timedOut) {
            status = JavaScriptExecutionStatus.TIMED_OUT;
          } else {
            status = JavaScriptExecutionStatus.FAILED;
          }
          return {
            status: status,
            exception:
              status === JavaScriptExecutionStatus.FAILED
                ? test.err.message
                : undefined,
            duration: test.duration,
          };
        }),
      };
    });

    // Retrieve execution traces
    const instrumentationData = <InstrumentationData>(
      cloneDeep(
        (<{ __coverage__: InstrumentationData }>(<unknown>global)).__coverage__
      )
    );
    const metaData = <MetaData>(
      cloneDeep((<{ __meta__: MetaData }>(<unknown>global)).__meta__)
    );

    const result: DoneMessage = {
      message: "done",
      suites: suites,
      stats: runner.stats,
      instrumentationData: instrumentationData,
      metaData: metaData,
    };

    mocha.dispose();

    return result;
  }

  async execute(
    subject: JavaScriptSubject,
    testCase: JavaScriptTestCase
  ): Promise<ExecutionResult> {
    JavaScriptRunner.LOGGER.silly("Executing test case");

    const decodedTestCase = this.decoder.decode(testCase, subject.name, false);

    const testPath = this.storageManager.store(
      [this.tempTestDirectory],
      "tempTest.spec.js",
      decodedTestCase,
      true
    );

    const last = Date.now();
    const { suites, stats, instrumentationData, metaData } = await this.run([
      testPath,
    ]);
    console.log("time", Date.now() - last);
    const test = suites[0].tests[0]; // only one test in this case

    // If one of the executions failed, log it
    this.executionInformationIntegrator.process(testCase, test, stats);

    const traces: Datapoint[] = [];

    for (const key of Object.keys(instrumentationData)) {
      for (const functionKey of Object.keys(instrumentationData[key].fnMap)) {
        const function_ = instrumentationData[key].fnMap[functionKey];
        const hits = instrumentationData[key].f[functionKey];

        traces.push({
          id: function_.decl.id,
          type: "function",
          path: key,
          location: function_.decl,

          hits: hits,
        });
      }

      for (const statementKey of Object.keys(
        instrumentationData[key].statementMap
      )) {
        const statement = instrumentationData[key].statementMap[statementKey];
        const hits = instrumentationData[key].s[statementKey];

        traces.push({
          id: statement.id,
          type: "statement",
          path: key,
          location: statement,

          hits: hits,
        });
      }

      for (const branchKey of Object.keys(instrumentationData[key].branchMap)) {
        const branch = instrumentationData[key].branchMap[branchKey];
        const hits = <number[]>instrumentationData[key].b[branchKey];
        let meta;

        if (metaData !== undefined && key in metaData) {
          const metaPath = metaData[key];
          const metaMeta = metaPath.meta;
          meta = metaMeta[branchKey.toString()];
        }

        traces.push({
          id: branch.locations[0].id,
          path: key,
          type: "branch",
          location: branch.locations[0],

          hits: hits[0],

          condition_ast: meta?.condition_ast,
          condition: meta?.condition,
          variables: meta?.variables,
        });

        if (branch.locations.length > 2) {
          // switch case
          for (const [index, location] of branch.locations.entries()) {
            if (index === 0) {
              continue;
            }
            traces.push({
              id: location.id,
              path: key,
              type: "branch",
              location: branch.locations[index],

              hits: hits[index],

              condition_ast: meta?.condition_ast,
              condition: meta?.condition,
              variables: meta?.variables,
            });
          }
        } else if (branch.locations.length === 2) {
          // normal branch
          // or small switch
          traces.push({
            id: branch.locations[1].id,
            path: key,
            type: "branch",
            location: branch.locations[1],

            hits: hits[1],

            condition_ast: meta?.condition_ast,
            condition: meta?.condition,
            variables: meta?.variables,
          });
        } else if (
          branch.locations.length === 1 &&
          branch.type === "default-arg"
        ) {
          // this is the default-arg branch it only has one location
          traces.push({
            id: branch.locations[0].id,
            path: key,
            type: "branch",
            location: branch.locations[0],

            hits: hits[0] ? 0 : 1,

            condition_ast: meta?.condition_ast,
            condition: meta?.condition,
            variables: meta?.variables,
          });
        } else {
          throw new Error(
            `Invalid number of locations for branch type: ${branch.type}`
          );
        }
      }
    }

    // Retrieve execution information
    const executionResult = new JavaScriptExecutionResult(
      test.status,
      traces,
      test.duration,
      test.exception
    );

    // Remove test file
    this.storageManager.deleteTemporary(
      [this.tempTestDirectory],
      "tempTest.spec.js"
    );

    return executionResult;
  }
}
