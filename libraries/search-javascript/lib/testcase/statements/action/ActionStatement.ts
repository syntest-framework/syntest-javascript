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

import { Action } from "@syntest/analysis-javascript";
import { Encoding, EncodingSampler, shouldNeverHappen } from "@syntest/search";

import { Statement } from "../Statement";

/**
 * ActionStatement
 */
export abstract class ActionStatement extends Statement {
  protected _action: Action;
  private _children: Statement[];
  private _parent: Statement | undefined

  protected constructor(
    variableIdentifier: string,
    typeIdentifier: string,
    name: string,
    uniqueId: string,
    action: Action,
    children: Statement[],
    parent?: Statement | undefined
  ) {
    super(variableIdentifier, typeIdentifier, name, uniqueId);
    this._action = action;
    this._children = children;
    this._parent = parent

    for (const child of children) {
      if (!child) {
        throw new Error("Invalid arg")
      }
    }
  }

  abstract override mutate(
    sampler: EncodingSampler<Encoding>,
    depth: number
  ): ActionStatement;

  abstract override copy(): ActionStatement;

  hasChildren(): boolean {
    return this._children.length > 0 || !this._parent;
  }

  getChildren(): Statement[] {
    const children = [...this._children]
    if (this._parent) {
      children.push(this._parent)
    }
    return children;
  }

  override setChild(index: number, newChild: Statement) {
    if (!newChild) {
      throw new Error("Invalid new child!");
    }

    if (index < 0 || index > this.children.length) {
      throw new Error(shouldNeverHappen(`Invalid index used index: ${index}`));
    }

    if (index === this.children.length && !this.parent) {
      throw new Error(shouldNeverHappen(`Invalid index used index: ${index}`));
    }

    if (index === this.children.length) {
      this._parent = newChild;
    } else {
      this._children[index] = newChild;
    }
  }

  get action() {
    return this._action;
  }

  protected get parent(): Statement {
    return this._parent
  }

  protected get children(): Statement[] {
    return this._children;
  }

  override get returnType(): string {
    return this.typeIdentifier
  }
}
