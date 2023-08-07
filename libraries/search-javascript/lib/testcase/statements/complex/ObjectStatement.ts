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

import { prng } from "@syntest/prng";
import { shouldNeverHappen } from "@syntest/search";

import { JavaScriptDecoder } from "../../../testbuilding/JavaScriptDecoder";
import { JavaScriptTestCaseSampler } from "../../sampling/JavaScriptTestCaseSampler";
import { Decoding, Statement } from "../Statement";

/**
 * @author Dimitri Stallenberg
 */
type ObjectType = {
  [key: string]: Statement | undefined;
};
export class ObjectStatement extends Statement {
  private _object: ObjectType;

  constructor(
    variableIdentifier: string,
    typeIdentifier: string,
    name: string,
    type: string,
    uniqueId: string,
    object: ObjectType
  ) {
    super(variableIdentifier, typeIdentifier, name, type, uniqueId);
    this._object = object;
    this._classType = "ObjectStatement";
  }

  mutate(sampler: JavaScriptTestCaseSampler, depth: number): Statement {
    if (prng.nextBoolean(sampler.resampleGeneProbability)) {
      return sampler.sampleArgument(depth, this.variableIdentifier, this.name);
    }

    const object: ObjectType = {};

    for (const key of Object.keys(this._object)) {
      object[key] = this._object[key].copy();
    }

    const keys = Object.keys(object);
    // go over each child
    for (let index = 0; index < keys.length; index++) {
      if (prng.nextBoolean(1 / keys.length)) {
        const key = keys[index];
        // Mutate this position
        const choice = prng.nextDouble();

        if (choice < 0.1) {
          // 10% chance to add a call on this position

          object[key] = sampler.sampleObjectArgument(
            depth + 1,
            this.variableIdentifier,
            key
          );
        } else if (choice < 0.2) {
          // 10% chance to delete the call
          object[key] = undefined;
        } else {
          // 80% chance to just mutate the call
          object[key] = object[key].mutate(sampler, depth + 1);
        }
      }
    }

    return new ObjectStatement(
      this.variableIdentifier,
      this.typeIdentifier,
      this.name,
      this.type,
      prng.uniqueId(),
      object
    );
  }

  copy(): ObjectStatement {
    const object: ObjectType = {};

    for (const key of Object.keys(this._object)) {
      object[key] = this._object[key].copy();
    }

    return new ObjectStatement(
      this.variableIdentifier,
      this.typeIdentifier,
      this.name,
      this.type,
      this.uniqueId,
      this._object
    );
  }

  decode(
    decoder: JavaScriptDecoder,
    id: string,
    options: { addLogs: boolean; exception: boolean }
  ): Decoding[] {
    const children = Object.keys(this._object)
      .filter((key) => this._object[key] !== undefined)
      .map((key) => `\t\t\t"${key}": ${this._object[key].varName}`)
      .join(",\n");

    const childStatements: Decoding[] = Object.values(this._object).flatMap(
      (a) => a.decode(decoder, id, options)
    );

    let decoded = `const ${this.varName} = {\n${children}\n\t\t}`;

    if (options.addLogs) {
      const logDirectory = decoder.getLogDirectory(id, this.varName);
      decoded += `\nawait fs.writeFileSync('${logDirectory}', '' + ${this.varName} + ';sep;' + JSON.stringify(${this.varName}))`;
    }

    return [
      ...childStatements,
      {
        decoded: decoded,
        reference: this,
      },
    ];
  }

  getChildren(): Statement[] {
    return Object.keys(this._object)
      .sort()
      .filter((key) => this._object[key] !== undefined)
      .map((key) => this._object[key]);
  }

  hasChildren(): boolean {
    return this.getChildren().length > 0;
  }

  setChild(index: number, newChild: Statement) {
    if (!newChild) {
      throw new Error("Invalid new child!");
    }

    if (index < 0 || index >= this.getChildren().length) {
      throw new Error(shouldNeverHappen(`Invalid index used index: ${index}`));
    }

    const keys = Object.keys(this._object)
      .sort()
      .filter((key) => this._object[key] !== undefined);
    const key = keys[index];

    this._object[key] = newChild;
  }
}
