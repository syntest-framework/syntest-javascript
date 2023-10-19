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

import { ContextBuilder } from "../../../testbuilding/ContextBuilder";
import { JavaScriptTestCaseSampler } from "../../sampling/JavaScriptTestCaseSampler";
import { Decoding, Statement } from "../Statement";

import { ActionStatement } from "./ActionStatement";


/**
 * ImportStatement
 */
export class ImportStatement extends ActionStatement {

  constructor(
    variableIdentifier: string,
    typeIdentifier: string,
    name: string,
    uniqueId: string,
    action: Action,
  ) {
    super(
      variableIdentifier,
      typeIdentifier,
      name,
      uniqueId,
      action,
      []
    );
  }

  mutate(_sampler: JavaScriptTestCaseSampler, _depth: number): ImportStatement {
    // nothing to mutate actually
    return this.copy()
  }

  copy(): ImportStatement {
    return new ImportStatement(
      this.variableIdentifier,
      this.typeIdentifier,
      this.name,
      this.uniqueId,
      this.action
    );
  }

  decode(context: ContextBuilder): Decoding[] {
    return [
      {
        variableName: context.getOrCreateVariableName(
            this
          ),
        decoded: `SHOULD NOT BE USED`,
        reference: this,
      },
    ];
  }

  override setChild(_index: number, _newChild: Statement): void {
      throw new Error("Import statement does not have children")
  }

  override get type(): TypeEnum {
    return TypeEnum.NULL
  }
}
