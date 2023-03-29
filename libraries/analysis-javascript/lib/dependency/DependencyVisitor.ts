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

import { NodePath } from "@babel/core";
import * as t from "@babel/types";
import { AbstractSyntaxTreeVisitor } from "@syntest/ast-visitor-javascript";

export class ImportVisitor extends AbstractSyntaxTreeVisitor {
  private _imports: Set<string>;

  constructor(filePath: string) {
    super(filePath);
    this._imports = new Set<string>();
  }

  public ImportDeclaration: (path: NodePath<t.ImportDeclaration>) => void = (
    path
  ) => {
    this._imports.add(path.node.source.value);
  };

  public CallExpression: (path: NodePath<t.CallExpression>) => void = (
    path
  ) => {
    if ("name" in path.node.callee && path.node.callee.name === "require") {
      if (path.node.arguments[0].type === "StringLiteral") {
        this._imports.add(path.node.arguments[0].value);
      } else {
        // This tool does not support dynamic require statements.
        // throw new Error("This tool does not support dynamic require statements.")
      }
    }
  };

  get imports(): Set<string> {
    return this._imports;
  }
}
