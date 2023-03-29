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

import { ComplexObject } from "../type/discovery/object/ComplexObject";
import { TypeProbability } from "../type/resolving/TypeProbability";

import { ActionDescription } from "./ActionDescription";
import { ActionType } from "./ActionType";
import { IdentifierDescription } from "./IdentifierDescription";
import { ClassTarget, SubTarget } from "./Target";
import { VisibilityType } from "./VisibilityType";

export class TargetVisitor extends AbstractSyntaxTreeVisitor {
  private _subTargets: SubTarget[];

  constructor(filePath: string) {
    super(filePath);
    this._subTargets = [];
  }

  _createMaps(targetName: string) {
    if (!this._targetMap.has(targetName)) {
      this._targetMap.set(targetName, {
        name: targetName,
      });

      this._functionMap.set(targetName, new Map<string, ActionDescription>());
    }
  }

  // classic function declarations
  public FunctionExpression: (path: NodePath<t.FunctionExpression>) => void = (
    path
  ) => {
    if (
      path.parent.type === "CallExpression" ||
      path.parent.type === "NewExpression" ||
      path.parent.type === "ReturnStatement" ||
      path.parent.type === "LogicalExpression" ||
      path.parent.type === "ConditionalExpression" ||
      path.parent.type === "AssignmentExpression"
    ) {
      // anonymous argument function cannot call is not target
      return;
    }

    let targetName;

    if (path.node.id) {
      targetName = path.node.id.name;
    } else if (path.parent.type === "ObjectProperty") {
      // get identifier from assignment expression
      if (path.parent.key.type === "Identifier") {
        targetName = path.parent.key.name;
      } else if (path.parent.key.type === "StringLiteral") {
        targetName = path.parent.key.value;
      } else {
        console.log(path);
        throw new Error("unknown function expression name");
      }
    } else if (path.parent.type === "VariableDeclarator") {
      // get identifier from assignment expression
      if (path.parent.id.type === "Identifier") {
        targetName = path.parent.id.name;
      } else {
        throw new Error("unknown function expression name");
      }
    } else {
      throw new Error("unknown function expression name");
    }

    const functionName = targetName;

    this._createMaps(targetName);

    this._functionMap.get(targetName).set(functionName, {
      scope: {
        uid: `${path.scope.uid - this.scopeIdOffset}`,
        filePath: this.filePath,
      },
      name: functionName,
      type: ActionType.FUNCTION,
      visibility: VisibilityType.PUBLIC,
      isConstructor: false,
      parameters: path.node.params.map((x) => this._extractParam(x)),
      returnParameter: {
        name: "returnValue",
        typeProbabilityMap: new TypeProbability(), // TODO unknown because javascript! (check how this looks in typescript)
      },
      isStatic: path.node.static,
      isAsync: path.node.async,
    });
  };

  // Program: (path) => void = (path) => {
  //   if (this.scopeIdOffset === undefined) {
  //     this.scopeIdOffset = path.scope.uid
  //   }
  //
  //   for (const key of Object.keys(path.scope.bindings)) {
  //     const binding = path.scope.bindings[key]
  //
  //     const newScopeUid = binding.path.scope.uid
  //
  //     const node = binding.path.node
  //
  //     if (node.type === 'VariableDeclarator') {
  //       let init = node.init
  //
  //       if (!init) {
  //         continue
  //       }
  //
  //       //
  //       // while (init.type === 'Identifier') {
  //       //   if (!path.scope.hasBinding(init.name)) {
  //       //     break
  //       //   }
  //       //   init = path.scope.bindings[init.name].path.node
  //       // }
  //       //
  //       if (init.type === "ArrowFunctionExpression") {
  //         const targetName = binding.identifier.name
  //         this._createMaps(targetName)
  //         this._createFunction(newScopeUid, targetName, targetName, init)
  //       }
  //
  //     } else if (node.type === 'ClassDeclaration') {
  //       const targetName = node.id.name;
  //       this._createMaps(targetName)
  //     } else if (node.type === 'FunctionDeclaration') {
  //       const targetName = node.id.name;
  //       this._createMaps(targetName)
  //       this._createFunction(newScopeUid, targetName, targetName, node)
  //     }
  //   }
  // }

  public ClassDeclaration: (path: NodePath<t.ClassDeclaration>) => void = (
    path
  ) => {
    const targetName = path.node.id.name;

    const target: ClassTarget = {
      id: `${this.nodeId}`,
      name: targetName,
      type: TargetType.CLASS,
      exported: this._isExported(path),
      default: this._isDefaultExported(path),
      module: false,
    };

    this.subTargets.push(target);
  };

