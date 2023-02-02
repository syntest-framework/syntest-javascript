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

import { prng, Properties } from "@syntest/core";
import { JavaScriptTestCaseSampler } from "../../sampling/JavaScriptTestCaseSampler";
import { PrimitiveStatement } from "./PrimitiveStatement";
import { IdentifierDescription } from "../../../analysis/static/parsing/IdentifierDescription";

/**
 * @author Dimitri Stallenberg
 */
export class BoolStatement extends PrimitiveStatement<boolean> {
  constructor(
    identifierDescription: IdentifierDescription,
    type: string,
    uniqueId: string,
    value: boolean
  ) {
    super(identifierDescription, type, uniqueId, value);
    this._classType = "BoolStatement";
  }

  mutate(sampler: JavaScriptTestCaseSampler): BoolStatement {
    if (prng.nextBoolean(Properties.resample_gene_probability)) {
      return sampler.sampleBool(this.identifierDescription, this.type);
    }

    return new BoolStatement(
      this.identifierDescription,
      this.type,
      prng.uniqueId(),
      !this.value
    );
  }

  copy(): BoolStatement {
    return new BoolStatement(
      this.identifierDescription,
      this.type,
      this.id,
      this.value
    );
  }

  getFlatTypes(): string[] {
    return ["bool"];
  }
}
