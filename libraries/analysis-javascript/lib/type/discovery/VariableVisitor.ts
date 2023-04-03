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
import {
  AbstractSyntaxTreeVisitor,
  Element,
  ElementType,
  getElementId,
} from "@syntest/ast-visitor-javascript";

import { getRelationType, Relation, RelationType } from "./Relation";

// TODO return
export class VariableVisitor extends AbstractSyntaxTreeVisitor {
  private _relations: Relation[];
  private _wrapperElementIsRelation: Map<string, Relation>;

  private _elementStore: Map<string, Element>;

  get wrapperElementIsRelation(): Map<string, Relation> {
    return this._wrapperElementIsRelation;
  }

  get elements(): Element[] {
    const _elements: Set<Element> = new Set<Element>();

    // todo maybe not return relation elements
    for (const relation of this.relations) {
      for (const element of relation.involved) {
        _elements.add(element);
      }
    }

    return [..._elements];
  }

  get relations(): Relation[] {
    return this._relations;
  }

  constructor(filePath: string) {
    super(filePath);
    this._relations = [];
    this._wrapperElementIsRelation = new Map<string, Relation>();

    this._elementStore = new Map<string, Element>();
  }

  // context

  public ClassMethod: (path: NodePath<t.ClassMethod>) => void = (path) => {
    if (path.node.kind === "constructor") {
      // TODO
      return;
    }

    const involved: Element[] = [this._getElement(path.get("key"))];

    for (const parameter of path.get("params")) {
      involved.push(this._getElement(parameter));
    }

    const relation: Relation = {
      relation: RelationType.FunctionDefinition,
      involved: involved,
    };

    this.relations.push(relation);
    this._wrapperElementIsRelation.set(
      `%-${this.filePath}-${path.node.start}-${path.node.end}`,
      relation
    );
  };

  public FunctionDeclaration: (path: NodePath<t.FunctionDeclaration>) => void =
    (path) => {
      const involved: Element[] = [this._getElement(path.get("id"))];

      for (const parameter of path.get("params")) {
        involved.push(this._getElement(parameter));
      }

      const relation: Relation = {
        relation: RelationType.FunctionDefinition,
        involved: involved,
      };

      this.relations.push(relation);
      this._wrapperElementIsRelation.set(
        `%-${this.filePath}-${path.node.start}-${path.node.end}`,
        relation
      );
    };

  public ArrowFunctionExpression: (
    path: NodePath<t.ArrowFunctionExpression>
  ) => void = (path) => {
    const involved: Element[] = [this._getElement(path)];

    for (const parameter of path.get("params")) {
      involved.push(this._getElement(parameter));
    }

    const relation: Relation = {
      relation: RelationType.FunctionDefinition,
      involved: involved,
    };

    this.relations.push(relation);
    this._wrapperElementIsRelation.set(
      `%-${this.filePath}-${path.node.start}-${path.node.end}`,
      relation
    );
  };

  public FunctionExpression: (path: NodePath<t.FunctionExpression>) => void = (
    path
  ) => {
    const involved: Element[] = [this._getElement(path)];

    for (const parameter of path.get("params")) {
      involved.push(this._getElement(parameter));
    }

    const relation: Relation = {
      relation: RelationType.FunctionDefinition,
      involved: involved,
    };

    this.relations.push(relation);
    this._wrapperElementIsRelation.set(
      `%-${this.filePath}-${path.node.start}-${path.node.end}`,
      relation
    );
  };

  public ClassExpression: (path: NodePath<t.ClassExpression>) => void = (
    path
  ) => {
    const involved: Element[] = [this._getElement(path)];

    const relation: Relation = {
      relation: RelationType.ClassDefinition,
      involved: involved,
    };

    this.relations.push(relation);
    this._wrapperElementIsRelation.set(
      `%-${this.filePath}-${path.node.start}-${path.node.end}`,
      relation
    );
  };

