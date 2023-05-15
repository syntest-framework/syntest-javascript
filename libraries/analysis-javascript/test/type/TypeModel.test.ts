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

import { ElementVisitor } from "../../lib/type/discovery/element/ElementVisitor";
import { RelationVisitor } from "../../lib/type/discovery/relation/RelationVisitor";
import { ObjectVisitor } from "../../lib/type/discovery/object/ObjectVisitor";
import { InferenceTypeModelFactory } from "../../lib/type/resolving/InferenceTypeModelFactory";
import { Identifier } from "../../lib/type/discovery/element/Element";

const expect = chai.expect;

function helper(source: string) {
  const generator = new AbstractSyntaxTreeFactory();
  const ast = generator.convert("", source);

  const elementVisitor = new ElementVisitor("");
  const relationVisitor = new RelationVisitor("");
  const objectVisitor = new ObjectVisitor("");

  traverse(ast, elementVisitor);
  traverse(ast, relationVisitor);
  traverse(ast, objectVisitor);

  const factory = new InferenceTypeModelFactory();

  const typemodel = factory.resolveTypes(
    elementVisitor.elementMap,
    relationVisitor.relationMap,
    objectVisitor.complexTypeMap
  );

  return {
    typemodel: typemodel,
    elements: [...elementVisitor.elementMap.values()],
  };
}

describe("TypeModel test", () => {
  it("", () => {
    const source = `
        function x (a) {
          return a.b
        }
      `;

    const { typemodel, elements } = helper(source);

    const actualElements = <Identifier[]>elements;
    expect(actualElements[0].name).to.equal("x");
    expect(actualElements[1].name).to.equal("a");
    expect(actualElements[2].name).to.equal("a");
    expect(actualElements[3].name).to.equal("b");

    const probabilitiesOfA = typemodel.calculateProbabilitiesForElement(
      false,
      actualElements[2].bindingId
    );

    const discoveredTypeOfA = typemodel.getDiscoveredObjectType(
      [...probabilitiesOfA.keys()].find((x) => x.startsWith(":"))
    );

    expect(discoveredTypeOfA).to.not.throw();
  });
});
