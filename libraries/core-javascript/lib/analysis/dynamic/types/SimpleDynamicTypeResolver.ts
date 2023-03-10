/*
 * Copyright 2020-2023 Delft University of Technology and SynTest contributors
 *
 * This file is part of SynTest Framework - SynTest JavaScript.
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
import { JavaScriptTestCase } from "../../../testcase/JavaScriptTestCase";
import { Statement } from "../../../testcase/statements/Statement";
import { DynamicTypeResolver } from "./DynamicTypeResolver";

export class SimpleDynamicTypeResolver extends DynamicTypeResolver {
  processTestResult(
    testCase: JavaScriptTestCase,
    testResult: Mocha.Test
  ): void {
    if (!testResult.err || !testResult.err.message) {
      return;
    }

    const queue: Statement[] = [testCase.root];

    while (queue.length) {
      const root = queue.pop();
      const children = root.getChildren();

      for (const child of children) {
        if (testResult.err.message.includes(child.identifierDescription.name)) {
          // console.log(child.identifierDescription.typeProbabilityMap)
          // console.log(testResult.err)
          child.identifierDescription.typeProbabilityMap.addExecutionScore(
            child.type,
            -1
          );
        }
        queue.push(child);
      }
    }
  }
}
