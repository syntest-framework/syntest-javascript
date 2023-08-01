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
import { TypeEnum } from "@syntest/analysis-javascript";
import { Statement } from "../../statements/Statement";
import { prng } from "@syntest/prng";
import { CallGenerator } from "./CallGenerator";
import { Setter } from "../../statements/action/Setter";

export class SetterGenerator extends CallGenerator<Setter> {
  override generate(
    depth: number,
    variableIdentifier: string,
    typeIdentifier: string,
    exportIdentifier: string,
    name: string
  ): Setter {
    const type_ = this.rootContext
      .getTypeModel()
      .getObjectDescription(typeIdentifier);

    const arguments_: Statement[] = this.sampleArguments(depth, type_);

    if (arguments_.length !== 1) {
      throw new Error("Setter must have exactly one argument");
    }

    const constructor_ = this.sampler.sampleConstructorCall(
      depth + 1,
      exportIdentifier
    );

    return new Setter(
      variableIdentifier,
      typeIdentifier,
      name,
      TypeEnum.FUNCTION,
      prng.uniqueId(),
      arguments_[0],
      constructor_
    );
  }
}
