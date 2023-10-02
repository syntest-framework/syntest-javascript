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

import { computedProperty, unsupportedSyntax } from "../utils/diagnostics";

import { Export } from "./export/Export";
import {
  Callable,
  ClassTarget,
  Exportable,
  FunctionTarget,
  MethodTarget,
  NamedSubTarget,
  ObjectFunctionTarget,
  ObjectTarget,
  SubTarget,
} from "./Target";

export class TargetVisitor extends AbstractSyntaxTreeVisitor {
  protected static override LOGGER: Logger;

  private _logOrFail(message: string): undefined {
    if (this.syntaxForgiving) {
      TargetVisitor.LOGGER.warn(message);
      return undefined;
    } else {
      throw new Error(message);
    }
  }

  private _exports: Export[];

  private _subTargets: SubTarget[];

  private _equalObjects: Map<string, Set<string>>;

  constructor(filePath: string, syntaxForgiving: boolean, exports: Export[]) {
    super(filePath, syntaxForgiving);
    TargetVisitor.LOGGER = getLogger("TargetVisitor");
    this._exports = exports;
    this._subTargets = [];
    this._equalObjects = new Map();
  }

  private _getExport(id: string): Export | undefined {
    return this._exports.find((x) => {
      return x.id === id;
    });
  }

  private _getTargetNameOfDeclaration(
    path: NodePath<t.FunctionDeclaration | t.ClassDeclaration>
  ): string {
    if (path.node.id === null) {
      if (path.parentPath.node.type === "ExportDefaultDeclaration") {
        // e.g. export default class {}
        // e.g. export default function () {}
        return "default";
      } else {
        // e.g. class {}
        // e.g. function () {}
        // Should not be possible
        return this._logOrFail(
          unsupportedSyntax(path.type, this._getNodeId(path))
        );
      }
    } else {
      // e.g. class x {}
      // e.g. function x() {}
      return path.node.id.name;
    }
  }