  public CallExpression: (path: NodePath<t.CallExpression>) => void = (
    path
  ) => {
    const relation: Relation = {
      relation: RelationType.Call,
      involved: [
        this._getElement(path.get("callee")),
        ...path.get("arguments").map((a) => {
          return this._getElement(a);
        }),
      ],
    };

    this._wrapperElementIsRelation.set(
      `%-${this.filePath}-${path.node.start}-${path.node.end}`,
      relation
    );
    this.relations.push(relation);
  };

  public VariableDeclarator: (path: NodePath<t.VariableDeclarator>) => void = (
    path
  ) => {
    if (!path.node.init) {
      // if the variable is not instantiated we skip it
      return;
    }
    const relation: Relation = {
      relation: getRelationType("assignment", "="),
      involved: [
        this._getElement(path.get("id")),
        this._getElement(path.get("init")),
      ],
    };

    this._wrapperElementIsRelation.set(
      `%-${this.filePath}-${path.node.start}-${path.node.end}`,
      relation
    );
    this.relations.push(relation);
  };

  // operations
  // public ReturnStatement: (path) => void = (path) => {
  //   // get the name of the function that we are returning
  //   const functionScope = [...this._currentScopeStack].reverse().find((s) => s.identifierDescription === ScopeType.Method || s.identifierDescription === ScopeType.FUNCTION)
  //   // get the corresponding variable of the function
  //   const variable = this._getVariableInScope(functionScope.name)
  //
  //   variable.usage.push({
  //     identifierDescription: UsageType.Return,
  //     operation: "",
  //     usedVariable: `${path.node.argument.start}-${path.node.argument.end}`
  //   })
  // }

  // unary
  public UnaryExpression: (path: NodePath<t.UnaryExpression>) => void = (
    path
  ) => {
    const relation: Relation = {
      relation: getRelationType("unary", path.node.operator, path.node.prefix),
      involved: [this._getElement(path.get("argument"))],
    };

    this._wrapperElementIsRelation.set(
      `%-${this.filePath}-${path.node.start}-${path.node.end}`,
      relation
    );
    this.relations.push(relation);
  };

  public UpdateExpression: (path: NodePath<t.UpdateExpression>) => void = (
    path
  ) => {
    const relation: Relation = {
      relation: getRelationType("unary", path.node.operator),
      involved: [this._getElement(path.get("argument"))],
    };

    this._wrapperElementIsRelation.set(
      `%-${this.filePath}-${path.node.start}-${path.node.end}`,
      relation
    );
    this.relations.push(relation);
  };

  public RestElement: (path: NodePath<t.RestElement>) => void = (path) => {
    const relation: Relation = {
      relation: RelationType.Spread,
      involved: [this._getElement(path.get("argument"))],
    };

    this._wrapperElementIsRelation.set(
      `%-${this.filePath}-${path.node.start}-${path.node.end}`,
      relation
    );
    this.relations.push(relation);
  };

  public ArrayExpression: (path: NodePath<t.ArrayExpression>) => void = (
    path
  ) => {
    const relation: Relation = {
      relation: RelationType.Array,
      involved: path.get("elements").map((element) => {
        if (!element.node) {
          return {
            type: ElementType.NullConstant,
            // eslint-disable-next-line unicorn/no-null
            value: null,
          };
        }
        return this._getElement(element);
      }),
    };

    this._wrapperElementIsRelation.set(
      `%-${this.filePath}-${path.node.start}-${path.node.end}`,
      relation
    );
    this.relations.push(relation);
  };

  public ObjectExpression: (path: NodePath<t.ObjectExpression>) => void = (
    path
  ) => {
    const relation: Relation = {
      relation: RelationType.Object,
      involved: path.get("properties").map((property) => {
        return this._getElement(property);
      }),
    };

    this._wrapperElementIsRelation.set(
      `%-${this.filePath}-${path.node.start}-${path.node.end}`,
      relation
    );
    this.relations.push(relation);
  };

