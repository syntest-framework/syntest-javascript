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

import { traverse } from "@babel/core";
import * as t from "@babel/types";
import { visitors } from "@babel/traverse";

import { Relation } from "./relation/Relation";
import { Element } from "./element/Element";
import { ElementVisitor } from "./element/ElementVisitor";
import { RelationVisitor } from "./relation/RelationVisitor";

/**
 * Todo rename
 *
 * @author Dimitri Stallenberg
 */
export class VariableGenerator {
  /**
   * Generate function map for specified target.
   *
   * @param filePath the path of the current file
   * @param targetAST The AST of the target
   */
  generate(
    filePath: string,
    AST: t.Node
  ): { elementMap: Map<string, Element>; relationMap: Map<string, Relation> } {
    const elementVisitor = new ElementVisitor(filePath);
    const relationVisitor = new RelationVisitor(filePath);

    traverse(AST, visitors.merge([elementVisitor, relationVisitor]));

    return {
      elementMap: elementVisitor.elementMap,
      relationMap: relationVisitor.relationMap,
    };
  }
}
