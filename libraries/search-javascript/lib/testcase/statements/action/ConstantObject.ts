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

import { JavaScriptDecoder } from "../../../testbuilding/JavaScriptDecoder";
import { JavaScriptTestCaseSampler } from "../../sampling/JavaScriptTestCaseSampler";
import { Decoding } from "../Statement";

import { Export } from "@syntest/analysis-javascript";
import { ActionStatement } from "./ActionStatement";

/**
 * @author Dimitri Stallenberg
 */
export class ConstantObject extends ActionStatement {
  /**
   * Constructor
   * @param type the return identifierDescription of the constructor
   * @param uniqueId optional argument
   * @param calls the child calls on the object
   */
  constructor(
    variableIdentifier: string,
    typeIdentifier: string,
    name: string,
    type: string,
    uniqueId: string,
    export_: Export
  ) {
    super(
      variableIdentifier,
      typeIdentifier,
      name,
      type,
      uniqueId,
      [],
      export_
    );
    this._classType = "RootObject";
  }

  mutate(_sampler: JavaScriptTestCaseSampler, _depth: number): ConstantObject {
    // if (prng.nextBoolean(sampler.resampleGeneProbability)) { // TODO
    //   return sampler.sampleConstantObject(depth);
    // }

    return new ConstantObject(
      this.variableIdentifier,
      this.typeIdentifier,
      this.name,
      this.type,
      prng.uniqueId(),
      this.export
    );
  }

  copy(): ConstantObject {
    return new ConstantObject(
      this.variableIdentifier,
      this.typeIdentifier,
      this.name,
      this.type,
      this.uniqueId,
      this.export
    );
  }

  decode(
    decoder: JavaScriptDecoder,
    id: string,
    options: { addLogs: boolean; exception: boolean }
  ): Decoding[] {
    let decoded = `const ${this.varName} = ${this.name}`;

    if (options.addLogs) {
      const logDirectory = decoder.getLogDirectory(id, this.varName);
      decoded += `\nawait fs.writeFileSync('${logDirectory}', '' + ${this.varName} + ';sep;' + JSON.stringify(${this.varName}))`;
    }

    return [
      {
        decoded: decoded,
        reference: this,
      },
    ];
  }
}