  public AssignmentExpression: (
    path: NodePath<t.AssignmentExpression>
  ) => void = (path) => {
    const relation: Relation = {
      relation: getRelationType("assignment", path.node.operator),
      involved: [
        this._getElement(path.get("left")),
        this._getElement(path.get("right")),
      ],
    };

    this._wrapperElementIsRelation.set(
      `%-${this.filePath}-${path.node.start}-${path.node.end}`,
      relation
    );
    this.relations.push(relation);
  };

  public AwaitExpression: (path: NodePath<t.AwaitExpression>) => void = (
    path
  ) => {
    const relation: Relation = {
      relation: RelationType.Await,
      involved: [this._getElement(path.get("argument"))],
    };

    this._wrapperElementIsRelation.set(
      `%-${this.filePath}-${path.node.start}-${path.node.end}`,
      relation
    );
    this.relations.push(relation);
  };

  // binary
  public BinaryExpression: (path: NodePath<t.BinaryExpression>) => void = (
    path
  ) => {
    const relation: Relation = {
      relation: getRelationType("binary", path.node.operator),
      involved: [
        this._getElement(path.get("left")),
        this._getElement(path.get("right")),
      ],
    };

    this._wrapperElementIsRelation.set(
      `%-${this.filePath}-${path.node.start}-${path.node.end}`,
      relation
    );
    this.relations.push(relation);
  };

  public LogicalExpression: (path: NodePath<t.LogicalExpression>) => void = (
    path
  ) => {
    const relation: Relation = {
      relation: getRelationType("binary", path.node.operator),
      involved: [
        this._getElement(path.get("left")),
        this._getElement(path.get("right")),
      ],
    };

    this._wrapperElementIsRelation.set(
      `%-${this.filePath}-${path.node.start}-${path.node.end}`,
      relation
    );
    this.relations.push(relation);
  };

  public MemberExpression: (path: NodePath<t.MemberExpression>) => void = (
    path
  ) => {
    // if (path.node.object.type === "ThisExpression") {
    //   // set the scope to the first "thisable" scope
    //   scope = this._scopes
    //     .reverse()
    //     .find((s) =>
    //       s.type === ScopeType.Object
    //       || s.type === ScopeType.Class
    //       || s.type === ScopeType.Function
    //     )
    // }

    const relation: Relation = {
      relation: RelationType.PropertyAccessor,
      involved: [
        this._getElement(path.get("object")),
        this._getElement(path.get("property")),
      ],
      computed: path.node.computed,
    };

    this._wrapperElementIsRelation.set(
      `%-${this.filePath}-${path.node.start}-${path.node.end}`,
      relation
    );
    this.relations.push(relation);
  };

  // ternary
  public ConditionalExpression: (
    path: NodePath<t.ConditionalExpression>
  ) => void = (path) => {
    const relation: Relation = {
      relation: RelationType.Conditional,
      involved: [
        this._getElement(path.get("test")),
        this._getElement(path.get("consequent")),
        this._getElement(path.get("alternate")),
      ],
    };

    this._wrapperElementIsRelation.set(
      `%-${this.filePath}-${path.node.start}-${path.node.end}`,
      relation
    );
    this.relations.push(relation);
  };

  public SpreadElement: (path: NodePath<t.SpreadElement>) => void = (path) => {
    const relation: Relation = {
      relation: RelationType.Spread,
      involved: [this._getElement(path.get("argument"))],
    };

    this._wrapperElementIsRelation.set(
      `%-${this.filePath}-${path.node.start}-${path.node.end}`,
      relation
    );
    this.relations.push(relation);
  };

  public NewExpression: (path: NodePath<t.NewExpression>) => void = (path) => {
    const relation: Relation = {
      relation: RelationType.New,
      involved: [
        this._getElement(path.get("callee")),
        ...path
          .get("arguments")
          .map((argument_) => this._getElement(argument_)),
      ],
    };

    this._wrapperElementIsRelation.set(
      `%-${this.filePath}-${path.node.start}-${path.node.end}`,
      relation
    );
    this.relations.push(relation);
  };