  /**
   * Get the target name of an expression
   * The variable the expression is assigned to is used as the target name
   * @param path
   * @returns
   */
  private _getTargetNameOfExpression(path: NodePath<t.Node>): string {
    // e.g. const x = class A {}
    // e.g. const x = function A {}
    // e.g. const x = () => {}
    // we always use x as the target name instead of A
    const parentNode = path.parentPath.node;
    switch (parentNode.type) {
      case "VariableDeclarator": {
        // e.g. const ?? = class {}
        // e.g. const ?? = function {}
        // e.g. const ?? = () => {}
        if (parentNode.id.type === "Identifier") {
          // e.g. const x = class {}
          // e.g. const x = function {}
          // e.g. const x = () => {}
          return parentNode.id.name;
        } else {
          // e.g. const {x} = class {}
          // e.g. const {x} = function {}
          // e.g. const {x} = () => {}
          // Should not be possible
          return this._logOrFail(
            unsupportedSyntax(path.node.type, this._getNodeId(path))
          );
        }
      }
      case "AssignmentExpression": {
        // e.g. ?? = class {}
        // e.g. ?? = function {}
        // e.g. ?? = () => {}
        const assigned = parentNode.left;
        if (assigned.type === "Identifier") {
          // could also be memberexpression
          // e.g. x = class {}
          // e.g. x = function {}
          // e.g. x = () => {}
          return assigned.name;
        } else if (assigned.type === "MemberExpression") {
          // e.g. x.? = class {}
          // e.g. x.? = function {}
          // e.g. x.? = () => {}
          if (assigned.computed === true) {
            if (assigned.property.type.includes("Literal")) {
              // e.g. x["y"] = class {}
              // e.g. x["y"] = function {}
              // e.g. x["y"] = () => {}
              return "value" in assigned.property
                ? assigned.property.value.toString()
                : "null";
            } else {
              // e.g. x[y] = class {}
              // e.g. x[y] = function {}
              // e.g. x[y] = () => {}
              return this._logOrFail(
                computedProperty(path.node.type, this._getNodeId(path))
              );
            }
          } else if (assigned.property.type === "Identifier") {
            // e.g. x.y = class {}
            // e.g. x.y = function {}
            // e.g. x.y = () => {}
            if (
              assigned.property.name === "exports" &&
              assigned.object.type === "Identifier" &&
              assigned.object.name === "module"
            ) {
              // e.g. module.exports = class {}
              // e.g. module.exports = function {}
              // e.g. module.exports = () => {}
              return "id" in parentNode.right
                ? parentNode.right.id.name
                : "anonymousFunction";
            }
            return assigned.property.name;
          } else {
            // e.g. x.? = class {}
            // e.g. x.? = function {}
            // e.g. x.? = () => {}
            // Should not be possible
            return this._logOrFail(
              unsupportedSyntax(path.node.type, this._getNodeId(path))
            );
          }
        } else {
          // e.g. {x} = class {}
          // e.g. {x} = function {}
          // e.g. {x} = () => {}
          // Should not be possible
          return this._logOrFail(
            unsupportedSyntax(path.node.type, this._getNodeId(path))
          );
        }
      }
      case "ClassProperty":
      // e.g. class A { ? = class {} }
      // e.g. class A { ? = function () {} }
      // e.g. class A { ? = () => {} }
      case "ObjectProperty": {
        // e.g. {?: class {}}
        // e.g. {?: function {}}
        // e.g. {?: () => {}}
        if (parentNode.key.type === "Identifier") {
          // e.g. class A { x = class {} }
          // e.g. class A { x = function () {} }
          // e.g. class A { x = () => {} }

          // e.g. {y: class {}}
          // e.g. {y: function {}}
          // e.g. {y: () => {}}
          return parentNode.key.name;
        } else if (parentNode.key.type.includes("Literal")) {
          // e.g. class A { "x" = class {} }
          // e.g. class A { "x" = function () {} }
          // e.g. class A { "x" = () => {} }

          // e.g. {1: class {}}
          // e.g. {1: function {}}
          // e.g. {1: () => {}}
          return "value" in parentNode.key
            ? parentNode.key.value.toString()
            : "null";
        } else {
          // e.g. const {x} = class {}
          // e.g. const {x} = function {}
          // e.g. const {x} = () => {}

          // e.g. {?: class {}}
          // e.g. {?: function {}}
          // e.g. {?: () => {}}
          // Should not be possible
          return this._logOrFail(
            unsupportedSyntax(path.node.type, this._getNodeId(path))
          );
        }
      }
      case "ReturnStatement":
      // e.g. return class {}
      // e.g. return function () {}
      // e.g. return () => {}
      case "ArrowFunctionExpression":
      // e.g. () => class {}
      // e.g. () => function () {}
      // e.g. () => () => {}
      case "NewExpression":
      // e.g. new Class(class {}) // dont think this one is possible but unsure
      // e.g. new Class(function () {})
      // e.g. new Class(() => {})
      case "CallExpression": {
        // e.g. function(class {}) // dont think this one is possible but unsure
        // e.g. function(function () {})
        // e.g. function(() => {})
        return "id" in path.node && path.node.id && "name" in path.node.id
          ? path.node.id.name
          : "anonymous";
      }
      case "ConditionalExpression": {
        // e.g. c ? class {} : b
        // e.g. c ? function () {} : b
        // e.g. c ? () => {} : b
        return this._getTargetNameOfExpression(path.parentPath);
      }
      case "LogicalExpression": {
        // e.g. c || class {}
        // e.g. c || function () {}
        // e.g. c || () => {}
        return this._getTargetNameOfExpression(path.parentPath);
      }
      case "ExportDefaultDeclaration": {
        // e.g. export default class {}
        // e.g. export default function () {}
        // e.g. export default () => {}
        return "default";
      }
      default: {
        // e.g. class {}
        // e.g. function () {}
        // e.g. () => {}
        // Should not be possible
        return this._logOrFail(
          unsupportedSyntax(parentNode.type, this._getNodeId(path))
        );
      }
    }
  }

