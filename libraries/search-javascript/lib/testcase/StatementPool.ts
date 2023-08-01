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
import { ActionStatement } from "./statements/action/ActionStatement";
import { Statement } from "./statements/Statement";

export class StatementPool {
  // type -> statement array
  private pool: Map<string, Statement[]>;

  constructor(roots: ActionStatement[]) {
    this.pool = new Map();

    this._fillGenePool(roots);
  }

  private _fillGenePool(roots: ActionStatement[]) {
    for (const action of roots) {
      const queue: Statement[] = [action];

      while (queue.length > 0) {
        const statement = queue.pop();

        if (statement.type === TypeEnum.OBJECT) {
          // use type identifier
          if (!this.pool.has(statement.typeIdentifier)) {
            this.pool.set(statement.typeIdentifier, []);
          }
          this.pool.get(statement.typeIdentifier).push(statement);
        } else if (statement.type === TypeEnum.FUNCTION) {
          // use return type
          // TODO
        } else {
          // use type enum for primitives and arrays
          if (!this.pool.has(statement.type)) {
            this.pool.set(statement.type, []);
          }
          this.pool.get(statement.type).push(statement);
        }

        if (statement.hasChildren()) {
          queue.push(...statement.getChildren());
        }
      }
    }
  }
}
