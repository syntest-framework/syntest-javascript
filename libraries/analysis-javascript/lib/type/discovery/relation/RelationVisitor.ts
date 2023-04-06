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
import { Relation, RelationType, getRelationType } from "../relation/Relation";

export class RelationVisitor extends AbstractSyntaxTreeVisitor {
  private _relationMap: Map<string, Relation>;

  get relationMap(): Map<string, Relation> {
    return this._relationMap;
  }

  constructor(filePath: string) {
    super(filePath);
    this._relationMap = new Map();
  }

  private _createRelation(
    path: NodePath<t.Node>,
    type: RelationType,
    involved: NodePath<t.Node>[],
    computed = false
  ) {
    const relation: Relation = {
      id: this._getNodeId(path),
      relation: type,
      involved: involved.map((p) => {
        if (p === undefined || p === null) {
          return "anonymous"; // TODO we should look into this
        }
        return this._getNodeId(p);
      }),
      computed,
    };

    this._relationMap.set(relation.id, relation);
  }
  // special
  public ReturnStatement: (path: NodePath<t.ReturnStatement>) => void = (
    path
  ) => {
    const type = RelationType.Return;

    // get the function id
    const functionPath = path.findParent((p) => p.isFunction());
    this._createRelation(path, type, [functionPath, path.get("argument")]);
  };

  public CallExpression: (path: NodePath<t.CallExpression>) => void = (
    path
  ) => {
    const type = RelationType.Call;
    this._createRelation(path, type, [
      path.get("callee"),
      ...path.get("arguments"),
    ]);
  };

  public PrivateName: (path: NodePath<t.PrivateName>) => void = (path) => {
    const type = RelationType.PrivateName;
    this._createRelation(path, type, [path.get("id")]);
  };

  public ObjectProperty: (path: NodePath<t.ObjectProperty>) => void = (
    path
  ) => {
    const type = RelationType.ObjectProperty;
    this._createRelation(
      path,
      type,
      [path.get("key"), path.get("value")],
      path.node.computed
    );
  };

  public ObjectMethod: (path: NodePath<t.ObjectMethod>) => void = (path) => {
    const type = RelationType.ObjectMethod;
    this._createRelation(
      path,
      type,
      [path.get("key"), ...path.get("params")],
      path.node.computed
    );
  };

  public ClassProperty: (path: NodePath<t.ClassProperty>) => void = (path) => {
    if (path.node.static) {
      this._createRelation(
        path,
        RelationType.StaticClassProperty,
        [path.get("key"), path.get("value")],
        path.node.computed
      );
    } else {
      this._createRelation(
        path,
        RelationType.ClassProperty,
        [path.get("key"), path.get("value")],
        path.node.computed
      );
    }
  };

  public ClassMethod: (path: NodePath<t.ClassMethod>) => void = (path) => {
    switch (path.node.kind) {
      case "constructor": {
        this._createRelation(
          path,
          RelationType.ClassConstructor,
          [path.get("key"), ...path.get("params")],
          path.node.computed
        );
        break;
      }
      case "get": {
        this._createRelation(
          path,
          RelationType.ClassGetter,
          [path.get("key")],
          path.node.computed
        );
        break;
      }
      case "set": {
        this._createRelation(
          path,
          RelationType.ClassSetter,
          [path.get("key"), ...path.get("params")],
          path.node.computed
        );
        break;
      }
      default: {
        if (path.node.static && path.node.async) {
          this._createRelation(
            path,
            RelationType.StaticAsyncClassMethod,
            [path.get("key"), ...path.get("params")],
            path.node.computed
          );
        } else if (path.node.static) {
          this._createRelation(
            path,
            RelationType.StaticClassMethod,
            [path.get("key"), ...path.get("params")],
            path.node.computed
          );
        } else if (path.node.async) {
          this._createRelation(
            path,
            RelationType.AsyncClassMethod,
            [path.get("key"), ...path.get("params")],
            path.node.computed
          );
        } else {
          this._createRelation(
            path,
            RelationType.ClassMethod,
            [path.get("key"), ...path.get("params")],
            path.node.computed
          );
        }
      }
    }
  };

