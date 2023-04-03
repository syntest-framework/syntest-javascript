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
import { traverse } from "@babel/core";
import * as chai from "chai";

import { AbstractSyntaxTreeFactory } from "../../lib/ast/AbstractSyntaxTreeFactory";
import { ControlFlowGraphVisitor } from "../../lib/cfg/ControlFlowGraphVisitor";

const expect = chai.expect;

function cfgHelper(source: string) {
  const generator = new AbstractSyntaxTreeFactory();
  const ast = generator.convert(source);

  const visitor = new ControlFlowGraphVisitor("");
  traverse(ast, visitor);

  return visitor.cfg;
}

describe("ControlFlowGraphVisitor test", () => {
  it("simple statements", () => {
    const source = `
        const x = 0
        const y = 1
        const z = 2
      `;

    const cfg = cfgHelper(source);

    expect(cfg.graph.nodes).to.have.lengthOf(6);
    expect(cfg.graph.edges).to.have.lengthOf(4);

    expect(cfg.graph.getIncomingEdges("ENTRY")).to.have.lengthOf(0);
    expect(cfg.graph.getOutgoingEdges("ENTRY")).to.have.lengthOf(1);

    const constX = cfg.graph.getOutgoingEdges("ENTRY")[0].target;

    expect(cfg.graph.getIncomingEdges(constX)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(constX)).to.have.lengthOf(1);

    const constY = cfg.graph.getOutgoingEdges(constX)[0].target;

    expect(cfg.graph.getIncomingEdges(constY)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(constY)).to.have.lengthOf(1);

    const constZ = cfg.graph.getOutgoingEdges(constY)[0].target;

    expect(cfg.graph.getIncomingEdges(constZ)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(constZ)).to.have.lengthOf(1);

    const exit = cfg.graph.getOutgoingEdges(constZ)[0].target;

    expect(exit).to.equal("SUCCESS_EXIT");
    expect(cfg.graph.getIncomingEdges(exit)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(exit)).to.have.lengthOf(0);
  });

  it("if statements", () => {
    const source = `
        if (true) {
          const x = 0
        }
        const y = 1
      `;

    const cfg = cfgHelper(source);
    expect(cfg.graph.nodes).to.have.lengthOf(7);
    expect(cfg.graph.edges).to.have.lengthOf(6);

    expect(cfg.graph.getIncomingEdges("ENTRY")).to.have.lengthOf(0);
    expect(cfg.graph.getOutgoingEdges("ENTRY")).to.have.lengthOf(1);

    const ifStatement = cfg.graph.getOutgoingEdges("ENTRY")[0].target;

    expect(cfg.graph.getIncomingEdges(ifStatement)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(ifStatement)).to.have.lengthOf(2);

    // const x = 0
    const trueBranch = cfg.graph.getOutgoingEdges(ifStatement)[0].target;

    expect(cfg.graph.getIncomingEdges(trueBranch)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(trueBranch)).to.have.lengthOf(1);

    const falseBranch = cfg.graph.getOutgoingEdges(ifStatement)[1].target;

    expect(cfg.graph.getIncomingEdges(falseBranch)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(falseBranch)).to.have.lengthOf(1);

    const constYtrue = cfg.graph.getOutgoingEdges(trueBranch)[0].target;
    const constYfalse = cfg.graph.getOutgoingEdges(falseBranch)[0].target;

    expect(constYtrue).to.equal(constYfalse);

    expect(cfg.graph.getIncomingEdges(constYfalse)).to.have.lengthOf(2);
    expect(cfg.graph.getOutgoingEdges(constYfalse)).to.have.lengthOf(1);

    const exit = cfg.graph.getOutgoingEdges(constYfalse)[0].target;

    expect(exit).to.equal("SUCCESS_EXIT");
    expect(cfg.graph.getIncomingEdges(exit)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(exit)).to.have.lengthOf(0);
  });

  it("if block statements", () => {
    const source = `
        if (true) {
          const x = 0
          const z = 1
        }
        const y = 1
      `;

    const cfg = cfgHelper(source);
    expect(cfg.graph.nodes).to.have.lengthOf(8);
    expect(cfg.graph.edges).to.have.lengthOf(7);

    expect(cfg.graph.getIncomingEdges("ENTRY")).to.have.lengthOf(0);
    expect(cfg.graph.getOutgoingEdges("ENTRY")).to.have.lengthOf(1);

    const ifStatement = cfg.graph.getOutgoingEdges("ENTRY")[0].target;

    expect(cfg.graph.getIncomingEdges(ifStatement)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(ifStatement)).to.have.lengthOf(2);

    // const x = 0
    const trueBranch = cfg.graph.getOutgoingEdges(ifStatement)[0].target;

    expect(cfg.graph.getIncomingEdges(trueBranch)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(trueBranch)).to.have.lengthOf(1);

    // const z = 1
    const zConst = cfg.graph.getOutgoingEdges(trueBranch)[0].target;

    expect(cfg.graph.getIncomingEdges(zConst)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(zConst)).to.have.lengthOf(1);

    const falseBranch = cfg.graph.getOutgoingEdges(ifStatement)[1].target;

    expect(cfg.graph.getIncomingEdges(falseBranch)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(falseBranch)).to.have.lengthOf(1);

    const constYtrue = cfg.graph.getOutgoingEdges(zConst)[0].target;
    const constYfalse = cfg.graph.getOutgoingEdges(falseBranch)[0].target;

    expect(constYtrue).to.equal(constYfalse);

    expect(cfg.graph.getIncomingEdges(constYfalse)).to.have.lengthOf(2);
    expect(cfg.graph.getOutgoingEdges(constYfalse)).to.have.lengthOf(1);

    const exit = cfg.graph.getOutgoingEdges(constYfalse)[0].target;

    expect(exit).to.equal("SUCCESS_EXIT");
    expect(cfg.graph.getIncomingEdges(exit)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(exit)).to.have.lengthOf(0);
  });

  it("do while statements", () => {
    const source = `
        do {
          const x = 0
        } while (true)
        const y = 1
      `;

    const cfg = cfgHelper(source);

    expect(cfg.graph.nodes).to.have.lengthOf(6);
    expect(cfg.graph.edges).to.have.lengthOf(5);

    expect(cfg.graph.getIncomingEdges("ENTRY")).to.have.lengthOf(0);
    expect(cfg.graph.getOutgoingEdges("ENTRY")).to.have.lengthOf(1);

    const constX = cfg.graph.getOutgoingEdges("ENTRY")[0].target;

    expect(cfg.graph.getIncomingEdges(constX)).to.have.lengthOf(2);
    expect(cfg.graph.getOutgoingEdges(constX)).to.have.lengthOf(1);

    const doWhileStatement = cfg.graph.getOutgoingEdges(constX)[0].target;

    expect(cfg.graph.getIncomingEdges(doWhileStatement)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(doWhileStatement)).to.have.lengthOf(2);

    // true
    const bodyRepeat = cfg.graph.getOutgoingEdges(doWhileStatement)[0].target;
    // false
    const constY = cfg.graph.getOutgoingEdges(doWhileStatement)[1].target;

    expect(constX).to.equal(bodyRepeat);

    const exit = cfg.graph.getOutgoingEdges(constY)[0].target;

    expect(exit).to.equal("SUCCESS_EXIT");
    expect(cfg.graph.getIncomingEdges(exit)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(exit)).to.have.lengthOf(0);
  });

  it("do while statements without block", () => {
    const source = `
        do {

        } while (true)
        const y = 1
      `;

    const cfg = cfgHelper(source);

    expect(cfg.graph.nodes).to.have.lengthOf(6);
    expect(cfg.graph.edges).to.have.lengthOf(5);

    expect(cfg.graph.getIncomingEdges("ENTRY")).to.have.lengthOf(0);
    expect(cfg.graph.getOutgoingEdges("ENTRY")).to.have.lengthOf(1);

    const constX = cfg.graph.getOutgoingEdges("ENTRY")[0].target;

    expect(cfg.graph.getIncomingEdges(constX)).to.have.lengthOf(2);
    expect(cfg.graph.getOutgoingEdges(constX)).to.have.lengthOf(1);

    const doWhileStatement = cfg.graph.getOutgoingEdges(constX)[0].target;

    expect(cfg.graph.getIncomingEdges(doWhileStatement)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(doWhileStatement)).to.have.lengthOf(2);

    // true
    const bodyRepeat = cfg.graph.getOutgoingEdges(doWhileStatement)[0].target;
    // false
    const constY = cfg.graph.getOutgoingEdges(doWhileStatement)[1].target;

    expect(constX).to.equal(bodyRepeat);

    const exit = cfg.graph.getOutgoingEdges(constY)[0].target;

    expect(exit).to.equal("SUCCESS_EXIT");
    expect(cfg.graph.getIncomingEdges(exit)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(exit)).to.have.lengthOf(0);
  });

  it("do while statements without after", () => {
    const source = `
        do {
          const x = 0
        } while (true)
        
      `;

    const cfg = cfgHelper(source);

    expect(cfg.graph.nodes).to.have.lengthOf(5);
    expect(cfg.graph.edges).to.have.lengthOf(4);

    expect(cfg.graph.getIncomingEdges("ENTRY")).to.have.lengthOf(0);
    expect(cfg.graph.getOutgoingEdges("ENTRY")).to.have.lengthOf(1);

    const constX = cfg.graph.getOutgoingEdges("ENTRY")[0].target;

    expect(cfg.graph.getIncomingEdges(constX)).to.have.lengthOf(2);
    expect(cfg.graph.getOutgoingEdges(constX)).to.have.lengthOf(1);

    const doWhileStatement = cfg.graph.getOutgoingEdges(constX)[0].target;

    expect(cfg.graph.getIncomingEdges(doWhileStatement)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(doWhileStatement)).to.have.lengthOf(2);

    // true
    const bodyRepeat = cfg.graph.getOutgoingEdges(doWhileStatement)[0].target;
    // false
    const exit = cfg.graph.getOutgoingEdges(doWhileStatement)[1].target;

    expect(constX).to.equal(bodyRepeat);

    expect(exit).to.equal("SUCCESS_EXIT");
    expect(cfg.graph.getIncomingEdges(exit)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(exit)).to.have.lengthOf(0);
  });

  it("while statements", () => {
    const source = `
        while (true) {
          const x = 0
        }
        const y = 1
      `;

    const cfg = cfgHelper(source);
    expect(cfg.graph.nodes).to.have.lengthOf(6);
    expect(cfg.graph.edges).to.have.lengthOf(5);

    expect(cfg.graph.getIncomingEdges("ENTRY")).to.have.lengthOf(0);
    expect(cfg.graph.getOutgoingEdges("ENTRY")).to.have.lengthOf(1);

    const whileStatement = cfg.graph.getOutgoingEdges("ENTRY")[0].target;

    expect(cfg.graph.getIncomingEdges(whileStatement)).to.have.lengthOf(2);
    expect(cfg.graph.getOutgoingEdges(whileStatement)).to.have.lengthOf(2);

    // true
    const constX = cfg.graph.getOutgoingEdges(whileStatement)[0].target;

    expect(cfg.graph.getIncomingEdges(constX)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(constX)).to.have.lengthOf(1);

    const backEdge = cfg.graph.getOutgoingEdges(constX)[0].target;

    expect(whileStatement).to.equal(backEdge);

    // false
    const constY = cfg.graph.getOutgoingEdges(whileStatement)[1].target;

    expect(cfg.graph.getIncomingEdges(constY)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(constY)).to.have.lengthOf(1);

    const exit = cfg.graph.getOutgoingEdges(constY)[0].target;

    expect(exit).to.equal("SUCCESS_EXIT");
    expect(cfg.graph.getIncomingEdges(exit)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(exit)).to.have.lengthOf(0);
  });

  it("while statements no block", () => {
    const source = `
        while (true) {

        }
        const y = 1
      `;

    const cfg = cfgHelper(source);
    expect(cfg.graph.nodes).to.have.lengthOf(6);
    expect(cfg.graph.edges).to.have.lengthOf(5);

    expect(cfg.graph.getIncomingEdges("ENTRY")).to.have.lengthOf(0);
    expect(cfg.graph.getOutgoingEdges("ENTRY")).to.have.lengthOf(1);

    const whileStatement = cfg.graph.getOutgoingEdges("ENTRY")[0].target;

    expect(cfg.graph.getIncomingEdges(whileStatement)).to.have.lengthOf(2);
    expect(cfg.graph.getOutgoingEdges(whileStatement)).to.have.lengthOf(2);

    // true
    const constX = cfg.graph.getOutgoingEdges(whileStatement)[0].target;

    expect(cfg.graph.getIncomingEdges(constX)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(constX)).to.have.lengthOf(1);

    const backEdge = cfg.graph.getOutgoingEdges(constX)[0].target;

    expect(whileStatement).to.equal(backEdge);

    // false
    const constY = cfg.graph.getOutgoingEdges(whileStatement)[1].target;

    expect(cfg.graph.getIncomingEdges(constY)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(constY)).to.have.lengthOf(1);

    const exit = cfg.graph.getOutgoingEdges(constY)[0].target;

    expect(exit).to.equal("SUCCESS_EXIT");
    expect(cfg.graph.getIncomingEdges(exit)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(exit)).to.have.lengthOf(0);
  });

  it("for i loop", () => {
    const source = `
        for (let i = 0; i < 10; i++) {
          const x = 1
        }
        const y = 1
      `;

    const cfg = cfgHelper(source);
    expect(cfg.graph.nodes).to.have.lengthOf(8);
    expect(cfg.graph.edges).to.have.lengthOf(7);

    expect(cfg.graph.getIncomingEdges("ENTRY")).to.have.lengthOf(0);
    expect(cfg.graph.getOutgoingEdges("ENTRY")).to.have.lengthOf(1);

    const initExpression = cfg.graph.getOutgoingEdges("ENTRY")[0].target;

    expect(cfg.graph.getIncomingEdges(initExpression)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(initExpression)).to.have.lengthOf(1);

    const testExpression = cfg.graph.getOutgoingEdges(initExpression)[0].target;

    expect(cfg.graph.getIncomingEdges(testExpression)).to.have.lengthOf(2);
    expect(cfg.graph.getOutgoingEdges(testExpression)).to.have.lengthOf(2);

    // true
    const constX = cfg.graph.getOutgoingEdges(testExpression)[0].target;

    expect(cfg.graph.getIncomingEdges(constX)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(constX)).to.have.lengthOf(1);

    const updateExpression = cfg.graph.getOutgoingEdges(constX)[0].target;

    expect(cfg.graph.getIncomingEdges(updateExpression)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(updateExpression)).to.have.lengthOf(1);

    const backEdge = cfg.graph.getOutgoingEdges(updateExpression)[0].target;

    expect(testExpression).to.equal(backEdge);

    // false
    const constY = cfg.graph.getOutgoingEdges(testExpression)[1].target;

    expect(cfg.graph.getIncomingEdges(constY)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(constY)).to.have.lengthOf(1);

    const exit = cfg.graph.getOutgoingEdges(constY)[0].target;

    expect(exit).to.equal("SUCCESS_EXIT");
    expect(cfg.graph.getIncomingEdges(exit)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(exit)).to.have.lengthOf(0);
  });

  it("for i loop no block", () => {
    const source = `
        for (let i = 0; i < 10; i++) {

        }
        const y = 1
      `;

    const cfg = cfgHelper(source);
    expect(cfg.graph.nodes).to.have.lengthOf(8);
    expect(cfg.graph.edges).to.have.lengthOf(7);

    expect(cfg.graph.getIncomingEdges("ENTRY")).to.have.lengthOf(0);
    expect(cfg.graph.getOutgoingEdges("ENTRY")).to.have.lengthOf(1);

    const initExpression = cfg.graph.getOutgoingEdges("ENTRY")[0].target;

    expect(cfg.graph.getIncomingEdges(initExpression)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(initExpression)).to.have.lengthOf(1);

    const testExpression = cfg.graph.getOutgoingEdges(initExpression)[0].target;

    expect(cfg.graph.getIncomingEdges(testExpression)).to.have.lengthOf(2);
    expect(cfg.graph.getOutgoingEdges(testExpression)).to.have.lengthOf(2);

    // true
    const constX = cfg.graph.getOutgoingEdges(testExpression)[0].target;

    expect(cfg.graph.getIncomingEdges(constX)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(constX)).to.have.lengthOf(1);

    const updateExpression = cfg.graph.getOutgoingEdges(constX)[0].target;

    expect(cfg.graph.getIncomingEdges(updateExpression)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(updateExpression)).to.have.lengthOf(1);

    const backEdge = cfg.graph.getOutgoingEdges(updateExpression)[0].target;

    expect(testExpression).to.equal(backEdge);

    // false
    const constY = cfg.graph.getOutgoingEdges(testExpression)[1].target;

    expect(cfg.graph.getIncomingEdges(constY)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(constY)).to.have.lengthOf(1);

    const exit = cfg.graph.getOutgoingEdges(constY)[0].target;

    expect(exit).to.equal("SUCCESS_EXIT");
    expect(cfg.graph.getIncomingEdges(exit)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(exit)).to.have.lengthOf(0);
  });

  it("for in loop", () => {
    const source = `
        for (let i in a) {
          const x = 1
        }
        const y = 1
      `;

    const cfg = cfgHelper(source);
    expect(cfg.graph.nodes).to.have.lengthOf(7);
    expect(cfg.graph.edges).to.have.lengthOf(6);

    expect(cfg.graph.getIncomingEdges("ENTRY")).to.have.lengthOf(0);
    expect(cfg.graph.getOutgoingEdges("ENTRY")).to.have.lengthOf(1);

    const initExpression = cfg.graph.getOutgoingEdges("ENTRY")[0].target;

    expect(cfg.graph.getIncomingEdges(initExpression)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(initExpression)).to.have.lengthOf(1);

    const testExpression = cfg.graph.getOutgoingEdges(initExpression)[0].target;

    expect(cfg.graph.getIncomingEdges(testExpression)).to.have.lengthOf(2);
    expect(cfg.graph.getOutgoingEdges(testExpression)).to.have.lengthOf(2);

    // true
    const constX = cfg.graph.getOutgoingEdges(testExpression)[0].target;

    expect(cfg.graph.getIncomingEdges(constX)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(constX)).to.have.lengthOf(1);

    const backEdge = cfg.graph.getOutgoingEdges(constX)[0].target;

    expect(testExpression).to.equal(backEdge);

    // false
    const constY = cfg.graph.getOutgoingEdges(testExpression)[1].target;

    expect(cfg.graph.getIncomingEdges(constY)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(constY)).to.have.lengthOf(1);

    const exit = cfg.graph.getOutgoingEdges(constY)[0].target;

    expect(exit).to.equal("SUCCESS_EXIT");
    expect(cfg.graph.getIncomingEdges(exit)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(exit)).to.have.lengthOf(0);
  });

  it("for in loop no block", () => {
    const source = `
        for (let i in a) {

        }
        const y = 1
      `;

    const cfg = cfgHelper(source);
    expect(cfg.graph.nodes).to.have.lengthOf(7);
    expect(cfg.graph.edges).to.have.lengthOf(6);

    expect(cfg.graph.getIncomingEdges("ENTRY")).to.have.lengthOf(0);
    expect(cfg.graph.getOutgoingEdges("ENTRY")).to.have.lengthOf(1);

    const initExpression = cfg.graph.getOutgoingEdges("ENTRY")[0].target;

    expect(cfg.graph.getIncomingEdges(initExpression)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(initExpression)).to.have.lengthOf(1);

    const testExpression = cfg.graph.getOutgoingEdges(initExpression)[0].target;

    expect(cfg.graph.getIncomingEdges(testExpression)).to.have.lengthOf(2);
    expect(cfg.graph.getOutgoingEdges(testExpression)).to.have.lengthOf(2);

    // true
    const constX = cfg.graph.getOutgoingEdges(testExpression)[0].target;

    expect(cfg.graph.getIncomingEdges(constX)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(constX)).to.have.lengthOf(1);

    const backEdge = cfg.graph.getOutgoingEdges(constX)[0].target;

    expect(testExpression).to.equal(backEdge);

    // false
    const constY = cfg.graph.getOutgoingEdges(testExpression)[1].target;

    expect(cfg.graph.getIncomingEdges(constY)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(constY)).to.have.lengthOf(1);

    const exit = cfg.graph.getOutgoingEdges(constY)[0].target;

    expect(exit).to.equal("SUCCESS_EXIT");
    expect(cfg.graph.getIncomingEdges(exit)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(exit)).to.have.lengthOf(0);
  });

  it("for of loop", () => {
    const source = `
        for (let i of a) {
          const x = 1
        }
        const y = 1
      `;

    const cfg = cfgHelper(source);
    expect(cfg.graph.nodes).to.have.lengthOf(7);
    expect(cfg.graph.edges).to.have.lengthOf(6);

    expect(cfg.graph.getIncomingEdges("ENTRY")).to.have.lengthOf(0);
    expect(cfg.graph.getOutgoingEdges("ENTRY")).to.have.lengthOf(1);

    const initExpression = cfg.graph.getOutgoingEdges("ENTRY")[0].target;

    expect(cfg.graph.getIncomingEdges(initExpression)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(initExpression)).to.have.lengthOf(1);

    const testExpression = cfg.graph.getOutgoingEdges(initExpression)[0].target;

    expect(cfg.graph.getIncomingEdges(testExpression)).to.have.lengthOf(2);
    expect(cfg.graph.getOutgoingEdges(testExpression)).to.have.lengthOf(2);

    // true
    const constX = cfg.graph.getOutgoingEdges(testExpression)[0].target;

    expect(cfg.graph.getIncomingEdges(constX)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(constX)).to.have.lengthOf(1);

    const backEdge = cfg.graph.getOutgoingEdges(constX)[0].target;

    expect(testExpression).to.equal(backEdge);

    // false
    const constY = cfg.graph.getOutgoingEdges(testExpression)[1].target;

    expect(cfg.graph.getIncomingEdges(constY)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(constY)).to.have.lengthOf(1);

    const exit = cfg.graph.getOutgoingEdges(constY)[0].target;

    expect(exit).to.equal("SUCCESS_EXIT");
    expect(cfg.graph.getIncomingEdges(exit)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(exit)).to.have.lengthOf(0);
  });

  it("for of loop no block", () => {
    const source = `
        for (let i of a) {

        }
        const y = 1
      `;

    const cfg = cfgHelper(source);
    expect(cfg.graph.nodes).to.have.lengthOf(7);
    expect(cfg.graph.edges).to.have.lengthOf(6);

    expect(cfg.graph.getIncomingEdges("ENTRY")).to.have.lengthOf(0);
    expect(cfg.graph.getOutgoingEdges("ENTRY")).to.have.lengthOf(1);

    const initExpression = cfg.graph.getOutgoingEdges("ENTRY")[0].target;

    expect(cfg.graph.getIncomingEdges(initExpression)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(initExpression)).to.have.lengthOf(1);

    const testExpression = cfg.graph.getOutgoingEdges(initExpression)[0].target;

    expect(cfg.graph.getIncomingEdges(testExpression)).to.have.lengthOf(2);
    expect(cfg.graph.getOutgoingEdges(testExpression)).to.have.lengthOf(2);

    // true
    const constX = cfg.graph.getOutgoingEdges(testExpression)[0].target;

    expect(cfg.graph.getIncomingEdges(constX)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(constX)).to.have.lengthOf(1);

    const backEdge = cfg.graph.getOutgoingEdges(constX)[0].target;

    expect(testExpression).to.equal(backEdge);

    // false
    const constY = cfg.graph.getOutgoingEdges(testExpression)[1].target;

    expect(cfg.graph.getIncomingEdges(constY)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(constY)).to.have.lengthOf(1);

    const exit = cfg.graph.getOutgoingEdges(constY)[0].target;

    expect(exit).to.equal("SUCCESS_EXIT");
    expect(cfg.graph.getIncomingEdges(exit)).to.have.lengthOf(1);
    expect(cfg.graph.getOutgoingEdges(exit)).to.have.lengthOf(0);
  });
});