  public FunctionDeclaration: (path: NodePath<t.FunctionDeclaration>) => void =
    (path) => {
      const targetName = path.node.id.name;
      const functionName = targetName;

      const target: FunctionTarget = {
        id: `${this.nodeId}`,
        name: targetName,
        type: TargetType.FUNCTION,
        exported: this._isExported(path),
        default: this._isDefaultExported(path),
        module: false,
      };

      this.subTargets.push(target);

      this._functionMap.get(targetName).set(functionName, {
        scope: {
          uid: `${path.scope.uid - this.scopeIdOffset}`,
          filePath: this.filePath,
        },
        name: functionName,
        type: ActionType.FUNCTION,
        visibility: VisibilityType.PUBLIC,
        isConstructor: false,
        parameters: path.node.params.map((x) => this._extractParam(x)),
        returnParameter: {
          name: "returnValue",
          typeProbabilityMap: new TypeProbability(),
        },
        isStatic: path.node.static,
        isAsync: path.node.async,
      });
    };

  public ClassMethod: (path: NodePath<t.ClassMethod>) => void = (path) => {
    const targetName = path.parentPath.parentPath.node.id.name;
    const functionName = path.node.key.name;

    let visibility = VisibilityType.PUBLIC;
    if (path.node.access === "private") {
      visibility = VisibilityType.PRIVATE;
    } else if (path.node.access === "protected") {
      visibility = VisibilityType.PROTECTED;
    }

    this._functionMap.get(targetName).set(`${path.node.kind}#${functionName}`, {
      scope: {
        uid: `${path.scope.uid - this.scopeIdOffset}`,
        filePath: this.filePath,
      },
      name: functionName,
      type: path.node.kind,
      visibility: visibility,
      isConstructor: path.node.kind === "constructor",
      parameters: path.node.params.map((x) => this._extractParam(x)),
      returnParameter: {
        name: "returnValue",
        typeProbabilityMap: new TypeProbability(), // TODO unknown because javascript! (check how this looks in typescript)
      },
      isStatic: path.node.static,
      isAsync: path.node.async,
    });
  };

  public VariableDeclarator: (path: NodePath<t.VariableDeclarator>) => void = (
    path
  ) => {
    if (!path.node.init) {
      return;
    }

    if (
      !(
        path.node.init.type === "ArrowFunctionExpression" ||
        path.node.init.type === "FunctionExpression"
      )
    ) {
      return;
    }

    const targetName = path.node.id.name;
    const functionName = targetName;

    this._createMaps(targetName);

    let scope;
    path.traverse({
      ArrowFunctionExpression: {
        enter: (p) => {
          scope = {
            uid: `${p.scope.uid - this.scopeIdOffset}`,
            filePath: this.filePath,
          };
        },
      },
      FunctionExpression: {
        enter: (p) => {
          scope = {
            uid: `${p.scope.uid - this.scopeIdOffset}`,
            filePath: this.filePath,
          };
        },
      },
    });

    this._functionMap.get(targetName).set(functionName, {
      scope: scope,
      name: functionName,
      type: ActionType.FUNCTION,
      visibility: VisibilityType.PUBLIC,
      isConstructor: false,
      parameters: path.node.init.params.map((x) => this._extractParam(x)),
      returnParameter: {
        name: "returnValue",
        typeProbabilityMap: new TypeProbability(), // TODO unknown because javascript! (check how this looks in typescript)
      },
      isStatic: path.node.init.static,
      isAsync: path.node.init.async,
    });
  };