  public ArrayPattern: (path: NodePath<t.ArrayPattern>) => void = (path) => {
    const type = RelationType.ArrayPattern;
    this._createRelation(path, type, path.get("elements"));
  };

  public ObjectPattern: (path: NodePath<t.ObjectPattern>) => void = (path) => {
    const type = RelationType.ObjectPattern;
    this._createRelation(path, type, path.get("properties"));
  };

  public RestElement: (path: NodePath<t.RestElement>) => void = (path) => {
    const type = RelationType.RestElement;
    this._createRelation(path, type, [path.get("argument")]);
  };

  // primary expression
  public ThisExpression: (path: NodePath<t.ThisExpression>) => void = (
    path
  ) => {
    const type = RelationType.This;

    let parent = path.getFunctionParent();

    if (parent === undefined || parent === null) {
      throw new Error("ThisExpression must be inside a function");
    }

    while (parent.isArrowFunctionExpression()) {
      // arrow functions are not thisable
      parent = parent.getFunctionParent();

      if (parent === undefined || parent === null) {
        throw new Error("ThisExpression must be inside a function");
      }
    }

    if (parent.isClassMethod()) {
      const classParent = path.findParent((p) => p.isClass());
      if (classParent === undefined || classParent === null) {
        throw new Error("ThisExpression must be inside a class");
      }
      this._createRelation(path, type, [classParent]);
    } else {
      this._createRelation(path, type, [parent]);
    }
  };

  public ArrayExpression: (path: NodePath<t.ArrayExpression>) => void = (
    path
  ) => {
    const type = RelationType.ArrayInitializer;
    this._createRelation(path, type, path.get("elements"));
  };

  public ObjectExpression: (path: NodePath<t.ObjectExpression>) => void = (
    path
  ) => {
    const type = RelationType.ObjectInitializer;
    this._createRelation(path, type, path.get("properties"));
  };

  public FunctionExpression: (path: NodePath<t.FunctionExpression>) => void = (
    path
  ) => {
    if (path.node.generator && path.node.async) {
      this._createRelation(path, RelationType.AsyncFunctionStarDefinition, [
        path.get("id"),
        ...path.get("params"),
      ]);
    } else if (path.node.generator) {
      this._createRelation(path, RelationType.FunctionStarDefinition, [
        path.get("id"),
        ...path.get("params"),
      ]);
    } else if (path.node.async) {
      this._createRelation(path, RelationType.AsyncFunctionDefinition, [
        path.get("id"),
        ...path.get("params"),
      ]);
    } else {
      this._createRelation(path, RelationType.FunctionDefinition, [
        path.get("id"),
        ...path.get("params"),
      ]);
    }
  };

  public FunctionDeclaration: (path: NodePath<t.FunctionDeclaration>) => void =
    (path) => {
      if (path.node.generator && path.node.async) {
        this._createRelation(path, RelationType.AsyncFunctionStarDefinition, [
          path.get("id"),
          ...path.get("params"),
        ]);
      } else if (path.node.generator) {
        this._createRelation(path, RelationType.FunctionStarDefinition, [
          path.get("id"),
          ...path.get("params"),
        ]);
      } else if (path.node.async) {
        this._createRelation(path, RelationType.AsyncFunctionDefinition, [
          path.get("id"),
          ...path.get("params"),
        ]);
      } else {
        this._createRelation(path, RelationType.FunctionDefinition, [
          path.get("id"),
          ...path.get("params"),
        ]);
      }
    };

  public ArrowFunctionExpression: (
    path: NodePath<t.ArrowFunctionExpression>
  ) => void = (path) => {
    const type = RelationType.FunctionDefinition;
    this._createRelation(path, type, [undefined, ...path.get("params")]);
  };

  public ClassExpression: (path: NodePath<t.ClassExpression>) => void = (
    path
  ) => {
    const type = RelationType.ClassDefinition;
    this._createRelation(path, type, [
      path.get("id"),
      ...path.get("body").get("body"),
    ]);
  };

  public ClassDeclaration: (path: NodePath<t.ClassDeclaration>) => void = (
    path
  ) => {
    const type = RelationType.ClassDefinition;
    this._createRelation(path, type, [path.get("id")]);
  };

