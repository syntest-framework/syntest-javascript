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
import { expect } from "chai";
import { BranchDistance } from "../../lib/criterion/BranchDistance";

describe("BranchDistance string functions", () => {
  // at
  // TODO
  //   it("'abc'.at(0) === 'a' true", () => {
  //     const condition = "'abc'.at(0) === 'a'";
  //     const variables = {};
  //     const trueOrFalse = true;

  //     const calculator = new BranchDistance(
  //       "0123456789abcdefghijklmnopqrstuvxyz"
  //     );

  //     expect(
  //       calculator.calculate("", condition, variables, trueOrFalse)
  //     ).to.equal(0);
  //   });

  // TODO
  // charAt // same as at?
  // charCodeAt
  // codePointAt
  // concat
  // endsWith
  it("'abc'.endsWith('bc') true", () => {
    const condition = "'abc'.endsWith('bc')";
    const variables = {};
    const trueOrFalse = true;

    const calculator = new BranchDistance(
      "0123456789abcdefghijklmnopqrstuvxyz"
    );

    expect(
      calculator.calculate("", condition, variables, trueOrFalse)
    ).to.equal(0);
  });

  it("'abc'.endsWith('bc') false", () => {
    const condition = "'abc'.endsWith('bc')";
    const variables = {};
    const trueOrFalse = false;

    const calculator = new BranchDistance(
      "0123456789abcdefghijklmnopqrstuvxyz"
    );

    expect(
      calculator.calculate("", condition, variables, trueOrFalse)
    ).to.equal(0.5);
  });

  it("'abc'.endsWith('z') true", () => {
    const condition = "'abc'.endsWith('z')";
    const variables = {};
    const trueOrFalse = true;

    const calculator = new BranchDistance(
      "0123456789abcdefghijklmnopqrstuvxyz"
    );

    expect(
      calculator.calculate("", condition, variables, trueOrFalse)
    ).to.closeTo(0.6666, 0.001); // two changes of 1 diff?
  });

  it("'abc'.endsWith('z') false", () => {
    const condition = "'abc'.endsWith('z')";
    const variables = {};
    const trueOrFalse = false;

    const calculator = new BranchDistance(
      "0123456789abcdefghijklmnopqrstuvxyz"
    );

    expect(
      calculator.calculate("", condition, variables, trueOrFalse)
    ).to.equal(0); // two changes of 1 diff?
  });

  // TODO
  // fromCharCode
  // fromCodePoint
  // includes
  // indexOf
  // isWellFormed
  // lastIndexOf
  // localeCompare
  // match
  // matchAll
  // normalize
  // padEnd
  // padStart
  // raw
  // repeat
  // replace
  // replaceAll
  // search
  // slice
  // split
  // startsWith
  // substring
  // toLocaleLowerCase
  // toLocaleUpperCase
  // toLowerCase
  // toString
  // toUpperCase
  // toWellFormed
  // trim
  // trimEnd
  // trimStart
  // valueOf
});
