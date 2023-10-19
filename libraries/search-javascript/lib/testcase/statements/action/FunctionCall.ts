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

import { Action, TypeEnum } from "@syntest/analysis-javascript";
import { prng } from "@syntest/prng";

import { ContextBuilder } from "../../../testbuilding/ContextBuilder";
import { JavaScriptTestCaseSampler } from "../../sampling/JavaScriptTestCaseSampler";
import { Decoding, Statement } from "../Statement";

import { ActionStatement } from "./ActionStatement";

/**
 * FunctionCall
 */
export class FunctionCall extends ActionStatement {

  constructor(
    variableIdentifier: string,
    typeIdentifier: string,
    name: string,
    uniqueId: string,
    action: Action,
    arguments_: Statement[],
    parent: Statement
  ) {
    super(
      variableIdentifier,
      typeIdentifier,
      name,
      uniqueId,
      action,
      arguments_,
      parent
    );
  }

  mutate(sampler: JavaScriptTestCaseSampler, depth: number): FunctionCall {
    // replace entire function call
    const arguments_ = this.children.map((a: Statement) => a.copy());

      let parent = this.parent.copy()
      const index = prng.nextInt(0, arguments_.length)
  
      if (index < arguments_.length) {
        arguments_[index] = arguments_[index].mutate(sampler, depth + 1);
      } else {
        parent = parent.mutate(sampler, depth + 1)
      }
  
      return new FunctionCall(
        this.variableIdentifier,
        this.typeIdentifier,
        this.name,
        prng.uniqueId(),
        this.action,
        arguments_,
        parent
      );
    
  }

  copy(): FunctionCall {
    const deepCopyArguments = this.children.map((a: Statement) => a.copy());

    return new FunctionCall(
      this.variableIdentifier,
      this.typeIdentifier,
      this.name,
      this.uniqueId,
      this.action,
      deepCopyArguments,
      this.parent.copy()
    );
  }

  decode(context: ContextBuilder): Decoding[] {
      const objectDecoding = this.parent.decode(context)

      const argumentDecoding: Decoding[] = this.children.flatMap((a) =>
        a.decode(context)
      );

      const arguments_ = this.children
        .map((a) => context.getOrCreateVariableName(a))
        .join(", ");

      const decoded = `await ${context.getOrCreateVariableName(this.parent)}(${arguments_})`;

      return [
        ...objectDecoding,
        ...argumentDecoding,
        {
          variableName: context.getOrCreateVariableName(
            this
          ),
          decoded: decoded,
          reference: this,
        },
      ];
  }

  override get type(): TypeEnum {
    return TypeEnum.FUNCTION
  }
}
