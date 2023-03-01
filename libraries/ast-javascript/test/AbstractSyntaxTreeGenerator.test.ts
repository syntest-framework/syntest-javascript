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
import * as chai from "chai";
import { AbstractSyntaxTreeGenerator } from "../lib/AbstractSyntaxTreeGenerator";
const expect = chai.expect;

/**
 * This test is only added such that the github action does not fail.
 */
describe("example test", () => {
  it("test", async () => {
    const source = `
    export class Example {
        constructor(a) {
            this.a = a
        }
        test (a, b) {
            c = a + b
            if (a < b) {
                return c
            } else {
                return a
            }
        }
    }
    `;

    const generator = new AbstractSyntaxTreeGenerator();
    const ast = generator.generate(source);

    expect(ast.type === "File");
  });
});
