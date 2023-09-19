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

import { Decoder } from "@syntest/search";

import { JavaScriptTestCase } from "../testcase/JavaScriptTestCase";
import { Decoding } from "../testcase/statements/Statement";
import { ActionStatement } from "../testcase/statements/action/ActionStatement";
import { ContextBuilder } from "./ContextBuilder";
import { FunctionCall } from "../testcase/statements/action/FunctionCall";
import { ClassActionStatement } from "../testcase/statements/action/ClassActionStatement";

export class JavaScriptDecoder implements Decoder<JavaScriptTestCase, string> {
  private targetRootDirectory: string;

  constructor(targetRootDirectory: string) {
    this.targetRootDirectory = targetRootDirectory;
  }

  decode(
    testCases: JavaScriptTestCase | JavaScriptTestCase[],
    targetName: string,
    gatherAssertionData = false,
    sourceDirectory = "../instrumented"
  ): string {
    if (testCases instanceof JavaScriptTestCase) {
      testCases = [testCases];
    }

    const context = new ContextBuilder(
      this.targetRootDirectory,
      sourceDirectory
    );

    const tests: string[][] = [];

    const function_ = `
function _addAssertion(id) {
  if (!global.__assertion__) {
    global.__assertion__ = {}
  }

  if (!global.__assertion__[id]) {
    global.__assertion__[id] = { assertions: {}, error: undefined }
  }
}
function addAssertion(id, variableName, value) {
  _addAssertion(id);

  global.__assertion__[id].assertions[variableName] = {
    value: '' + value,
    stringified: '' + JSON.stringify(value)
  }
}
function setError(id, error, count) {
  _addAssertion(id);

  global.__assertion__[id].error = {
    error: {
      name: error.name,
      message:error.message,
      stack: error.stack,
    },
    count: count
  }
}
    `;

    let assertionsPresent = false;
    for (const testCase of testCases) {
      if (testCase.assertionData) {
        assertionsPresent = true;
      }
      context.nextTestCase();
      const roots: ActionStatement[] = testCase.roots;

      let decodings: Decoding[] = roots.flatMap((root) => root.decode(context));

      if (decodings.length === 0) {
        throw new Error("No statements in test case");
      }

      const metaCommentBlock = [];

      for (const metaComment of testCase.metaComments) {
        metaCommentBlock.push(`// ${metaComment}`);
      }

      if (metaCommentBlock.length > 0) {
        metaCommentBlock.splice(0, 0, "// Meta information");
        metaCommentBlock.push("");
      }

      const testLines: string[] = [];
      if (gatherAssertionData) {
        testLines.push("let count = 0;", "try {");
      }

      let errorDecoding: Decoding;

      if (testCase.assertionData && testCase.assertionData.error) {
        const index = testCase.assertionData.error.count;

        // TODO does not work
        //  the .to.throw stuff does not work somehow

        // delete statements after
        errorDecoding = decodings[index];
        decodings = decodings.slice(0, index);
      }

      if (decodings.length === 0) {
        throw new Error("No statements in test case after error reduction");
      }

      for (const [index, value] of decodings.entries()) {
        const asString = value.decoded;
        if (testLines.includes(asString)) {
          // skip repeated statements
          continue;
        }

        testLines.push(asString);

        if (gatherAssertionData) {
          // add log per statement
          const variableName = context.getOrCreateVariableName(value.reference);
          testLines.push(`count = ${index + 1};`);

          if (
            value.reference instanceof FunctionCall ||
            value.reference instanceof ClassActionStatement
          ) {
            testLines.push(
              `addAssertion('${testCase.id}', '${variableName}', ${variableName})`
            );
          }
        }
      }

      if (gatherAssertionData) {
        testLines.push(
          `} catch (e) {`,
          `\tsetError('${testCase.id}', e, count)`,
          "}"
        );
      }

      if (testLines.length > 0) {
        testLines.splice(0, 0, "// Test");
        testLines.push(" ");
      }

      const assertions: string[] = this.generateAssertions(testCase);

      if (errorDecoding) {
        assertions.push(
          `await expect((async () => {`,
          `\t${errorDecoding.decoded.split(" = ")[1]}`,
          `})()).to.be.rejectedWith(\`${testCase.assertionData.error.error.message}\`)`
        );
      }

      if (assertions.length > 0) {
        assertions.splice(0, 0, "// Assertions");
      }

      tests.push([...metaCommentBlock, ...testLines, ...assertions]);
    }

    const { imports, requires } = context.getImports(assertionsPresent);

    let beforeEachLines: string[] = [];

    if (requires.length > 0) {
      beforeEachLines = [
        ...requires.map((m) => `\tlet ${m.left};`),
        `\tbeforeEach(() => {`,
        "\t\t// This is a hack to force the require cache to be emptied",
        "\t\t// Without this we would be using the same required object for each test",
        ...requires.map(
          (m) =>
            `\t\tdelete require.cache[${m.right.replace(
              "require",
              "require.resolve"
            )}];`
        ),
        ...requires.map((m) => `\t\t${m.left} = ${m.right}`),
        `\t});`,
        "",
      ];
    }

    const lines = [
      "// Imports",
      ...imports,
      gatherAssertionData ? function_ : "",
      `describe('${targetName}', function() {`,
      ...beforeEachLines,
      ...tests.flatMap((testLines: string[], index) => [
        `\tit('${targetName}', async () => {`,
        ...testLines.map((line) => `\t\t${line}`),
        index === tests.length - 1 ? "\t})" : "\t})\n",
      ]),
      "})",
    ];

    return lines.join("\n");
  }

  generateAssertions(testCase: JavaScriptTestCase): string[] {
    const assertions: string[] = [];
    if (testCase.assertionData) {
      for (const [variableName, assertion] of Object.entries(
        testCase.assertionData.assertions
      )) {
        const original = assertion.value;
        let stringified = assertion.stringified;
        if (original === "undefined") {
          assertions.push(`expect(${variableName}).to.equal(${original})`);
          continue;
        } else if (original === "NaN") {
          assertions.push(`expect(${variableName}).to.be.NaN`);
          continue;
        }

        // TODO dirty hack because json.parse does not allow undefined/NaN
        // TODO undefined/NaN can happen in arrays
        stringified = stringified.replace("undefined", "null");
        stringified = stringified.replace("NaN", "null");

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const value = JSON.parse(stringified);

        if (typeof value === "object" || typeof value === "function") {
          assertions.push(
            `expect(JSON.parse(JSON.stringify(${variableName}))).to.deep.equal(${stringified})`
          );
        } else {
          assertions.push(`expect(${variableName}).to.equal(${stringified})`);
        }
      }
    }

    return assertions;
  }
}
