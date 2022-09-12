import {
  Datapoint,
  EncodingRunner,
  ExecutionResult, getUserInterface,
  Properties,
} from "@syntest/framework";
import { JavaScriptTestCase } from "../JavaScriptTestCase";
import { JavaScriptSubject } from "../../search/JavaScriptSubject";
import * as path from "path";
import { JavaScriptExecutionResult, JavaScriptExecutionStatus } from "../../search/JavaScriptExecutionResult";
// import { Runner } from "mocha";
import { JavaScriptSuiteBuilder } from "../../testbuilding/JavaScriptSuiteBuilder";
import * as _ from 'lodash'
// import { SilentMochaReporter } from "./SilentMochaReporter";
import ErrorProcessor from "./ErrorProcessor";
// const Mocha = require('mocha')
// const originalrequire = require("original-require");

export class JavaScriptRunner implements EncodingRunner<JavaScriptTestCase> {
  protected suiteBuilder: JavaScriptSuiteBuilder;
  protected errorProcessor: ErrorProcessor

  constructor(suiteBuilder: JavaScriptSuiteBuilder) {
    this.suiteBuilder = suiteBuilder
    this.errorProcessor = new ErrorProcessor()

    // process.on("uncaughtException", reason => {
    //   throw reason;
    // });
    // process.on("unhandledRejection", reason => {
    //   throw reason;
    // });
  }

  async execute(
    subject: JavaScriptSubject,
    testCase: JavaScriptTestCase
  ): Promise<ExecutionResult> {
    const testPath = path.resolve(path.join(Properties.temp_test_directory, "tempTest.spec.js"))


    const decodedTestCase = this.suiteBuilder.decoder.decode(
      testCase,
      subject.name,
      false
    );
    console.log(decodedTestCase)

    // const func = Function(decodedTestCase)
    // const error = await func() //eval(decodedTestCase)

    const encodedJs = encodeURIComponent(decodedTestCase)
    const dataUri = 'data:text/javascript;charset=utf-8,'
      + encodedJs;
    console.log(dataUri)
    declare module "data:text/javascript;*" {
      export const number: number;
      export function fn(): string;
    }

    const module = await import(dataUri)
    console.log(module)
    const error = await module.default()

    // await Object.getPrototypeOf(async function() {}).constructor(decodedTestCase)();

    // TODO make this running in memory

    // await this.suiteBuilder.writeTestCase(testPath, testCase, subject.name);
    //
    // const argv = {
    //   spec: testPath,
    //   reporter: SilentMochaReporter
    // }
    //
    // const mocha = new Mocha(argv)// require('ts-node/register')
    //
    // require("regenerator-runtime/runtime");
    // require('@babel/register')({
    //   presets: [
    //     "@babel/preset-env"
    //   ]
    // })
    //
    // delete originalrequire.cache[testPath];
    // mocha.addFile(testPath);
    //
    // let runner: Runner = null
    //
    // // Finally, run mocha.
    // await new Promise((resolve) => {
    //   runner = mocha.run((failures) => resolve(failures))
    // })
    //
    // const stats = runner.stats
    //
    // const test = runner.suite.suites[0].tests[0];

    // If one of the executions failed, log it
    if (error === 'timed_out') {
      getUserInterface().error("Test case has timed out!");
    } else if (error) {
      this.errorProcessor.processError(testCase, error)
      getUserInterface().error("Test case has failed!");
    } else {
      this.errorProcessor.processSuccess(testCase)
    }

    // Retrieve execution traces
    const instrumentationData = _.cloneDeep(global.__coverage__)
    const metaData = _.cloneDeep(global.__meta__)

    const traces: Datapoint[] = [];
    for (const key of Object.keys(instrumentationData)) {
      for (const functionKey of Object.keys(instrumentationData[key].fnMap)) {
          const fn = instrumentationData[key].fnMap[functionKey]
          const hits = instrumentationData[key].f[functionKey]

          traces.push({
            id: `f-${fn.line}`,
            type: "function",
            path: key,
            line: fn.line,

            hits: hits,
          })
        }

        for (const statementKey of Object.keys(instrumentationData[key].statementMap)) {
          const statement = instrumentationData[key].statementMap[statementKey]
          const hits = instrumentationData[key].s[statementKey]

          traces.push({
            id: `s-${statement.start.line}`,
            type: "statement",
            path: key,
            line: statement.start.line,

            hits: hits,
          })
        }

        for (const branchKey of Object.keys(instrumentationData[key].branchMap)) {
          const branch = instrumentationData[key].branchMap[branchKey]
          const hits = instrumentationData[key].b[branchKey]

          // if (!hits.find((h) => h !== 0)) {
          //   // if there are no hits the meta object is not created and thus we cannot query it
          //   continue
          // }
          //
          // if (!metaData[key] || !metaData[key].meta || !metaData[key].meta[branchKey]) {
          //   continue
          // }

          const meta = metaData?.[key]?.meta?.[branchKey]

          traces.push({
            id: `b-${branch.line}`,
            path: key,
            type: "branch",
            line: branch.line,

            locationIdx: 0,
            branchType: true,

            hits: hits[0],

            condition_ast: meta?.condition_ast,
            condition: meta?.condition,
            variables: meta?.variables
          });

          traces.push({
            id: `b-${branch.line}`,
            path: key,
            type: "branch",
            line: branch.line,

            locationIdx: 1,
            branchType: false,

            hits: hits[1],

            condition_ast: meta?.condition_ast,
            condition: meta?.condition,
            variables: meta?.variables
          });
        }
    }

    // Retrieve execution information
    // if (
    //   runner.suite.suites.length > 0 &&
    //   runner.suite.suites[0].tests.length > 0
    // ) {
    //   const test = runner.suite.suites[0].tests[0];

      let status: JavaScriptExecutionStatus;
      let exception: string = null;

      if (!error) {
        status = JavaScriptExecutionStatus.PASSED;
      } else if (error === 'timed_out') {
        status = JavaScriptExecutionStatus.TIMED_OUT;
      } else {
        status = JavaScriptExecutionStatus.FAILED;
        exception = error.message;
      }

      const duration = 0//test.duration; // TODO

    const executionResult: JavaScriptExecutionResult = new JavaScriptExecutionResult(
        status,
        traces,
        duration,
        exception
      );
    // } else {
    //   executionResult = new JavaScriptExecutionResult(
    //     JavaScriptExecutionStatus.FAILED,
    //     traces,
    //     stats.duration
    //   );
    // }

    // Reset instrumentation data (no hits)
    this.resetInstrumentationData();

    // Remove test file
    // await this.suiteBuilder.deleteTestCase(testPath);

    // await mocha.dispose()

    return executionResult;
  }

  resetInstrumentationData () {
    for (const key of Object.keys(global.__coverage__)) {
      for (const statementKey of Object.keys(global.__coverage__[key].s)) {
        global.__coverage__[key].s[statementKey] = 0
      }
      for (const functionKey of Object.keys(global.__coverage__[key].f)) {
        global.__coverage__[key].f[functionKey] = 0
      }
      for (const branchKey of Object.keys(global.__coverage__[key].b)) {
        global.__coverage__[key].b[branchKey] = [0, 0]
      }
    }
  }
}
