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
import { FunctionCall } from "../../statements/root/FunctionCall";
import { CallGenerator } from "./CallGenerator";

export class FunctionCallGenerator extends CallGenerator<FunctionCall> {
  override generate(
    depth: number,
    variableIdentifier: string,
    typeIdentifier: string,
    name: string
  ): FunctionCall {
    const type_ = this.rootContext
      .getTypeModel()
      .getObjectDescription(typeIdentifier);

    const arguments_: Statement[] = this.sampleArguments(depth, type_);

    const export_ = [...this.rootContext.getAllExports().values()]
      .flat()
      .find((export_) => export_.id === typeIdentifier);

    return new FunctionCall(
      variableIdentifier,
      typeIdentifier,
      name,
      TypeEnum.FUNCTION,
      prng.uniqueId(),
      arguments_,
      export_
    );
  }
}
