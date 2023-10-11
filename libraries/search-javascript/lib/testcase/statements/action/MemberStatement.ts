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
 * MemberStatement
 */
export class MemberStatement extends ActionStatement {
  private key: string

  constructor(
    variableIdentifier: string,
    typeIdentifier: string,
    name: string,
    uniqueId: string,
    action: Action,
    parent: Statement,
    key: string
  ) {
    super(
      variableIdentifier,
      typeIdentifier,
      name,
      uniqueId,
      action,
      [],
      parent
    );
    this.key = key
  }

  mutate(sampler: JavaScriptTestCaseSampler, depth: number): MemberStatement {
    return prng.nextBoolean(sampler.deltaMutationProbability) ? new MemberStatement(
        this.variableIdentifier,
        this.typeIdentifier,
        this.name,
        prng.uniqueId(),
        this.action,
        this.parent.mutate(sampler, depth + 1),
        this.key
      ) : sampler.sampleMemberStatement(
        depth,
        this.action,
        this.key
      );
  }

  copy(): MemberStatement {
    return new MemberStatement(
      this.variableIdentifier,
      this.typeIdentifier,
      this.name,
      this.uniqueId,
      this.action,
      this.parent.copy(),
      this.key
    );
  }

  decode(context: ContextBuilder): Decoding[] {
    return [
      ...this.parent.decode(context),
      {
        variableName: context.getOrCreateVariableName(
            this
          ),
        decoded: `${context.getOrCreateVariableName(this.parent)}.${this.name}`,
        reference: this,
      },
    ];
  }

  override get type(): TypeEnum {
    return TypeEnum.NULL
  }
}