  // prototyping
  public AssignmentExpression: (
    path: NodePath<t.AssignmentExpression>
  ) => void = (path) => {
    if (path.node.right.type !== "FunctionExpression") {
      return;
    }

    let scope;
    path.traverse({
      FunctionExpression: {
        enter: (p) => {
          scope = {
            uid: `${p.scope.uid - this.scopeIdOffset}`,
            filePath: this.filePath,
          };
        },
      },
    });

    let targetName;

    if (path.node.left.type === "MemberExpression") {
      if (
        path.node.left.object.name === "module" &&
        path.node.left.property.name === "exports"
      ) {
        targetName = path.node.right.id?.name;

        if (!targetName) {
          targetName = "anon";
        }
      } else if (path.node.left.object.name === "exports") {
        targetName = path.node.left.property.name;
      } else if (
        path.node.left.object.type === "MemberExpression" &&
        path.node.left.object.property.name === "prototype"
      ) {
        targetName = path.node.left.object.object.name;
        const functionName = path.node.left.property.name;

        if (path.node.left.computed) {
          // we cannot know the name of computed properties unless we find out what the identifier refers to
          // see line 136 of Axios.js as example
          // Axios.prototype[method] = ?
          return;
        }

        if (functionName === "method") {
          throw new Error("Invalid functionName");
        }

        if (this._functionMap.has(targetName)) {
          // modify original
          this._functionMap.get(targetName).get(targetName).type =
            ActionType.CONSTRUCTOR;
          this._functionMap.get(targetName).get(targetName).isConstructor =
            true;
        } else {
          this._createMaps(targetName);

          // modify original
          // but there is no original so... no constructor?
        }

        // TODO this one is probably wrong

        this._functionMap.get(targetName).set(functionName, {
          scope: scope,
          name: functionName,
          type:
            functionName === "constructor"
              ? ActionType.CONSTRUCTOR
              : ActionType.METHOD,
          visibility: VisibilityType.PUBLIC,
          isConstructor: functionName === "constructor",
          parameters: path.node.right.params.map((x) => this._extractParam(x)),
          returnParameter: {
            name: "returnValue",
            typeProbabilityMap: new TypeProbability(), // TODO unknown because javascript! (check how this looks in typescript)
          },
          isStatic: path.node.right.static,
          isAsync: path.node.right.async,
        });
        return;
      } else {
        targetName = path.node.left.object.name;
        const functionName = path.node.left.property.name;

        if (path.node.left.computed) {
          // we cannot know the name of computed properties unless we find out what the identifier refers to
          // see line 136 of Axios.js as example
          // Axios.prototype[method] = ?
          return;
        }

        if (functionName === "method") {
          throw new Error("Invalid functionName");
        }

        if (!this._functionMap.has(targetName)) {
          this._createMaps(targetName);

          // modify original
          // but there is no original so... no constructor?
        }

        if (this.functionMap.get(targetName).has(targetName)) {
          // modify original
          this._functionMap.get(targetName).get(targetName).type =
            ActionType.CONSTRUCTOR;
          this._functionMap.get(targetName).get(targetName).isConstructor =
            true;
        }

        // TODO this one is probably wrong

        this._functionMap.get(targetName).set(functionName, {
          scope: scope,
          name: functionName,
          type: ActionType.METHOD,
          visibility: VisibilityType.PUBLIC,
          isConstructor: false,
          parameters: path.node.right.params.map((x) => this._extractParam(x)),
          returnParameter: {
            name: "returnValue",
            typeProbabilityMap: new TypeProbability(), // TODO unknown because javascript! (check how this looks in typescript)
          },
          isStatic: path.node.right.static,
          isAsync: path.node.right.async,
        });
        return;
      }
    } else if (path.node.left.type === "Identifier") {
      targetName = path.node.left.name;
    } else {
      throw new Error("unknown function expression name");
    }

    if (!this.targetMap.has(targetName)) {
      this._createMaps(targetName);
    }

    this._functionMap.get(targetName).set(targetName, {
      scope: scope,
      name: targetName,
      type: ActionType.FUNCTION,
      visibility: VisibilityType.PUBLIC,
      isConstructor: false,
      parameters: path.node.right.params.map((x) => this._extractParam(x)),
      returnParameter: {
        name: "returnValue",
        typeProbabilityMap: new TypeProbability(), // TODO unknown because javascript! (check how this looks in typescript)
      },
      isStatic: path.node.right.static,
      isAsync: path.node.right.async,
    });
  };

  _extractParam(parameter: t.Node): IdentifierDescription {
    if (parameter.type === "RestElement") {
      // TODO this can actually be an infinite amount of arguments...
      return this._extractParam(parameter.argument);
    }

    if (parameter.type === "AssignmentPattern") {
      return this._extractParam(parameter.left);
    }

    if (parameter.type === "ObjectPattern") {
      const typeProbability = new TypeProbability();

      const object: ComplexObject = {
        name: "objectPattern",
        properties: new Set(
          parameter.properties.map(
            (x) =>
              this._extractParam(
                x.type === "ObjectProperty" ? x.key : x.argument
              ).name
          )
        ), // TODO resolve these types
        functions: new Set(),
      };

      typeProbability.addType("object", 1, object);
      return {
        name: `objectPattern`,
        typeProbabilityMap: typeProbability,
      };
    }

    if (parameter.type === "ArrayPattern") {
      const typeProbability = new TypeProbability();

      const object: ComplexObject = {
        name: "arrayPattern",
        properties: new Set(
          parameter.elements.map((x) => this._extractParam(x).name)
        ), // TODO resolve these types
        functions: new Set(),
      };

      typeProbability.addType("array", 1, object);

      return {
        name: `arrayPattern`,
        typeProbabilityMap: typeProbability,
      };
    }

    if (parameter.type === "Identifier") {
      return {
        name: parameter.name,
        typeProbabilityMap: undefined,
      };
    }

    throw new Error(
      `Unknown param ${JSON.stringify(parameter)}\n ${this.filePath}`
    );
  }

  private _isExported(path: NodePath<t.Node>): boolean {
    if (path.parent.type === "ExportNamedDeclaration") {
      return true;
    } else if (path.parent.type === "ExportDefaultDeclaration") {
      return true;
    }

    return false;
  }

  private _isDefaultExported(path: NodePath<t.Node>): boolean {
    if (path.parent.type === "ExportDefaultDeclaration") {
      return true;
    }

    return false;
  }

  private _getExportInformation(path: NodePath<t.Node>): ExportInformation {
    const exportInformation: ExportInformation = {
      isExported: false,
      isDefaultExported: false,
      isModuleExported: false,
    };

    if (path.parent.type === "ExportNamedDeclaration") {
      exportInformation.isExported = true;
    } else if (path.parent.type === "ExportDefaultDeclaration") {
      exportInformation.isExported = true;
      exportInformation.isDefaultExported = true;
    }

    return exportInformation;
  }

  get subTargets(): SubTarget[] {
    return this._subTargets;
  }
}

type ExportInformation = {
  isExported: boolean;
  isDefaultExported: boolean;
  isModuleExported: boolean;
};