  public FunctionDeclaration: (path: NodePath<t.FunctionDeclaration>) => void =
    (path) => {
      // e.g. function x() {}
      const targetName = this._getTargetNameOfDeclaration(path);
      const id = this._getNodeId(path);
      const export_ = this._getExport(id);

      this._extractFromFunction(
        path,
        id,
        id,
        targetName,
        export_,
        false,
        false
      );

      path.skip();
    };

  public ClassDeclaration: (path: NodePath<t.ClassDeclaration>) => void = (
    path
  ) => {
    // e.g. class A {}
    const targetName = this._getTargetNameOfDeclaration(path);
    const id = this._getNodeId(path);
    const export_ = this._getExport(id);

    this._extractFromClass(path, id, id, targetName, export_);

    path.skip();
  };

  public FunctionExpression: (path: NodePath<t.FunctionExpression>) => void = (
    path
  ) => {
    // only thing left where these can be found is:
    // call(function () {})
    const targetName = this._getTargetNameOfExpression(path);

    if (!targetName) {
      return;
    }

    const id = this._getNodeId(path);
    const export_ = this._getExport(id);

    this._extractFromFunction(path, id, id, targetName, export_, false, false);

    path.skip();
  };

  public ClassExpression: (path: NodePath<t.ClassExpression>) => void = (
    path
  ) => {
    // only thing left where these can be found is:
    // call(class {})
    const targetName = this._getTargetNameOfExpression(path);

    if (!targetName) {
      return;
    }

    const id = this._getNodeId(path);
    const export_ = this._getExport(id);

    this._extractFromClass(path, id, id, targetName, export_);

    path.skip();
  };

  public ArrowFunctionExpression: (
    path: NodePath<t.ArrowFunctionExpression>
  ) => void = (path) => {
    // only thing left where these can be found is:
    // call(() => {})
    const targetName = this._getTargetNameOfExpression(path);

    if (!targetName) {
      return;
    }

    // TODO is there a difference if the parent is a variable declarator?

    const id = this._getNodeId(path);
    const export_ = this._getExport(id);

    this._extractFromFunction(path, id, id, targetName, export_, false, false);

    path.skip();
  };

  // public ObjectExpression: (
  //   path: NodePath<t.ObjectExpression>
  // ) => void = (path) => {
  //   const targetName = this._getTargetNameOfExpression(path);

  //   if (!targetName) {
  //     return;
  //   }

  //   const id = this._getNodeId(path);
  //   const export_ = this._getExport(id);

  //   this._extractFromObjectExpression(path, id, id, targetName, export_);

  //   path.skip();
  // };

  public VariableDeclarator: (path: NodePath<t.VariableDeclarator>) => void = (
    path
  ) => {
    if (!path.has("init")) {
      path.skip();
      return;
    }
    const idPath = <NodePath<t.Identifier>>path.get("id");
    const init = path.get("init");
    const initId = this._getNodeId(init);

    const targetName = idPath.node.name;
    const id = this._getNodeId(path);
    const typeId = initId;
    const export_ = this._getExport(id);

    if (init.isFunction()) {
      this._extractFromFunction(
        init,
        id,
        typeId,
        targetName,
        export_,
        false,
        false
      );
    } else if (init.isClass()) {
      this._extractFromClass(init, id, typeId, targetName, export_);
    } else if (init.isObjectExpression()) {
      this._findOrCreateObject(id, typeId, id, targetName);
      this._extractFromObjectExpression(init, id);
    } else if (init.isIdentifier()) {
      this._setEqual(id, initId);
    } else {
      // TODO
    }

    path.skip();
  };