  public TemplateLiteral: (path: NodePath<t.TemplateLiteral>) => void = (
    path
  ) => {
    const type = RelationType.TemplateLiteral;
    this._createRelation(path, type, [
      ...path.get("quasis"),
      ...path.get("expressions"),
    ]);
  };

  public SequenceExpression: (path: NodePath<t.SequenceExpression>) => void = (
    path
  ) => {
    const type = RelationType.Sequence;
    this._createRelation(path, type, path.get("expressions"));
  };

  // left-hand-side expression
  public MemberExpression: (path: NodePath<t.MemberExpression>) => void = (
    path
  ) => {
    const type = RelationType.PropertyAccessor;
    this._createRelation(
      path,
      type,
      [path.get("object"), path.get("property")],
      path.node.computed
    );
  };

  public OptionalMemberExpression: (
    path: NodePath<t.OptionalMemberExpression>
  ) => void = (path) => {
    const type = RelationType.OptionalPropertyAccessor;
    this._createRelation(
      path,
      type,
      [path.get("object"), path.get("property")],
      path.node.computed
    );
  };

  public MetaProperty: (path: NodePath<t.MetaProperty>) => void = (path) => {
    const type = RelationType.PropertyAccessor;
    this._createRelation(path, type, [path.get("meta"), path.get("property")]);
  };

  public NewExpression: (path: NodePath<t.NewExpression>) => void = (path) => {
    const type = RelationType.New;
    this._createRelation(path, type, [
      path.get("callee"),
      ...path.get("arguments"),
    ]);
  };

  // UNARY
  // increment and decrement
  public UpdateExpression: (path: NodePath<t.UpdateExpression>) => void = (
    path
  ) => {
    const type = getRelationType(
      "update",
      path.node.operator,
      path.node.prefix
    );
    this._createRelation(path, type, [path.get("argument")]);
  };

  // unary
  public UnaryExpression: (path: NodePath<t.UnaryExpression>) => void = (
    path
  ) => {
    const type = getRelationType("unary", path.node.operator, path.node.prefix);
    this._createRelation(path, type, [path.get("argument")]);
  };

  public AwaitExpression: (path: NodePath<t.AwaitExpression>) => void = (
    path
  ) => {
    const type = RelationType.Await;
    this._createRelation(path, type, [path.get("argument")]);
  };

  // binary
  public BinaryExpression: (path: NodePath<t.BinaryExpression>) => void = (
    path
  ) => {
    const type = getRelationType("binary", path.node.operator);
    this._createRelation(path, type, [path.get("left"), path.get("right")]);
  };

  public LogicalExpression: (path: NodePath<t.LogicalExpression>) => void = (
    path
  ) => {
    const type = getRelationType("binary", path.node.operator);
    this._createRelation(path, type, [path.get("left"), path.get("right")]);
  };

  // ternary
  public ConditionalExpression: (
    path: NodePath<t.ConditionalExpression>
  ) => void = (path) => {
    const type = RelationType.Conditional;
    this._createRelation(path, type, [
      path.get("test"),
      path.get("consequent"),
      path.get("alternate"),
    ]);
  };

  // assignment
  public AssignmentExpression: (
    path: NodePath<t.AssignmentExpression>
  ) => void = (path) => {
    const type = getRelationType("assignment", path.node.operator);
    this._createRelation(path, type, [path.get("left"), path.get("right")]);
  };

  public AssignmentPattern: (path: NodePath<t.AssignmentPattern>) => void = (
    path
  ) => {
    const type = RelationType.Assignment;
    this._createRelation(path, type, [path.get("left"), path.get("right")]);
  };

  public VariableDeclarator: (path: NodePath<t.VariableDeclarator>) => void = (
    path
  ) => {
    const type = RelationType.Assignment;
    this._createRelation(path, type, [path.get("id"), path.get("init")]);
  };

  // TODO yield
  // spread
  public SpreadElement: (path: NodePath<t.SpreadElement>) => void = (path) => {
    const type = RelationType.Spread;
    this._createRelation(path, type, [path.get("argument")]);
  };

  // TODO comma
}
