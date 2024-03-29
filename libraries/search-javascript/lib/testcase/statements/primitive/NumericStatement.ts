/*
 * Copyright 2020-2023 SynTest contributors
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

import { TypeEnum } from "@syntest/analysis-javascript";
import { prng } from "@syntest/prng";

import { JavaScriptTestCaseSampler } from "../../sampling/JavaScriptTestCaseSampler";
import { Statement } from "../Statement";

import { IntegerStatement } from "./IntegerStatement";
import { PrimitiveStatement } from "./PrimitiveStatement";

/**
 * Generic number class
 */
export class NumericStatement extends PrimitiveStatement<number> {
  constructor(
    variableIdentifier: string,
    typeIdentifier: string,
    name: string,
    uniqueId: string,
    value: number
  ) {
    super(
      variableIdentifier,
      typeIdentifier,
      name,
      TypeEnum.NUMERIC,
      uniqueId,
      value
    );
  }

  mutate(sampler: JavaScriptTestCaseSampler, depth: number): Statement {
    if (prng.nextBoolean(sampler.deltaMutationProbability)) {
      // 80%
      if (prng.nextBoolean(0.5)) {
        // 50%
        return new IntegerStatement(
          this.variableIdentifier,
          this.typeIdentifier,
          this.name,
          prng.uniqueId(),
          this.value
        ).deltaMutation(sampler);
      }
      return this.deltaMutation(sampler);
    } else {
      // 20%
      if (prng.nextBoolean(0.5)) {
        // 50%
        return sampler.sampleArgument(
          depth + 1,
          this.variableIdentifier,
          this.name
        );
      } else {
        // 50%
        return sampler.sampleNumber(
          this.variableIdentifier,
          this.typeIdentifier,
          this.name
        );
      }
    }
  }

  deltaMutation(sampler: JavaScriptTestCaseSampler): NumericStatement {
    // small mutation
    const change = prng.nextGaussian(0, 5);

    let newValue = this.value + change;

    // If illegal values are not allowed we make sure the value does not exceed the specified bounds
    if (!sampler.exploreIllegalValues) {
      const max = Number.MAX_SAFE_INTEGER;
      const min = Number.MIN_SAFE_INTEGER;

      if (newValue > max) {
        newValue = max;
      } else if (newValue < min) {
        newValue = min;
      }
    }

    return new NumericStatement(
      this.variableIdentifier,
      this.typeIdentifier,
      this.name,
      prng.uniqueId(),
      newValue
    );
  }

  copy(): NumericStatement {
    return new NumericStatement(
      this.variableIdentifier,
      this.typeIdentifier,
      this.name,
      this.uniqueId,
      this.value
    );
  }
}