  public AssignmentExpression: (
    path: NodePath<t.AssignmentExpression>
  ) => void = (path) => {
    const left = path.get("left");
    const right = path.get("right");

    const targetName = this._getTargetNameOfExpression(right);
    if (!targetName) {
      return;
    }
    let isObject = false;
    let isMethod = false;
    let superId: string;

    let id: string;

    if (left.isIdentifier()) {
      // x = ?
      id = this._getBindingId(left);
    } else {
      // ? = ?
      id = this._getBindingId(right);
    }

    if (left.isMemberExpression()) {
      const object = left.get("object");
      const property = left.get("property");

      if (property.isIdentifier() && left.node.computed) {
        path.skip();
        this._logOrFail(computedProperty(left.type, this._getNodeId(path)));
        return;
      } else if (!property.isIdentifier() && !left.node.computed) {
        // we also dont support a.f() = ?
        // or equivalent
        path.skip();
        this._logOrFail(unsupportedSyntax(left.type, this._getNodeId(path)));
        return;
      }

      if (object.isIdentifier()) {
        // x.? = ?
        // x['?'] = ?
        if (
          object.node.name === "exports" ||
          (object.node.name === "module" &&
            property.isIdentifier() &&
            property.node.name === "exports")
        ) {
          // exports.? = ?
          // module.exports = ?
          isObject = false;
          id = this._getBindingId(right);
        } else if (
          (property.isIdentifier() && property.node.name === "prototype") ||
          (property.isStringLiteral() && property.node.value === "prototype")
        ) {
          // x.prototype = ?
          // x['prototype'] = ?
          isObject = true;
          superId = this._getBindingId(object);
          const typeId = this._getBindingId(right);

          this._findAndReplaceOrCreateClass(
            superId,
            typeId,
            superId,
            object.node.name
          );
          isMethod = true;

          // // find object
          // this._findOrCreateObject(superId, typeId, superId, object.node.name)

          const prototypeId = this._getBindingId(right);

          this._setEqual(superId, prototypeId);
        } else {
          // x.x = ?
          isObject = true;
          superId = this._getBindingId(object);
          // find object
          this._findOrCreateObject(superId, superId, superId, object.node.name);
        }
      } else if (object.isMemberExpression()) {
        // ?.?.? = ?
        const subObject = object.get("object");
        const subProperty = object.get("property");
        // what about module.exports.x
        if (
          subObject.isIdentifier() &&
          ((subProperty.isIdentifier() &&
            subProperty.node.name === "prototype") ||
            (subProperty.isStringLiteral() &&
              subProperty.node.value === "prototype"))
        ) {
          // x.prototype.? = ?
          // x['prototype'].? = ?
          superId = this._getBindingId(subObject);

          this._findAndReplaceOrCreateClass(
            superId,
            superId,
            superId,
            subObject.node.name
          );
          isMethod = true;
        }
      } else {
        path.skip();
        return;
      }
    }

    const typeId = this._getNodeId(right);
    const export_ = this._getExport(isObject || isMethod ? superId : id);

    if (right.isFunction()) {
      this._extractFromFunction(
        right,
        id,
        typeId,
        targetName,
        export_,
        isObject,
        isMethod,
        superId
      );
    } else if (right.isClass()) {
      this._extractFromClass(right, id, typeId, targetName, export_);
    } else if (right.isObjectExpression()) {
      this._findOrCreateObject(id, typeId, isObject ? superId : id, targetName);
      this._extractFromObjectExpression(right, id);
    } else if (right.isIdentifier()) {
      this._setEqual(id, this._getBindingId(right));
    } else {
      // TODO
    }

    path.skip();
  };

