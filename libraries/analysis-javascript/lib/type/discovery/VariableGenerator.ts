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
import { Element } from "@syntest/ast-visitor-javascript";

import { Relation } from "./Relation";
import { VariableVisitor } from "./VariableVisitor";

/**
 * Typing generator for targets.
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
    targetAST: t.Node
  ): [Element[], Relation[], Map<string, Relation>] {
    const visitor = new VariableVisitor(filePath);

    traverse(targetAST, visitor);

    return [
      visitor.elements,
      visitor.relations,
      visitor.wrapperElementIsRelation,
    ];
  }
}