  public SequenceExpression: (path: NodePath<t.SequenceExpression>) => void = (
    path
  ) => {
    const relation: Relation = {
      relation: RelationType.Sequence,
      involved: path
        .get("expressions")
        .map((expression) => this._getElement(expression)),
    };

    this._wrapperElementIsRelation.set(
      `%-${this.filePath}-${path.node.start}-${path.node.end}`,
      relation
    );
    this.relations.push(relation);
  };

  public ObjectProperty: (path: NodePath<t.ObjectProperty>) => void = (
    path
  ) => {
    const relation: Relation = {
      relation: RelationType.ObjectProperty,
      involved: [
        this._getElement(path.get("key")),
        this._getElement(path.get("value")),
      ],
    };

    this._wrapperElementIsRelation.set(
      `%-${this.filePath}-${path.node.start}-${path.node.end}`,
      relation
    );
    this.relations.push(relation);
  };

  public ObjectMethod: (path: NodePath<t.ObjectMethod>) => void = (path) => {
    const involved: Element[] = [this._getElement(path.get("key"))];

    for (const parameter of path.get("params")) {
      involved.push(this._getElement(parameter));
    }

    const relation: Relation = {
      relation: RelationType.FunctionDefinition,
      involved: involved,
    };

    this._wrapperElementIsRelation.set(
      `%-${this.filePath}-${path.node.start}-${path.node.end}`,
      relation
    );
    this.relations.push(relation);
  };

  public AssignmentPattern: (path: NodePath<t.AssignmentExpression>) => void = (
    path
  ) => {
    const relation: Relation = {
      relation: RelationType.Assignment,
      involved: [
        this._getElement(path.get("left")),
        this._getElement(path.get("right")),
      ],
    };

    this._wrapperElementIsRelation.set(
      `%-${this.filePath}-${path.node.start}-${path.node.end}`,
      relation
    );
    this.relations.push(relation);
  };

  public ObjectPattern: (path: NodePath<t.ObjectPattern>) => void = (path) => {
    const relation: Relation = {
      relation: RelationType.Object,
      involved: path.get("properties").map((p) => this._getElement(p)),
    };

    this._wrapperElementIsRelation.set(
      `%-${this.filePath}-${path.node.start}-${path.node.end}`,
      relation
    );
    this.relations.push(relation);
  };

  public ArrayPattern: (path: NodePath<t.ArrayPattern>) => void = (path) => {
    const relation: Relation = {
      relation: RelationType.Array,
      involved: path.get("elements").map((element) => {
        if (!element.node) {
          return {
            type: ElementType.NullConstant,
            // eslint-disable-next-line unicorn/no-null
            value: null,
          };
        }
        return this._getElement(element);
      }),
    };

    this._wrapperElementIsRelation.set(
      `%-${this.filePath}-${path.node.start}-${path.node.end}`,
      relation
    );
    this.relations.push(relation);
  };

  public PrivateName: (path: NodePath<t.PrivateName>) => void = (path) => {
    const relation: Relation = {
      relation: RelationType.PrivateName,
      involved: [this._getElement(path.get("id"))],
    };

    this._wrapperElementIsRelation.set(
      `%-${this.filePath}-${path.node.start}-${path.node.end}`,
      relation
    );
    this.relations.push(relation);
  };

  public MetaProperty: (path: NodePath<t.MetaProperty>) => void = (path) => {
    const relation: Relation = {
      relation: RelationType.PropertyAccessor,
      involved: [
        this._getElement(path.get("meta")),
        this._getElement(path.get("property")),
      ],
    };

    this._wrapperElementIsRelation.set(
      `%-${this.filePath}-${path.node.start}-${path.node.end}`,
      relation
    );
    this.relations.push(relation);
  };

  _getElement(path: NodePath<t.Node>) {
    const element = super._getElement(path);
    const elementId = getElementId(element);

    if (!this._elementStore.has(elementId)) {
      this._elementStore.set(elementId, element);
    }

    return this._elementStore.get(elementId);
  }
}
