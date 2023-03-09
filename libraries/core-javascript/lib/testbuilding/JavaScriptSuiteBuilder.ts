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

import { Archive } from "@syntest/core";
import { JavaScriptTestCase } from "../testcase/JavaScriptTestCase";
import {
  readdirSync,
  readFileSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import * as path from "path";
import { JavaScriptDecoder } from "./JavaScriptDecoder";
import cloneDeep = require("lodash.clonedeep");

import { Runner } from "mocha";
import { JavaScriptRunner } from "../testcase/execution/JavaScriptRunner";

export class JavaScriptSuiteBuilder {
  private decoder: JavaScriptDecoder;
  private runner: JavaScriptRunner;
  private tempLogDirectory: string;

  constructor(
    decoder: JavaScriptDecoder,
    runner: JavaScriptRunner,
    tempLogDirectory: string
  ) {
    this.decoder = decoder;
    this.runner = runner;
    this.tempLogDirectory = tempLogDirectory;
  }

  /**
   * Removes all files that match the given regex within a certain directory
   * @param dirPath   the directory to clear
   * @param match     the regex to which the files must match
   */
  async clearDirectory(dirPath: string, match = /.*\.(js)/g) {
    const dirContent = await readdirSync(dirPath);

    for (const file of dirContent.filter((el: string) => el.match(match))) {
      await unlinkSync(path.resolve(dirPath, file));
    }
  }

  async createSuite(
    archive: Map<string, JavaScriptTestCase[]>,
    sourceDir: string,
    testDir: string,
    addLogs: boolean,
    compact: boolean
  ): Promise<string[]> {
    const paths: string[] = [];
    // write the test cases with logs to know what to assert
    if (!compact) {
      for (const key of archive.keys()) {
        for (const testCase of archive.get(key)) {
          const testPath = path.join(
            testDir,
            `test${key}${testCase.id}.spec.js`
          );
          paths.push(testPath);
          await writeFileSync(
            testPath,
            this.decoder.decode(testCase, "", addLogs, sourceDir)
          );
        }
      }
    } else {
      for (const key of archive.keys()) {
        const testPath = path.join(testDir, `test-${key}.spec.js`);
        paths.push(testPath);
        await writeFileSync(
          testPath,
          this.decoder.decode(archive.get(key), `${key}`, addLogs, sourceDir)
        );
      }
    }

    return paths;
  }

  async runSuite(paths: string[]) {
    const runner: Runner = await this.runner.run(paths);

    const stats = runner.stats;

    const instrumentationData = cloneDeep(global.__coverage__);

    this.runner.resetInstrumentationData();

    return { stats, instrumentationData };
  }

  async gatherAssertions(testCases: JavaScriptTestCase[]): Promise<void> {
    for (const testCase of testCases) {
      const assertions = new Map<string, string>();
      try {
        // extract the log statements
        const dir = await readdirSync(
          path.join(this.tempLogDirectory, testCase.id)
        );

        for (const file of dir) {
          const assertionValue = await readFileSync(
            path.join(this.tempLogDirectory, testCase.id, file),
            "utf8"
          );
          assertions.set(file, assertionValue);
        }
      } catch (error) {
        continue;
      }

      await this.clearDirectory(
        path.join(this.tempLogDirectory, testCase.id),
        /.*/g
      );
      await rmdirSync(path.join(this.tempLogDirectory, testCase.id));

      testCase.assertions = assertions;
    }
  }

  reduceArchive(
    archive: Archive<JavaScriptTestCase>
  ): Map<string, JavaScriptTestCase[]> {
    const reducedArchive = new Map<string, JavaScriptTestCase[]>();

    for (const objective of archive.getObjectives()) {
      const targetName = objective
        .getSubject()
        .name.split("/")
        .pop()
        .split(".")[0];

      if (!reducedArchive.has(targetName)) {
        reducedArchive.set(targetName, []);
      }

      if (
        reducedArchive
          .get(targetName)
          .includes(archive.getEncoding(objective) as JavaScriptTestCase)
      ) {
        // skip duplicate individuals (i.e. individuals which cover multiple objectives
        continue;
      }

      reducedArchive
        .get(targetName)
        .push(archive.getEncoding(objective) as JavaScriptTestCase);
    }

    return reducedArchive;
  }
}
