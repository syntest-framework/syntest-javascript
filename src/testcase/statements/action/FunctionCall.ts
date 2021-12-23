/*
 * Copyright 2020-2021 Delft University of Technology and SynTest contributors
 *
 * This file is part of SynTest Solidity.
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

import { ConstructorCall } from "./ConstructorCall";

import {
  Statement,
  ActionStatement,
  TestCaseSampler,
  prng,
  Properties,
  Parameter,
} from "@syntest/framework";
import { JavaScriptTestCaseSampler } from "../../sampling/JavaScriptTestCaseSampler";

/**
 * @author Dimitri Stallenberg
 */
export class FunctionCall extends ActionStatement {
  private readonly _functionName: string;

  private readonly _parent: ConstructorCall;

  /**
   * Constructor
   * @param types the return types of the function
   * @param uniqueId id of the gene
   * @param instance the object to call the function on
   * @param functionName the name of the function
   * @param args the arguments of the function
   */
  constructor(
    types: Parameter[],
    uniqueId: string,
    instance: ConstructorCall,
    functionName: string,
    args: Statement[]
  ) {
    super(types, uniqueId, [...args]);
    this._parent = instance;
    this._functionName = functionName;
  }

  mutate(sampler: JavaScriptTestCaseSampler, depth: number): FunctionCall {
    if (prng.nextBoolean(Properties.resample_gene_probability)) {
      // resample the gene
      return <FunctionCall>(
        sampler.sampleStatement(depth, this.types, "functionCall")
      );
    } else {
      const args = [...this.args.map((a: Statement) => a.copy())];
      if (args.length === 0) return this;

      const index = prng.nextInt(0, args.length - 1);
      args[index] = args[index].mutate(sampler, depth + 1);

      const instance = this._parent;
      return new FunctionCall(
        this.types,
        this.id,
        instance,
        this.functionName,
        args
      );
    }
  }

  copy() {
    const deepCopyArgs = [...this.args.map((a: Statement) => a.copy())];

    return new FunctionCall(
      this.types,
      this.id,
      this._parent,
      this.functionName,
      deepCopyArgs
    );
  }

  hasChildren(): boolean {
    // since every object function call has an instance there must be atleast one child
    return true;
  }

  getChildren(): Statement[] {
    return [...this.args];
  }

  getParent(): ConstructorCall {
    return this._parent;
  }

  get functionName(): string {
    return this._functionName;
  }
}