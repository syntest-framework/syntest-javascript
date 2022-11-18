/*
 * Copyright 2020-2022 Delft University of Technology and SynTest contributors
 *
 * This file is part of SynTest JavaScript.
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
import { TargetMetaData } from "@syntest/framework";
import { ActionVisibility } from "../parsing/ActionVisibility";
import { Visitor } from "../Visitor";

export class TargetVisitor extends Visitor {
  private _targetMap: Map<string, TargetMetaData>;

  constructor(filePath: string) {
    super(filePath)
    this._targetMap = new Map<string, TargetMetaData>();
  }

  _createMaps(targetName) {
    if (!this._targetMap.has(targetName)) {
      this._targetMap.set(targetName, {
        name: targetName,
      });
    }
  }

  public ClassDeclaration: (path) => void = (path) => {
    const targetName = path.node.id.name;

    this._createMaps(targetName)
  };

  public FunctionDeclaration: (path) => void = (path) => {
    const targetName = path.node.id.name;

    this._createMaps(targetName)
  };

  // classic function declarations
  public FunctionExpression: (path) => void = (path) => {
    if (path.parent.type === 'CallExpression'
      || path.parent.type === 'NewExpression'
      || path.parent.type === 'ReturnStatement'
      || path.parent.type === 'LogicalExpression'
      || path.parent.type === 'ConditionalExpression'
      || path.parent.type === 'AssignmentExpression') {
      // anonymous argument function cannot call is not target
      return
    }

    let targetName;

    if (path.node.id) {
      targetName = path.node.id.name;
    } else if (path.parent.type === 'ObjectProperty') {
      // get identifier from assignment expression
      if (path.parent.key.type === 'Identifier') {
        targetName = path.parent.key.name
      } else if (path.parent.key.type === 'StringLiteral') {
        targetName = path.parent.key.value
      } else {
        console.log(path)
        throw new Error("unknown function expression name")
      }

    } else if (path.parent.type === 'VariableDeclarator') {
      // get identifier from assignment expression
      if (path.parent.id.type === 'Identifier') {
        targetName = path.parent.id.name
      } else {
        throw new Error("unknown function expression name")
      }

    } else {
      throw new Error("unknown function expression name")
    }

    this._createMaps(targetName)
  }

  public VariableDeclarator: (path) => void = (path) => {
    if (!path.node.init) {
      return
    }

    if (!(path.node.init.type === 'ArrowFunctionExpression'
      || path.node.init.type === 'FunctionExpression')
    ) {
      return
    }

    const targetName = path.node.id.name

    this._createMaps(targetName)
  }

  // prototyping
  public AssignmentExpression: (path) => void = (path) => {
    if (path.node.right.type !== "FunctionExpression") {
      return
    }

    let scope
    path.traverse({
      FunctionExpression: {
        enter: (p) => {
          scope = {
            uid: `${p.scope.uid - this.scopeIdOffset}`,
            filePath: this.filePath
          }
        }
      }
    })


    let targetName

    if (path.node.left.type === "MemberExpression") {
      if (path.node.left.object.name === 'module'
        && path.node.left.property.name === 'exports'
      ) {
        targetName = path.node.right.id?.name

        if (!targetName) {
          targetName = 'anon'
        }
      } else if (path.node.left.object.name === 'exports') {
        targetName = path.node.left.property.name
      } else if (path.node.left.object.type === 'MemberExpression'
        && path.node.left.object.property.name === 'prototype') {
        const functionName = path.node.left.property.name

        if (path.node.left.computed) {
          // we cannot know the name of computed properties unless we find out what the identifier refers to
          // see line 136 of Axios.js as example
          // Axios.prototype[method] = ?
          return
        }

        if (functionName === "method") {
          throw new Error("Invalid functionName")
        }

        return
      } else {
        const functionName = path.node.left.property.name

        if (path.node.left.computed) {
          // we cannot know the name of computed properties unless we find out what the identifier refers to
          // see line 136 of Axios.js as example
          // Axios.prototype[method] = ?
          return
        }

        if (functionName === "method") {
          throw new Error("Invalid functionName")
        }
        return
      }

    } else if (path.node.left.type === 'Identifier') {
        targetName = path.node.left.name
    } else {
      throw new Error("unknown function expression name")
    }

    if (!this.targetMap.has(targetName)) {
      this._createMaps(targetName)
    }
  }

  get targetMap(): Map<string, TargetMetaData> {
    return this._targetMap;
  }
}
