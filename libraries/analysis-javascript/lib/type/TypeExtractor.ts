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
import { getAllFiles } from "../utils/fileSystem";
import { ComplexTypeVisitor } from "./discovery/complex-type/ComplexTypeVisitor";
import traverse, { visitors } from "@babel/traverse";
import { ElementVisitor } from "./discovery/element/ElementVisitor";
import { RelationVisitor } from "./discovery/relation/RelationVisitor";
import { RootContext } from "../RootContext";
import { ComplexType } from "./discovery/complex-type/ComplexType";
import { Element } from "./discovery/element/Element";
import { Relation } from "./discovery/relation/Relation";

export class TypeExtractor {
  private _totalElementsMap: Map<string, Element>;
  private _totalRelationsMap: Map<string, Relation>;
  private _totalComplexTypesMap: Map<string, ComplexType>;

  extractAll(rootContext: RootContext) {
    const files = getAllFiles(rootContext.rootPath, ".js").filter(
      (x) =>
        !x.includes("/test/") &&
        !x.includes(".test.js") &&
        !x.includes("node_modules")
    ); // maybe we should also take those into account

    for (const file of files) {
      this.extract(rootContext, file);
    }
  }

  extract(rootContext: RootContext, filePath: string) {
    const elementVisitor = new ElementVisitor(filePath);
    const relationVisitor = new RelationVisitor(filePath);
    const complexTypeVisitor = new ComplexTypeVisitor(filePath);

    traverse(
      rootContext.getAbstractSyntaxTree(filePath),
      visitors.merge([elementVisitor, relationVisitor, complexTypeVisitor])
    );

    this._totalElementsMap = new Map([
      ...this._totalElementsMap,
      ...elementVisitor.elementMap,
    ]);
    this._totalRelationsMap = new Map([
      ...this._totalRelationsMap,
      ...relationVisitor.relationMap,
    ]);
    this._totalComplexTypesMap = new Map([
      ...this._totalComplexTypesMap,
      ...complexTypeVisitor.complexTypeMap,
    ]);
  }

  get totalElementsMap(): Map<string, Element> {
    return this._totalElementsMap;
  }

  get totalRelationsMap(): Map<string, Relation> {
    return this._totalRelationsMap;
  }

  get totalComplexTypesMap(): Map<string, ComplexType> {
    return this._totalComplexTypesMap;
  }
}