  private _findAndReplaceOrCreateClass(
    id: string,
    typeId: string,
    exportId: string,
    name: string
  ) {
    const objectTarget = <NamedSubTarget & Exportable>(
      this._subTargets.find(
        (value) => value.id === id && value.type === TargetType.OBJECT
      )
    );

    const functionTarget = <NamedSubTarget & Exportable>(
      this._subTargets.find(
        (value) => value.id === id && value.type === TargetType.FUNCTION
      )
    );

    const classTarget = <NamedSubTarget & Exportable>(
      this._subTargets.find(
        (value) => value.id === id && value.type === TargetType.CLASS
      )
    );

    if (
      (objectTarget && classTarget) ||
      (objectTarget && functionTarget) ||
      (classTarget && functionTarget)
    ) {
      // only one can exist
      throw new Error("should not be possible");
    }

    if (objectTarget) {
      const newClassTarget: ClassTarget = {
        id: id,
        type: TargetType.CLASS,
        name: objectTarget.name,
        typeId: id,
        exported: objectTarget.exported,
        renamedTo: objectTarget.renamedTo,
        module: objectTarget.module,
        default: objectTarget.default,
      };
      // replace original target by prototype class
      this._subTargets[this._subTargets.indexOf(objectTarget)] = newClassTarget;

      return newClassTarget;
    } else if (functionTarget) {
      const newClassTarget: ClassTarget = {
        id: id,
        type: TargetType.CLASS,
        name: functionTarget.name,
        typeId: id,
        exported: functionTarget.exported,
        renamedTo: functionTarget.renamedTo,
        module: functionTarget.module,
        default: functionTarget.default,
      };
      // replace original target by prototype class
      this._subTargets[this._subTargets.indexOf(functionTarget)] =
        newClassTarget;

      const constructorTarget: MethodTarget = {
        id: id,
        type: TargetType.METHOD,
        name: functionTarget.name,
        typeId: id,
        methodType: "constructor",
        classId: newClassTarget.id,
        visibility: "public",
        isStatic: false,
        isAsync:
          "isAsync" in functionTarget
            ? (<Callable>functionTarget).isAsync
            : false,
      };

      this._subTargets.push(constructorTarget);

      return newClassTarget;
    } else if (classTarget) {
      // nothing igues?
      return classTarget;
    } else {
      const export_ = this._getExport(exportId);

      const newClassTarget: ClassTarget = {
        id: id,
        type: TargetType.CLASS,
        name: name,
        typeId: typeId,
        exported: !!export_,
        default: export_ ? export_.default : false,
        module: export_ ? export_.module : false,
      };
      this._subTargets.push(newClassTarget);
      return newClassTarget;
    }
  }

  private _findOrCreateObject(
    id: string,
    typeId: string,
    exportId: string,
    name: string
  ) {
    const objectTarget = this._subTargets.find(
      (value) => value.id === id && value.type === TargetType.OBJECT
    );

    if (!objectTarget) {
      const export_ = this._getExport(exportId);
      // create one if it does not exist
      const objectTarget: ObjectTarget = {
        id: id,
        typeId: typeId,
        name: name,
        type: TargetType.OBJECT,
        exported: !!export_,
        default: export_ ? export_.default : false,
        module: export_ ? export_.module : false,
      };
      this._subTargets.push(objectTarget);
      return objectTarget;
    }

    return objectTarget;
  }

  private _extractFromFunction(
    path: NodePath<t.Function>,
    functionId: string,
    typeId: string,
    functionName: string,
    export_: Export | undefined,
    isObjectFunction: boolean,
    isMethod: boolean,
    superId?: string
  ) {
    let target: FunctionTarget | ObjectFunctionTarget | MethodTarget;

    if (isObjectFunction && isMethod) {
      throw new Error("Cannot be method and object function");
    }

    if (isObjectFunction) {
      if (!superId) {
        throw new Error(
          "if it is an object function the object id should be given"
        );
      }
      target = {
        id: functionId,
        typeId: typeId,
        objectId: superId,
        name: functionName,
        type: TargetType.OBJECT_FUNCTION,
        isAsync: path.node.async,
      };
    } else if (isMethod) {
      if (!superId) {
        throw new Error(
          "if it is an object function the object id should be given"
        );
      }
      target = {
        id: functionId,
        typeId: typeId,
        classId: superId,
        name: functionName,
        type: TargetType.METHOD,
        isAsync: path.node.async,
        methodType: path.isClassMethod() ? path.node.kind : "method",
        visibility:
          path.isClassMethod() && path.node.access
            ? path.node.access
            : "public",
        isStatic:
          path.isClassMethod() || path.isClassProperty()
            ? path.node.static
            : false,
      };
    } else {
      target = {
        id: functionId,
        typeId: typeId,
        name: functionName,
        type: TargetType.FUNCTION,
        exported: !!export_,
        default: export_ ? export_.default : false,
        module: export_ ? export_.module : false,
        isAsync: path.node.async,
      };
    }

    this._subTargets.push(target);

    const body = path.get("body");

    if (Array.isArray(body)) {
      throw new TypeError("weird function body");
    } else {
      body.visit();
    }
  }

