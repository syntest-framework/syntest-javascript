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
import { TargetType } from "@syntest/analysis";
import { AbstractSyntaxTreeVisitor } from "@syntest/ast-visitor-javascript";
import { getLogger, Logger } from "@syntest/logging";


import {
  ClassTarget,
  FunctionTarget,
  ObjectTarget,
  Target,
  TargetGraph,
} from "./Target";

export class TargetVisitor extends AbstractSyntaxTreeVisitor {
  protected static override LOGGER: Logger;

  // private _logOrFail(message: string): undefined {
  //   if (this.syntaxForgiving) {
  //     TargetVisitor.LOGGER.warn(message);
  //     return undefined;
  //   } else {
  //     throw new Error(message);
  //   }
  // }

  private _targetGraph: TargetGraph;
  private _parentStack: Target[]

  constructor(filePath: string, syntaxForgiving: boolean) {
    super(filePath, syntaxForgiving);
    TargetVisitor.LOGGER = getLogger("TargetVisitor");
    this._targetGraph = new TargetGraph();
  }

  public _getTargetGraph() {
    return this._targetGraph
  }

  private _currentParent(): Target {
    return this._parentStack[this._parentStack.length - 1]
  }


  public Function = {
    enter: (path: NodePath<t.Function>) => {
      const currentParent = this._currentParent()

      const id = this._getNodeId(path);

      const newTarget: FunctionTarget = {
        id: id,
        typeId: id,
        exportId: id,
        type: TargetType.FUNCTION,
        isAsync: path.node.async,
        isStatic: path.isClassMethod() || path.isClassProperty() ? path.node.static : false,
        methodType: path.isClassMethod() ? path.node.kind : "method",
        visibility: path.isClassMethod() && path.node.access ? path.node.access : "public",
      }
      this._targetGraph.addTarget(newTarget, currentParent)
      this._parentStack.push(newTarget)
    },
    exit: (_path: NodePath<t.Function>) => {
      // TODO check if it is me
      this._parentStack.pop()
    }
  }

  public Class = {
    enter: (path: NodePath<t.Class>) => {
      const currentParent = this._currentParent()

      const id = this._getNodeId(path);

      const newTarget: ClassTarget = {
        id: id,
        typeId: id,
        exportId: id,
        type: TargetType.CLASS
      }
      this._targetGraph.addTarget(newTarget, currentParent)
      this._parentStack.push(newTarget)
    },
    exit: (path: NodePath<t.Class>) => {
      // TODO check if it is me
      this._parentStack.pop()
    }
  }

  public ObjectExpression = {
    enter: (path: NodePath<t.ObjectExpression>) => {
      const currentParent = this._currentParent()

      const id = this._getNodeId(path);

      const newTarget: ObjectTarget = {
        id: id,
        typeId: id,
        exportId: id,
        type: TargetType.OBJECT
      }
      this._targetGraph.addTarget(newTarget, currentParent)
      this._parentStack.push(newTarget)
    },
    exit: (_path: NodePath<t.ObjectExpression>) => {
      // TODO check if it is me
      this._parentStack.pop()
    }
  }

  public ObjectPattern = {
    enter: (path: NodePath<t.ObjectPattern>) => {
      const currentParent = this._currentParent()

      const id = this._getNodeId(path);

      const newTarget: ObjectTarget = {
        id: id,
        typeId: id,
        exportId: id,
        type: TargetType.OBJECT
      }
      this._targetGraph.addTarget(newTarget, currentParent)
      this._parentStack.push(newTarget)
    },
    exit: (_path: NodePath<t.ObjectPattern>) => {
      // TODO check if it is me
      this._parentStack.pop()
    }
  }

  public AssignmentExpression = {
    enter: (path: NodePath<t.AssignmentExpression>) => {
      const currentParent = this._currentParent()

      const id = this._getNodeId(path);

      const newTarget: ObjectTarget = {
        id: id,
        typeId: id,
        exportId: id,
        type: TargetType.OBJECT
      }
      this._targetGraph.addTarget(newTarget, currentParent)
      this._parentStack.push(newTarget)
    },
    exit: (path: NodePath<t.AssignmentExpression>) => {
      // TODO check if it is me
      this._parentStack.pop()
    }
  }


