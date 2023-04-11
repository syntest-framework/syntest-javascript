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
import { Scope as BabelScope, TraverseOptions } from "@babel/traverse";
import * as t from "@babel/types";
import { Binding } from "@babel/traverse";

import { getLogger } from "@syntest/logging";

export class AbstractSyntaxTreeVisitor implements TraverseOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected static LOGGER: any;

  protected _filePath: string;

  protected _scopeIdOffset: number;

  protected _thisScopes: Set<string> = new Set([
    "ClassDeclaration",
    "FunctionDeclaration",
  ]);
  protected _thisScopeStack: number[] = [];
  protected _thisScopeStackNames: string[] = [];

  get filePath() {
    return this._filePath;
  }

  get scopeIdOffset() {
    return this._scopeIdOffset;
  }

  constructor(filePath: string) {
    this._filePath = filePath;
    AbstractSyntaxTreeVisitor.LOGGER = getLogger("AbstractSyntaxTreeVisitor");
  }

  protected _getUidFromScope(scope: BabelScope): number {
    return (<{ uid: number }>(<unknown>scope))["uid"];
  }

  public _getNodeId(path: NodePath<t.Node>): string {
    if (path.node.loc === undefined) {
      throw new Error(
        `Node ${path.type} in file '${this._filePath}' does not have a location`
      );
    }

    const startIndex = (<{ index: number }>(<unknown>path.node.loc.start))
      .index;
    const endIndex = (<{ index: number }>(<unknown>path.node.loc.end)).index;

    return `${this._filePath}::${startIndex}-${endIndex}`;
  }

  public _getBinding(path: NodePath<t.Node>): Binding {
    if (path.parentPath.isMemberExpression()) {
      // TODO
      return this._getBinding(path.parentPath.get("object"));
    }

    if (!path.isIdentifier()) {
      throw new Error("Cannot get binding for non-identifier");
    }

    return path.scope.getBinding(path.node.name);
  }

  enter = (path: NodePath<t.Node>) => {
    AbstractSyntaxTreeVisitor.LOGGER.silly(
      `Visiting node ${path.type} in file '${this._filePath}': location: ${path.node.loc?.start.line}:${path.node.loc?.start.column} - ${path.node.loc?.end.line}:${path.node.loc?.end.column} - type: ${path.node.type}`
    );
  };

  exit = (path: NodePath<t.Node>) => {
    AbstractSyntaxTreeVisitor.LOGGER.silly(
      `Exiting node ${path.type} in file '${this._filePath}': location: ${path.node.loc?.start.line}:${path.node.loc?.start.column} - ${path.node.loc?.end.line}:${path.node.loc?.end.column} - type: ${path.node.type}`
    );
  };

  public Program: (path: NodePath<t.Program>) => void = (path) => {
    if (this._scopeIdOffset === undefined) {
      this._scopeIdOffset = this._getUidFromScope(path.scope);
      this._thisScopeStack.push(this._getUidFromScope(path.scope));
      this._thisScopeStackNames.push("global");
    }
  };

  Scopable = {
    enter: (path: NodePath<t.Scopable>) => {
      if (!this._thisScopes.has(path.node.type)) {
        return;
      }

      if (!("id" in path.node)) {
        return;
      }

      let id = "anonymous";

      if (path.node.id !== null) {
        id = path.node.id.name;
      }

      const uid = this._getUidFromScope(path.scope);
      this._thisScopeStack.push(uid);
      this._thisScopeStackNames.push(id);
    },
    exit: (path: NodePath<t.Scopable>) => {
      if (!this._thisScopes.has(path.node.type)) {
        return;
      }

      this._thisScopeStack.pop();
      this._thisScopeStackNames.pop();
    },
  };

  protected _getCurrentThisScopeId() {
    if (this._thisScopeStack.length === 0) {
      throw new Error("Invalid scope stack!");
    }

    return this._thisScopeStack[this._thisScopeStack.length - 1];
  }

  // protected _getCurrentThisScopeName() {
  //   if (this._thisScopeStackNames.length === 0) {
  //     throw new Error("Invalid scope stack!");
  //   }

  //   return this._thisScopeStackNames[this._thisScopeStackNames.length - 1];
  // }

  protected _getNameFromNode(node: t.Node): string {
    if (node.type === "Identifier") {
      return node.name;
    }

    if ("name" in node) {
      if (typeof node.name === "string") {
        return node.name;
      } else if (node.name.type === "JSXMemberExpression") {
        return "anon";
      } else if (node.name.type === "JSXNamespacedName") {
        return node.name.name.name;
      } else {
        return node.name.name;
      }
    }

    return "anon";
  }

  // _getScope(path: NodePath<t.Node>): Scope {
  //   switch (path.node.type) {
  //     case "ThisExpression": {
  //       return {
  //         uid: `${this._getCurrentThisScopeId() - this.scopeIdOffset}`,
  //         filePath: this.filePath,
  //       };
  //     }
  //     case "MemberExpression": {
  //       const propertyName: string = this._getNameFromNode(path.node.property);

  //       const objectScope: Scope = this._getScope(<NodePath>path.get("object"));

  //       objectScope.uid += "-" + propertyName;

  //       return objectScope;
  //     }
  //     case "CallExpression": {
  //       return this._getScope(<NodePath>path.get("callee"));
  //     }

  //     // No default
  //   }

  //   /**
  //    * If the parent is a member expression and the current node is the property
  //    * then we need to get use scope of the object and append the property name
  //    */
  //   if (
  //     path.parent.type === "MemberExpression" &&
  //     path.parentPath.get("property") === path
  //   ) {
  //     const propertyName: string = this._getNameFromNode(path.node);

  //     const objectScope: Scope = this._getScope(
  //       <NodePath>path.parentPath.get("object")
  //     );

  //     objectScope.uid += "-" + propertyName;

  //     return objectScope;
  //   }

  //   if (path.node.type === "Identifier") {
  //     if (path.scope.hasGlobal(path.node.name)) {
  //       return {
  //         uid: "global",
  //         filePath: this.filePath,
  //       };
  //     }

  //     if (
  //       path.scope.hasBinding(path.node.name) &&
  //       path.scope.getBinding(path.node.name)
  //     ) {
  //       const variableScope = path.scope.getBinding(path.node.name).scope;

  //       return {
  //         uid: `${this._getUidFromScope(variableScope) - this.scopeIdOffset}`,
  //         filePath: this.filePath,
  //       };
  //     }

  //     // TODO these might be wrong
  //     if (
  //       path.parent.type === "ClassMethod" ||
  //       path.parent.type === "ObjectMethod" ||
  //       path.parent.type === "AssignmentExpression" ||
  //       path.parent.type === "FunctionExpression" ||
  //       path.parent.type === "ObjectProperty" ||
  //       path.parent.type === "MetaProperty"
  //     ) {
  //       const uid = this._getUidFromScope(path.scope.getBlockParent());

  //       return {
  //         filePath: this.filePath,
  //         uid: `${uid - this.scopeIdOffset}`,
  //       };
  //     }

  //     throw new Error(
  //       `Cannot find scope of Identifier ${path.node.name}\n${
  //         this.filePath
  //       }\n${path.getSource()}`
  //     );
  //   }

  //   // TODO super should be handled like this actually (kind off)
  //   if (
  //     path.node.type === "Super" ||
  //     path.node.type.includes("Expression") ||
  //     path.node.type.includes("Literal")
  //   ) {
  //     const uid = this._getUidFromScope(path.scope.getBlockParent());

  //     return {
  //       filePath: this.filePath,
  //       uid: `${uid - this.scopeIdOffset}`,
  //     };
  //   }

  //   throw new Error(
  //     `Cannot find scope of element of type ${path.node.type}\n${
  //       this.filePath
  //     }\n${path.getSource()}`
  //   );
  // }
}
