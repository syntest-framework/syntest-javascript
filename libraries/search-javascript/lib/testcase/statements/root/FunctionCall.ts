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

import { RootStatement } from "./RootStatement";

/**
 * @author Dimitri Stallenberg
 */
export class FunctionCall extends RootStatement {
  private readonly _functionName: string;

  /**
   * Constructor
   * @param type the return identifierDescription of the function
   * @param uniqueId id of the gene
   * @param functionName the name of the function
   * @param args the arguments of the function
   */
  constructor(
    identifierDescription: IdentifierDescription,
    type: string,
    uniqueId: string,
    functionName: string,
    arguments_: Statement[]
  ) {
    super(identifierDescription, type, uniqueId, arguments_, []);
    this._classType = "FunctionCall";

    this._functionName = functionName;
  }

  mutate(sampler: JavaScriptTestCaseSampler, depth: number): FunctionCall {
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

    return new FunctionCall(
      this.identifierDescription,
      this.type,
      prng.uniqueId(),
      this.functionName,
      arguments_
    );
  }

  copy(): FunctionCall {
    const deepCopyArguments = this.args.map((a: Statement) => a.copy());

    return new FunctionCall(
      this.identifierDescription,
      this.type,
      this.id,
      this.functionName,
      deepCopyArguments
    );
  }

  get functionName(): string {
    return this._functionName;
  }

  decode(
    decoder: JavaScriptDecoder,
    id: string,
    options: { addLogs: boolean; exception: boolean }
  ): Decoding[] {
    const arguments_ = this.args.map((a) => a.varName).join(", ");

    const argumentStatements: Decoding[] = this.args.flatMap((a) =>
      a.decode(decoder, id, options)
    );

    let decoded = `const ${this.varName} = await ${this.functionName}(${arguments_})`;

    if (options.addLogs) {
      const logDirectory = decoder.getLogDirectory(id, this.varName);
      decoded += `\nawait fs.writeFileSync('${logDirectory}', '' + ${this.varName} + ';sep;' + JSON.stringify(${this.varName}))`;
    }

    return [
      ...argumentStatements,
      {
        decoded: decoded,
        reference: this,
      },
    ];
  }

  decodeErroring(): string {
    const arguments_ = this.args.map((a) => a.varName).join(", ");
    return `await expect(${this.functionName}(${arguments_})).to.be.rejectedWith(Error);`;
  }
}
