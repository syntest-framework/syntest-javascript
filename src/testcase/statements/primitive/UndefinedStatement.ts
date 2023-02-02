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

import { prng } from "@syntest/core";
import { PrimitiveStatement } from "./PrimitiveStatement";
import { IdentifierDescription } from "../../../analysis/static/parsing/IdentifierDescription";

/**
 * @author Dimitri Stallenberg
 */
export class UndefinedStatement extends PrimitiveStatement<boolean> {
  constructor(
    identifierDescription: IdentifierDescription,
    type: string,
    uniqueId: string
  ) {
    super(identifierDescription, type, uniqueId, undefined);
    this._classType = "UndefinedStatement";
  }

  mutate(): UndefinedStatement {
    return new UndefinedStatement(
      this.identifierDescription,
      this.type,
      prng.uniqueId()
    );
  }

  copy(): UndefinedStatement {
    return new UndefinedStatement(
      this.identifierDescription,
      this.type,
      this.id
    );
  }

  getFlatTypes(): string[] {
    return ["undefined"];
  }
}
