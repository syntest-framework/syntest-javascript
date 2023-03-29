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

import { IdentifierDescription } from "@syntest/analysis-javascript";
import { prng } from "@syntest/core";

import { JavaScriptDecoder } from "../../../testbuilding/JavaScriptDecoder";
import { JavaScriptTestCaseSampler } from "../../sampling/JavaScriptTestCaseSampler";
import { Decoding, Statement } from "../Statement";

import { ActionStatement } from "./ActionStatement";

/**
 * @author Dimitri Stallenberg
 */
export class Getter extends ActionStatement {
  private readonly _property: string;

  /**
   * Constructor
   * @param identifierDescription the return type options of the function
   * @param type the type of property
   * @param uniqueId id of the gene
   * @param property the name of the property
   */
  constructor(
    identifierDescription: IdentifierDescription,
    type: string,
    uniqueId: string,
    property: string
  ) {
    super(identifierDescription, type, uniqueId, []);
    this._classType = "Getter";
    this._property = property;
  }

  mutate(sampler: JavaScriptTestCaseSampler, depth: number): Getter {
    const arguments_ = this.args.map((a: Statement) => a.copy());

    if (arguments_.length > 0) {
      const index = prng.nextInt(0, arguments_.length - 1);

      arguments_[index] = prng.nextBoolean(sampler.resampleGeneProbability)
        ? sampler.sampleArgument(
            depth + 1,
            arguments_[index].identifierDescription
          )
        : arguments_[index].mutate(sampler, depth + 1);
    }

    return new Getter(
      this.identifierDescription,
      this.type,
      prng.uniqueId(),
      this.property
    );
  }

  copy(): Getter {
    return new Getter(
      this.identifierDescription,
      this.type,
      this.id,
      this.property
    );
  }

  get property(): string {
    return this._property;
  }

  decode(): Decoding[] {
    throw new Error("Cannot call decode on method calls!");
  }

  decodeWithObject(
    decoder: JavaScriptDecoder,
    id: string,
    options: { addLogs: boolean; exception: boolean },
    objectVariable: string
  ): Decoding[] {
    let decoded = `const ${this.varName} = await ${objectVariable}.${this.property}`;

    if (options.addLogs) {
      const logDirectory = decoder.getLogDirectory(id, this.varName);
      decoded += `\nawait fs.writeFileSync('${logDirectory}', '' + ${this.varName} + ';sep;' + JSON.stringify(${this.varName}))`;
    }

    return [
      {
        decoded: decoded,
        reference: this,
        objectVariable: objectVariable,
      },
    ];
  }

  // TODO
  decodeErroring(objectVariable: string): string {
    return `await expect(${objectVariable}.${this.property}).to.be.rejectedWith(Error);`;
  }
}
