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

import {
  Statement,
  ActionStatement,
  prng,
  Parameter,
  EncodingSampler, TestCaseSampler,
} from "@syntest/framework";
import { JavaScriptTestCase } from "../../JavaScriptTestCase";
import { JavaScriptTestCaseSampler } from "../../sampling/JavaScriptTestCaseSampler";

/**
 * @author Dimitri Stallenberg
 */
export class ConstructorCall extends ActionStatement {
  get constructorName(): string {
    return this._constructorName;
  }

  private readonly _constructorName: string;
  private readonly _calls: ActionStatement[];

  /**
   * Constructor
   * @param types the return types of the constructor
   * @param uniqueId optional argument
   * @param constructorName the name of the constructor
   * @param args the arguments of the constructor
   * @param calls the methods calls of the constructor
   */
  constructor(
    types: Parameter[],
    uniqueId: string,
    constructorName: string,
    args: Statement[],
    calls: ActionStatement[]
  ) {
    super(types, uniqueId, args);
    this._constructorName = constructorName;
    this._calls = calls;
  }

  mutate(sampler: JavaScriptTestCaseSampler, depth: number) {
    if (this.args.length > 0) {
      const args = [...this.args.map((a: Statement) => a.copy())];
      const index = prng.nextInt(0, args.length - 1);
      if (args[index] !== undefined)
        args[index] = args[index].mutate(sampler, depth + 1);
    }

    let changed = false;
    if (
      prng.nextDouble(0, 1) <= 1.0 / 3.0 &&
      this.getMethodCalls().length > 1
    ) {
      this.deleteMethodCall();
      changed = true;
    }
    if (prng.nextDouble(0, 1) <= 1.0 / 3.0) {
      this.replaceMethodCall(sampler, depth);
      changed = true;
    }
    if (prng.nextDouble(0, 1) <= 1.0 / 3.0) {
      this.addMethodCall(sampler, depth);
      changed = true;
    }

    if (!this.hasMethodCalls()) {
      this.addMethodCall(sampler, depth);
      changed = true;
    }

    if (!changed) {
      this.replaceMethodCall(sampler, depth);
      this.addMethodCall(sampler, depth);
    }

    return this;
  }

  protected addMethodCall(
    sampler: JavaScriptTestCaseSampler,
    depth: number,
  ) {
    let count = 0;
    while (prng.nextDouble(0, 1) <= Math.pow(0.5, count) && count < 10) {
      const index = prng.nextInt(0, this._calls.length);

      // get a random test case and we extract one of its method call
      // ugly solution for now. But we have to fix with proper refactoring
      this._calls.splice(
        index,
        0,
        sampler.sampleFunctionCall(depth, this)
      );

      count++;
    }
  }

  protected replaceMethodCall(
    sampler: TestCaseSampler,
    depth: number,
  ) {
    if (this.hasMethodCalls()) {
      const calls = this.getMethodCalls();
      const index = prng.nextInt(0, calls.length - 1);
      this.setMethodCall(index, calls[index].mutate(sampler, depth));
    }
  }

  protected deleteMethodCall() {
    if (this.hasMethodCalls()) {
      const calls = this.getMethodCalls();
      const index = prng.nextInt(0, calls.length - 1);
      this._calls.splice(index, 1);
    }
  }

  copy() {
    const deepCopyArgs = [...this.args.map((a: Statement) => a.copy())];
    const deepCopyCalls = [
      ...this._calls.map((a: ActionStatement) => a.copy()),
    ];
    return new ConstructorCall(
      this.types,
      this.id,
      this.constructorName,
      deepCopyArgs,
      deepCopyCalls
    );
  }

  getMethodCalls(): ActionStatement[] {
    return [...this._calls];
  }

  setMethodCall(index: number, call: ActionStatement) {
    this._calls[index] = call;
  }

  hasMethodCalls(): boolean {
    return this._calls.length > 0;
  }
}