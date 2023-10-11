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
import { Action } from "@syntest/analysis-javascript";
import { prng } from "@syntest/prng";

import { ActionStatement } from "./statements/action/ActionStatement";
import { ConstructorCall } from "./statements/action/ConstructorCall";
import { FunctionCall } from "./statements/action/FunctionCall";
import { Statement } from "./statements/Statement";

export class StatementPool {
  // type -> statement array
  private pool: Map<string, Statement[]>;
  // this is a bit out of scope for this class but otherwise we have to walk the tree multiple times
  // we can solve this by making a singular tree walker class with visitors
  private constructors: ConstructorCall[];

  constructor(roots: ActionStatement[]) {
    this.pool = new Map();
    this.constructors = [];
    this._fillGenePool(roots);
  }

  public getRandomStatement(type: string): Statement {
    const statements = this.pool.get(type);

    if (!statements || statements.length === 0) {
      return undefined;
    }

    return prng.pickOne(statements);
  }

  public getRandomConstructor(action?: Action): ConstructorCall {
    const options = action
      ? this.constructors.filter((o) => action.id === o.action.id)
      : this.constructors;

    if (options.length === 0) {
      return undefined;
    }
    return prng.pickOne(options);
  }

  private _fillGenePool(roots: ActionStatement[]) {
    for (const action of roots) {
      const queue: Statement[] = [action];

      while (queue.length > 0) {
        const statement = queue.pop();

        if (statement.hasChildren()) {
          queue.push(...statement.getChildren());
        }

        // use type enum for primitives and arrays
        const type: string = statement.returnType;

       if (
          statement instanceof FunctionCall
        ) {
          // TODO use return type
          // type = statement.
          // skip for now
          continue;
        }

        if (!this.pool.has(type)) {
          this.pool.set(type, []);
        }
        this.pool.get(type).push(statement);
      }
    }
  }
}
