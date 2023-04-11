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
import { NodePath } from "@babel/core";
import * as t from "@babel/types";
import { AbstractSyntaxTreeVisitor } from "@syntest/ast-visitor-javascript";
import { ComplexType } from "./ComplexType";

export class ComplexTypeVisitor extends AbstractSyntaxTreeVisitor {
  private _complexTypeMap: Map<string, ComplexType>;

  // TODO separate stack for static and non-static properties
  private _objectStack: ComplexType[];

  get complexTypeMap(): Map<string, ComplexType> {
    return this._complexTypeMap;
  }

  constructor(filePath: string) {
    super(filePath);
    this._complexTypeMap = new Map();
    this._objectStack = [];
  }

  private _getCurrentObject(): ComplexType {
    return this._objectStack[this._objectStack.length - 1];
  }

  private _getPropertyName(node: t.ClassProperty["key"]) {
    if (node.type === "Identifier") {
      // e.g. class A { x = class {} }
      // e.g. class A { x = function () {} }
      // e.g. class A { x = () => {} }
      return node.name;
    } else if (node.type.includes("Literal")) {
      // e.g. class A { "x" = class {} }
      // e.g. class A { "x" = function () {} }
      // e.g. class A { "x" = () => {} }
      return "value" in node ? node.value.toString() : "null";
    } else {
      // e.g. const {x} = class {}
      // e.g. const {x} = function {}
      // e.g. const {x} = () => {}
      // Should not be possible
      throw new Error("unknown class expression");
    }
  }

  // classes
  public ClassExpression: (path: NodePath<t.ClassExpression>) => void = (
    path: NodePath<t.ClassExpression>
  ) => {
    const complexType: ComplexType = {
      id: this._getNodeId(path),
      properties: new Map(),
    };
    this._complexTypeMap.set(this._getNodeId(path), complexType);
    this._objectStack.push(complexType);

    path.get("body").visit();

    this._objectStack.pop();

    path.skip();
  };

  public ClassDeclaration: (path: NodePath<t.ClassDeclaration>) => void = (
    path: NodePath<t.ClassDeclaration>
  ) => {
    const complexType: ComplexType = {
      id: this._getNodeId(path),
      properties: new Map(),
    };
    this._complexTypeMap.set(this._getNodeId(path), complexType);
    this._objectStack.push(complexType);

    path.get("body").visit();

    this._objectStack.pop();

    path.skip();
  };

  public ClassMethod: (path: NodePath<t.ClassMethod>) => void = (
    path: NodePath<t.ClassMethod>
  ) => {
    const name = this._getPropertyName(path.node.key);

    this._getCurrentObject().properties.set(name, this._getNodeId(path));
  };

  public ClassPrivateMethod: (path: NodePath<t.ClassPrivateMethod>) => void = (
    path: NodePath<t.ClassPrivateMethod>
  ) => {
    const name = this._getPropertyName(path.node.key.id);

    this._getCurrentObject().properties.set(`#${name}`, this._getNodeId(path));
  };

  public ClassProperty: (path: NodePath<t.ClassProperty>) => void = (
    path: NodePath<t.ClassProperty>
  ) => {
    const name = this._getPropertyName(path.node.key);

    this._getCurrentObject().properties.set(name, this._getNodeId(path));
  };

  public ClassPrivateProperty: (
    path: NodePath<t.ClassPrivateProperty>
  ) => void = (path: NodePath<t.ClassPrivateProperty>) => {
    const name = this._getPropertyName(path.node.key.id);

    this._getCurrentObject().properties.set(`#${name}`, this._getNodeId(path));
  };

  // TODO ClassAccessorProperty | TSDeclareMethod | TSIndexSignature | StaticBlock

  // TODO interfaces
  // public InterfaceDeclaration: (path: NodePath<t.InterfaceDeclaration>) => void = (
  //   path: NodePath<t.InterfaceDeclaration>
  // ) => {

  // };

  // Objects
  public ObjectExpression: (path: NodePath<t.ObjectExpression>) => void = (
    path: NodePath<t.ObjectExpression>
  ) => {
    const complexType: ComplexType = {
      id: this._getNodeId(path),
      properties: new Map(),
    };
    this._complexTypeMap.set(this._getNodeId(path), complexType);
    this._objectStack.push(complexType);

    for (const property of path.get("properties")) {
      property.visit();
    }

    this._objectStack.pop();

    path.skip();
  };

  public ObjectMethod: (path: NodePath<t.ObjectMethod>) => void = (
    path: NodePath<t.ObjectMethod>
  ) => {
    const name = this._getPropertyName(path.node.key);

    this._getCurrentObject().properties.set(name, this._getNodeId(path));
  };

  public ObjectProperty: (path: NodePath<t.ObjectProperty>) => void = (
    path: NodePath<t.ObjectProperty>
  ) => {
    if (path.node.key.type === "PrivateName") {
      const name = this._getPropertyName(path.node.key.id);

      this._getCurrentObject().properties.set(
        `#${name}`,
        this._getNodeId(path)
      );
    } else {
      const name = this._getPropertyName(path.node.key);

      this._getCurrentObject().properties.set(name, this._getNodeId(path));
    }
  };

  // TODO SpreadElement

  // Functions
  public FunctionDeclaration: (path: NodePath<t.FunctionDeclaration>) => void =
    (path: NodePath<t.FunctionDeclaration>) => {
      const complexType: ComplexType = {
        id: this._getNodeId(path),
        properties: new Map(),
      };
      this._complexTypeMap.set(this._getNodeId(path), complexType);
      this._objectStack.push(complexType);

      path.get("body").visit();

      this._objectStack.pop();

      path.skip();
    };

  public FunctionExpression: (path: NodePath<t.FunctionExpression>) => void = (
    path: NodePath<t.FunctionExpression>
  ) => {
    const complexType: ComplexType = {
      id: this._getNodeId(path),
      properties: new Map(),
    };
    this._complexTypeMap.set(this._getNodeId(path), complexType);
    this._objectStack.push(complexType);

    path.get("body").visit();

    this._objectStack.pop();

    path.skip();
  };

  public ArrowFunctionExpression: (
    path: NodePath<t.ArrowFunctionExpression>
  ) => void = (path: NodePath<t.ArrowFunctionExpression>) => {
    // not thisable so we skip it
  };

  public MemberExpression: (path: NodePath<t.MemberExpression>) => void = (
    path: NodePath<t.MemberExpression>
  ) => {
    if (path.node.computed) {
      return;
    }

    if (path.node.object.type === "ThisExpression") {
      const _object = this._getCurrentObject();

      if (path.node.property.type === "PrivateName") {
        const name = this._getPropertyName(path.node.property.id);

        _object.properties.set(`#${name}`, this._getNodeId(path));
      } else {
        const name = this._getPropertyName(path.node.property);

        _object.properties.set(name, this._getNodeId(path));
      }
    } else if (path.node.object.type === "Identifier") {
      const binding = this._getBinding(path.get("object"));
      const _object = this.complexTypeMap.get(this._getNodeId(binding.path));

      if (!_object) {
        // TODO check for this
        return;
      }

      if (path.node.property.type === "PrivateName") {
        const name = this._getPropertyName(path.node.property.id);

        _object.properties.set(`#${name}`, this._getNodeId(path));
      } else {
        const name = this._getPropertyName(path.node.property);

        _object.properties.set(name, this._getNodeId(path));
      }
    }
  };
}