  private _extractFromObjectExpression(
    path: NodePath<t.ObjectExpression>,
    objectId: string
  ) {
    // loop over object properties
    for (const property of path.get("properties")) {
      if (property.isObjectMethod()) {
        if (property.node.computed) {
          // e.g. class A { ?() {} }
          // unsupported
          // not possible i think
          this._logOrFail(
            computedProperty(property.type, this._getNodeId(property))
          );
          continue;
        }
        const key = property.get("key");
        if (key.isIdentifier()) {
          const targetName = key.node.name;

          const id = this._getNodeId(property);
          this._extractFromFunction(
            property,
            id,
            id,
            targetName,
            undefined,
            true,
            false,
            objectId
          );
        } else if (key.isLiteral()) {
          const targetName = "value" in key ? String(key.value) : "null";

          const id = this._getNodeId(property);
          this._extractFromFunction(
            property,
            id,
            id,
            targetName,
            undefined,
            true,
            false,
            objectId
          );
        } else {
          // not possible i think
          this._logOrFail(
            unsupportedSyntax(property.node.type, this._getNodeId(property))
          );
          continue;
        }
      } else if (property.isObjectProperty()) {
        const key = property.get("key");
        const value = property.get("value");

        if (value) {
          const id = this._getNodeId(property);
          let targetName: string;
          if (key.isIdentifier()) {
            targetName = key.node.name;
          } else if (
            key.isStringLiteral() ||
            key.isBooleanLiteral() ||
            key.isNumericLiteral() ||
            key.isBigIntLiteral()
          ) {
            targetName = String(key.node.value);
          }

          if (value.isFunction()) {
            this._extractFromFunction(
              value,
              id,
              id,
              targetName,
              undefined,
              true,
              false,
              objectId
            );
          } else if (value.isClass()) {
            this._extractFromClass(value, id, id, targetName);
          } else if (value.isObjectExpression()) {
            this._findOrCreateObject(id, id, id, targetName);
            this._extractFromObjectExpression(value, id);
          } else if (value.isIdentifier()) {
            this._setEqual(id, this._getBindingId(value));
          } else {
            // TODO
          }
        }
      } else if (property.isSpreadElement()) {
        // TODO
        // extract the spread element
      }
    }
  }

