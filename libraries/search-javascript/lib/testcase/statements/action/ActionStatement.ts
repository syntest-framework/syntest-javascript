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

import { Encoding, EncodingSampler, shouldNeverHappen } from "@syntest/search";

import { Statement } from "../Statement";
import { Export } from "@syntest/analysis-javascript";
import { prng } from "@syntest/prng";

/**
 * @author Dimitri Stallenberg
 */
export abstract class ActionStatement extends Statement {
  private _args: Statement[];
  protected _export?: Export;

  protected constructor(
    variableIdentifier: string,
    typeIdentifier: string,
    name: string,
    type: string,
    uniqueId: string,
    arguments_: Statement[],
    export_?: Export
  ) {
    super(variableIdentifier, typeIdentifier, name, type, uniqueId);
    this._args = arguments_;
    this._export = export_;

    this._varName = "_" + this.generateVarName(name, type);
  }

  protected override generateVarName(name: string, type: string): string {
    // TODO should use return type
    if (this._export) {
      return name + "_" + this._export.name + "_" + prng.uniqueId(4);
    }

    return type.includes("<>")
      ? name + "_" + type.split("<>")[1] + "_" + prng.uniqueId(4)
      : name + "_" + type + "_" + prng.uniqueId(4);
  }

  abstract override mutate(
    sampler: EncodingSampler<Encoding>,
    depth: number
  ): ActionStatement;

  abstract override copy(): ActionStatement;

  setChild(index: number, newChild: Statement) {
    if (!newChild) {
      throw new Error("Invalid new child!");
    }

    if (index < 0 || index >= this.args.length) {
      throw new Error(shouldNeverHappen(`Invalid index used index: ${index}`));
    }

    this.args[index] = newChild;
  }

  hasChildren(): boolean {
    return this._args.length > 0;
  }

  getChildren(): Statement[] {
    return [...this._args];
  }

  protected get args(): Statement[] {
    return this._args;
  }

  get export() {
    return this._export;
  }
}
