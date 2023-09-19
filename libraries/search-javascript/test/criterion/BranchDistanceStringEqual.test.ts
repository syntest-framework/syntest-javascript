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
import { BranchDistanceVisitor } from "../../lib/criterion/BranchDistanceVisitor";

describe("Edit distance a == b test", () => {
  // number
  it("'abc' == 'abc'", () => {
    const a = "abc";
    const b = "abc";
    const visitor = new BranchDistanceVisitor(
      false,
      "0123456789abcdefghijklmnopqrstuvxyz",
      {},
      true
    );
    expect(visitor._realCodedEditDistance(a, b)).to.equal(0);
  });

  it("'abc' == 'ab'", () => {
    const a = "abc";
    const b = "ab";
    const visitor = new BranchDistanceVisitor(
      false,
      "0123456789abcdefghijklmnopqrstuvxyz",
      {},
      true
    );
    expect(visitor._realCodedEditDistance(a, b)).to.equal(1);
  });

  it("'abcd' == 'ab'", () => {
    const a = "abcd";
    const b = "ab";
    const visitor = new BranchDistanceVisitor(
      false,
      "0123456789abcdefghijklmnopqrstuvxyz",
      {},
      true
    );
    expect(visitor._realCodedEditDistance(a, b)).to.equal(2);
  });

  it("'abc' == 'abb'", () => {
    const a = "abc";
    const b = "abb";
    const visitor = new BranchDistanceVisitor(
      false,
      "0123456789abcdefghijklmnopqrstuvxyz",
      {},
      true
    );
    const oracle = visitor._normalize(1);
    expect(visitor._realCodedEditDistance(a, b)).to.equal(oracle);
  });

  it("'abc' == 'c'", () => {
    const a = "abc";
    const b = "8";
    const visitor = new BranchDistanceVisitor(
      false,
      "0123456789abcdefghijklmnopqrstuvxyz",
      {},
      true
    );
    const oracle = 2 + visitor._normalize(2);
    expect(visitor._realCodedEditDistance(a, b)).to.equal(oracle);
  });
});