  private _extractFromClass(
    path: NodePath<t.Class>,
    classId: string,
    typeId: string,
    className: string,
    export_?: Export | undefined
  ): void {
    const target: ClassTarget = {
      id: classId,
      typeId: typeId,
      name: className,
      type: TargetType.CLASS,
      exported: !!export_,
      default: export_ ? export_.default : false,
      module: export_ ? export_.module : false,
    };

    this._subTargets.push(target);

    const body = <NodePath<t.ClassBody>>path.get("body");
    for (const classBodyAttribute of body.get("body")) {
      if (classBodyAttribute.isClassMethod()) {
        if (classBodyAttribute.node.key.type !== "Identifier") {
          // e.g. class A { ?() {} }
          // unsupported
          // not possible i think
          this._logOrFail(
            unsupportedSyntax(
              classBodyAttribute.node.type,
              this._getNodeId(classBodyAttribute)
            )
          );
          continue;
        }

        const targetName = classBodyAttribute.node.key.name;

        const id = this._getNodeId(classBodyAttribute);

        this._extractFromFunction(
          classBodyAttribute,
          id,
          id,
          targetName,
          undefined,
          false,
          true,
          classId
        );
      } else if (classBodyAttribute.isClassProperty()) {
        const key = classBodyAttribute.get("key");
        const value = classBodyAttribute.get("value");

        if (value) {
          const id = this._getNodeId(classBodyAttribute);
          let targetName: string;
          if (key.isIdentifier()) {
            targetName = key.node.name;
          } else if (
            key.isStringLiteral() ||
            key.isBooleanLiteral() ||
            key.isNumericLiteral() ||
            key.isBigIntLiteral()
          ) {
            targetName = String(key.node.value);
          }

          if (value.isFunction()) {
            this._extractFromFunction(
              value,
              id,
              id,
              targetName,
              undefined,
              false,
              true,
              classId
            );
          } else if (value.isClass()) {
            this._extractFromClass(value, id, id, targetName);
          } else if (value.isObjectExpression()) {
            this._findOrCreateObject(id, typeId, id, targetName);
            this._extractFromObjectExpression(value, id);
          } else if (value.isIdentifier()) {
            this._setEqual(id, this._getBindingId(value));
          } else {
            // TODO
          }
        }
      } else {
        return this._logOrFail(
          unsupportedSyntax(body.node.type, this._getNodeId(classBodyAttribute))
        );
      }
    }
  }

  private _setEqual(idA: string, idB: string) {
    if (idA === idB) {
      return;
    }
    if (this._equalObjects.has(idA) && this._equalObjects.has(idB)) {
      // merge them
      const merged = new Set<string>([
        ...this._equalObjects.get(idA),
        ...this._equalObjects.get(idB),
      ]);
      // update for each entry?
      for (const id of merged) {
        this._equalObjects.set(id, merged);
      }
    } else if (this._equalObjects.has(idA)) {
      // add b to a
      this._equalObjects.get(idA).add(idB);
    } else if (this._equalObjects.has(idB)) {
      // add a to b
      this._equalObjects.get(idB).add(idA);
    } else {
      // create new set
      const set = new Set<string>([idA, idB]);
      this._equalObjects.set(idA, set);
      this._equalObjects.set(idB, set);
    }
  }

  private _equalize(): SubTarget[] {
    const subTargets = [...this._subTargets];
    const originalTargets = [...subTargets];

    const processedSets = new Set<Set<string>>();
    console.log(this._equalObjects);
    for (const set of this._equalObjects.values()) {
      if (processedSets.has(set)) {
        continue;
      }
      processedSets.add(set);
      const asArray = [...set];
      for (let index = 0; index < asArray.length; index++) {
        for (let index_ = index + 1; index_ < asArray.length; index_++) {
          const a = asArray[index];
          const b = asArray[index_];

          const subTargetA = originalTargets.filter(
            (s) =>
              s.id === a &&
              (s.type === TargetType.OBJECT || s.type === TargetType.CLASS)
          );
          const subTargetB = originalTargets.filter(
            (s) =>
              s.id === b &&
              (s.type === TargetType.OBJECT || s.type === TargetType.CLASS)
          );

          if (subTargetA.length === 0 || subTargetB.length === 0) {
            continue;
          }

          if (subTargetA.length !== 1) {
            console.log(subTargetA);
            throw new Error(
              `Should always be 1 but is ${subTargetA.length} ${a}`
            );
          }

          if (subTargetB.length !== 1) {
            console.log(subTargetB);
            throw new Error(
              `Should always be 1 but is ${subTargetB.length} ${b}`
            );
          }

          if (
            subTargetA[0].type === TargetType.CLASS &&
            subTargetB[0].type === TargetType.OBJECT
          ) {
            this._convertMethodsToObjectFunctions(
              <ClassTarget>subTargetA[0],
              <ObjectTarget>subTargetB[0],
              originalTargets,
              subTargets
            );
            this._convertObjectFunctionsToMethods(
              <ObjectTarget>subTargetB[0],
              <ClassTarget>subTargetA[0],
              originalTargets,
              subTargets
            );
          } else if (
            subTargetA[0].type === TargetType.OBJECT &&
            subTargetB[0].type === TargetType.CLASS
          ) {
            this._convertMethodsToObjectFunctions(
              <ClassTarget>subTargetB[0],
              <ObjectTarget>subTargetA[0],
              originalTargets,
              subTargets
            );
            this._convertObjectFunctionsToMethods(
              <ObjectTarget>subTargetA[0],
              <ClassTarget>subTargetB[0],
              originalTargets,
              subTargets
            );
          } else {
            // both objects??
            // both classes??
            throw new Error(
              `Cannot both be objects or both classes ${subTargetA[0].id} && ${subTargetB[0].id}`
            );
          }
        }
      }
    }

    return subTargets;
  }

