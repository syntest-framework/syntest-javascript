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
import _traverse from "@babel/traverse";
import * as t from "@babel/types";

import { Factory } from "../../Factory.js";

import { ElementVisitor } from "./element/ElementVisitor.js";
import { ObjectVisitor } from "./object/ObjectVisitor.js";
import { RelationVisitor } from "./relation/RelationVisitor.js";

const traverse = (<{ default: typeof _traverse }>(<unknown>_traverse)).default;

export class TypeExtractor extends Factory {
  extractElements(filepath: string, ast: t.Node) {
    const elementVisitor = new ElementVisitor(filepath, this.syntaxForgiving);

    traverse(ast, elementVisitor);

    return elementVisitor.elementMap;
  }

  extractRelations(filepath: string, ast: t.Node) {
    const relationVisitor = new RelationVisitor(filepath, this.syntaxForgiving);

    traverse(ast, relationVisitor);

    return relationVisitor.relationMap;
  }

  extractObjectTypes(filepath: string, ast: t.Node) {
    const objectVisitor = new ObjectVisitor(filepath, this.syntaxForgiving);

    traverse(ast, objectVisitor);

    return objectVisitor.objectTypeMap;
  }
}