  // public AssignmentExpression: (
  //   path: NodePath<t.AssignmentExpression>
  // ) => void = (path) => {
  //   const left = path.get("left");
  //   const right = path.get("right");

  //   const targetName = this._getTargetNameOfExpression(right);
  //   if (!targetName) {
  //     return;
  //   }
  //   let isObject = false;
  //   let isMethod = false;
  //   let superId: string;

  //   let id: string;

  //   if (left.isIdentifier()) {
  //     // x = ?
  //     id = this._getBindingId(left);
  //   } else {
  //     // ? = ?
  //     id = this._getBindingId(right);
  //   }

  //   if (left.isMemberExpression()) {
  //     const object = left.get("object");
  //     const property = left.get("property");

  //     if (property.isIdentifier() && left.node.computed) {
  //       path.skip();
  //       this._logOrFail(computedProperty(left.type, this._getNodeId(path)));
  //       return;
  //     } else if (!property.isIdentifier() && !left.node.computed) {
  //       // we also dont support a.f() = ?
  //       // or equivalent
  //       path.skip();
  //       this._logOrFail(unsupportedSyntax(left.type, this._getNodeId(path)));
  //       return;
  //     }

  //     if (object.isIdentifier()) {
  //       // x.? = ?
  //       // x['?'] = ?
  //       if (
  //         object.node.name === "exports" ||
  //         (object.node.name === "module" &&
  //           property.isIdentifier() &&
  //           property.node.name === "exports")
  //       ) {
  //         // exports.? = ?
  //         // module.exports = ?
  //         isObject = false;
  //         id = this._getBindingId(right);
  //       } else if (
  //         (property.isIdentifier() && property.node.name === "prototype") ||
  //         (property.isStringLiteral() && property.node.value === "prototype")
  //       ) {
  //         // x.prototype = ?
  //         // x['prototype'] = ?
  //         isObject = true;
  //         superId = this._getBindingId(object);
  //         const typeId = this._getBindingId(right);

  //         this._findAndReplaceOrCreateClass(
  //           superId,
  //           typeId,
  //           superId,
  //           object.node.name
  //         );
  //         isMethod = true;

  //         // // find object
  //         // this._findOrCreateObject(superId, typeId, superId, object.node.name)

  //         const prototypeId = this._getBindingId(right);

  //         this._setEqual(superId, prototypeId);
  //       } else {
  //         // x.x = ?
  //         isObject = true;
  //         superId = this._getBindingId(object);
  //         // find object
  //         this._findOrCreateObject(superId, superId, superId, object.node.name);
  //       }
  //     } else if (object.isMemberExpression()) {
  //       // ?.?.? = ?
  //       const subObject = object.get("object");
  //       const subProperty = object.get("property");
  //       // what about module.exports.x
  //       if (
  //         subObject.isIdentifier() &&
  //         ((subProperty.isIdentifier() &&
  //           subProperty.node.name === "prototype") ||
  //           (subProperty.isStringLiteral() &&
  //             subProperty.node.value === "prototype"))
  //       ) {
  //         // x.prototype.? = ?
  //         // x['prototype'].? = ?
  //         superId = this._getBindingId(subObject);

  //         this._findAndReplaceOrCreateClass(
  //           superId,
  //           superId,
  //           superId,
  //           subObject.node.name
  //         );
  //         isMethod = true;
  //       }
  //     } else {
  //       path.skip();
  //       return;
  //     }
  //   }

  //   const typeId = this._getNodeId(right);
  //   const export_ = this._getExport(isObject || isMethod ? superId : id);

  //   if (right.isFunction()) {
  //     this._extractFromFunction(
  //       right,
  //       id,
  //       typeId,
  //       targetName,
  //       export_,
  //       isObject,
  //       isMethod,
  //       superId
  //     );
  //   } else if (right.isClass()) {
  //     this._extractFromClass(right, id, typeId, targetName, export_);
  //   } else if (right.isObjectExpression()) {
  //     this._findOrCreateObject(id, typeId, isObject ? superId : id, targetName);
  //     this._extractFromObjectExpression(right, id);
  //   } else if (right.isIdentifier()) {
  //     this._setEqual(id, this._getBindingId(right));
  //   } else {
  //     // TODO
  //   }

  //   path.skip();
  // };

}