  private _convertMethodsToObjectFunctions(
    parentClass: ClassTarget,
    newParentObject: ObjectTarget,
    originalSubTargets: SubTarget[],
    subTargets: SubTarget[]
  ) {
    const methods: MethodTarget[] = <MethodTarget[]>(
      originalSubTargets.filter(
        (v) =>
          v.type === TargetType.METHOD &&
          (<MethodTarget>v).classId === parentClass.id
      )
    );

    for (const method of methods) {
      const objectFunction: ObjectFunctionTarget = {
        id: method.id,
        typeId: method.typeId,
        objectId: newParentObject.id,
        name: method.name,
        type: TargetType.OBJECT_FUNCTION,
        isAsync: method.isAsync,
      };
      // insert after original
      subTargets.splice(subTargets.indexOf(method) + 1, 0, objectFunction);
    }
  }

  private _convertObjectFunctionsToMethods(
    parentObject: ObjectTarget,
    newParentClass: ClassTarget,
    originalSubTargets: SubTarget[],
    subTargets: SubTarget[]
  ) {
    const objectFunctions: ObjectFunctionTarget[] = <ObjectFunctionTarget[]>(
      originalSubTargets.filter(
        (v) =>
          v.type === TargetType.OBJECT_FUNCTION &&
          (<ObjectFunctionTarget>v).objectId === parentObject.id
      )
    );

    for (const objectFunction of objectFunctions) {
      const method: MethodTarget = {
        id: objectFunction.id,
        typeId: objectFunction.typeId,
        classId: newParentClass.id,
        name: objectFunction.name,
        type: TargetType.METHOD,
        isAsync: objectFunction.isAsync,
        isStatic: false,
        methodType: "method",
        visibility: "public",
      };
      // insert after original
      subTargets.splice(subTargets.indexOf(objectFunction) + 1, 0, method);
    }
  }

  get subTargets(): SubTarget[] {
    // for equal objects:
    const targets = this._equalize();

    return (
      targets
        .reverse()
        // .filter((subTarget, index, self) => {
        //   if (!("name" in subTarget)) {
        //     // paths/branches/lines are always unique
        //     return true;
        //   }

        //   // filter duplicates because of redefinitions
        //   // e.g. let a = 1; a = 2;
        //   // this would result in two subtargets with the same name "a"
        //   // but we only want the last one
        //   return (
        //     index ===
        //     self.findIndex((t) => {
        //       return (
        //         "name" in t &&
        //         t.id === subTarget.id &&
        //         t.type === subTarget.type &&
        //         t.name === subTarget.name &&
        //         (t.type === TargetType.METHOD
        //           ? (<MethodTarget>t).methodType ===
        //               (<MethodTarget>subTarget).methodType &&
        //             (<MethodTarget>t).isStatic ===
        //               (<MethodTarget>subTarget).isStatic &&
        //             (<MethodTarget>t).classId ===
        //               (<MethodTarget>subTarget).classId
        //           : true)
        //       );
        //     })
        //   );
        // })
        .reverse()
    );
  }
}
