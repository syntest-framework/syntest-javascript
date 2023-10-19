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
import { TargetType } from "@syntest/analysis";
import * as chai from "chai";

import { AbstractSyntaxTreeFactory } from "../../lib/ast/AbstractSyntaxTreeFactory";
import { ExportVisitor } from "../../lib/target/export/ExportVisitor";
import {
  ClassTarget,
  MethodTarget,
  ObjectFunctionTarget,
  ObjectTarget,
  SubTarget,
} from "../../lib/target/Target";
import { TargetVisitor } from "../../lib/target/TargetVisitor";

const expect = chai.expect;

function targetHelper(source: string) {
  const generator = new AbstractSyntaxTreeFactory();
  const ast = generator.convert("", source);

  const exportVisitor = new ExportVisitor("", true);
  traverse(ast, exportVisitor);
  const exports = exportVisitor.exports;

  const visitor = new TargetVisitor("", true, exports);
  traverse(ast, visitor);

  return visitor.subTargets;
}
// function checkFunction(
//   target: SubTarget,
//   name: string,
//   exported: boolean,
//   isAsync: boolean
// ): void {
//   expect(target.type).to.equal(TargetType.FUNCTION);

//   const functionTarget = <FunctionTarget>target;

//   expect(functionTarget.name).to.equal(name);
//   expect(functionTarget.exported).to.equal(exported);
//   expect(functionTarget.isAsync).to.equal(isAsync);
// }

function checkObject(target: SubTarget, name: string, exported: boolean): void {
  expect(target.type).to.equal(TargetType.OBJECT);

  const objectTarget = <ObjectTarget>target;

  expect(objectTarget.name).to.equal(name);
  expect(objectTarget.exported).to.equal(exported);
}

function checkObjectFunction(
  target: SubTarget,
  name: string,
  objectId: string,
  isAsync: boolean
): void {
  expect(target.type).to.equal(TargetType.OBJECT_FUNCTION);

  const functionTarget = <ObjectFunctionTarget>target;

  expect(functionTarget.name).to.equal(name);
  expect(functionTarget.objectId).to.equal(objectId);
  expect(functionTarget.isAsync).to.equal(isAsync);
}

function checkClass(target: SubTarget, name: string, exported: boolean): void {
  expect(target.type).to.equal(TargetType.CLASS);

  const classTarget = <ClassTarget>target;

  expect(classTarget.name).to.equal(name);
  expect(classTarget.exported).to.equal(exported);
}

function checkClassMethod(
  target: SubTarget,
  name: string,
  classId: string,
  methodType: string,
  visibility: string,
  isStatic: boolean,
  isAsync: boolean
): void {
  expect(target.type).to.equal(TargetType.METHOD);

  const methodTarget = <MethodTarget>target;

  expect(methodTarget.name).to.equal(name);
  expect(methodTarget.classId).to.equal(classId);
  expect(methodTarget.methodType).to.equal(methodType);
  expect(methodTarget.visibility).to.equal(visibility);
  expect(methodTarget.isStatic).to.equal(isStatic);
  expect(methodTarget.isAsync).to.equal(isAsync);
}

describe("Prototyped TargetVisitor test", () => {
  it("Test 1", () => {
    const source = `
        const x = {}
        x.prototype.y = function () {}
        x.prototype.z = function () {}

        module.exports = x
        `;

    const targets = targetHelper(source);

    expect(targets.length).to.equal(3);

    checkClass(targets[0], "x", true);
    checkClassMethod(
      targets[1],
      "y",
      targets[0].id,
      "method",
      "public",
      false,
      false
    );
    checkClassMethod(
      targets[2],
      "z",
      targets[0].id,
      "method",
      "public",
      false,
      false
    );
  });

  it("Test 2", () => {
    const source = `
        const x = {}
        const y = {}
        y.f = function () {}
        x.prototype = y

        module.exports = x
        `;

    const targets = targetHelper(source);

    expect(targets.length).to.equal(4);

    checkClass(targets[0], "x", true);
    checkObject(targets[1], "y", false);

    checkObjectFunction(targets[2], "f", targets[1].id, false);
    checkClassMethod(
      targets[3],
      "f",
      targets[0].id,
      "method",
      "public",
      false,
      false
    );
  });
});
