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

import {
  ActionType,
  IdentifierDescription,
} from "@syntest/analysis-javascript";
import { prng } from "@syntest/core";

import { JavaScriptSubject } from "../../../search/JavaScriptSubject";
import { JavaScriptDecoder } from "../../../testbuilding/JavaScriptDecoder";
import { JavaScriptTestCaseSampler } from "../../sampling/JavaScriptTestCaseSampler";
import { MethodCall } from "../action/MethodCall";
import { Decoding, Statement } from "../Statement";

import { RootStatement } from "./RootStatement";

/**
 * @author Dimitri Stallenberg
 */
export class RootObject extends RootStatement {
  /**
   * Constructor
   * @param type the return identifierDescription of the constructor
   * @param uniqueId optional argument
   * @param calls the child calls on the object
   */
  constructor(
    identifierDescription: IdentifierDescription,
    type: string,
    uniqueId: string,
    calls: Statement[]
  ) {
    super(identifierDescription, type, uniqueId, [], calls);
    this._classType = "RootObject";

    for (const call of calls) {
      if (!(call instanceof MethodCall)) {
        throw new TypeError(
          "Constructor children must be of identifierDescription MethodCall"
        );
      }
    }
  }

  mutate(sampler: JavaScriptTestCaseSampler, depth: number): RootObject {
    // TODO replace entire constructor?
    const calls = this.children.map((a: Statement) => a.copy());

    const methodsAvailable =
      (<JavaScriptSubject>sampler.subject).getPossibleActions(ActionType.METHOD)
        .length > 0;

    const finalCalls = [];

    // If there are no calls, add one if there are methods available
    if (calls.length === 0 && methodsAvailable) {
      // add a call
      finalCalls.push(sampler.sampleMethodCall(depth + 1));
      return new RootObject(
        this.identifierDescription,
        this.type,
        prng.uniqueId(),
        finalCalls
      );
    }

    // go over each call
    for (let index = 0; index < calls.length; index++) {
      if (prng.nextBoolean(1 / calls.length)) {
        // Mutate this position
        const choice = prng.nextDouble();

        if (choice < 0.1 && methodsAvailable) {
          // 10% chance to add a call on this position
          finalCalls.push(sampler.sampleMethodCall(depth + 1), calls[index]);
        } else if (choice < 0.2) {
          // 10% chance to delete the call
        } else {
          // 80% chance to just mutate the call
          if (prng.nextBoolean(sampler.resampleGeneProbability)) {
            finalCalls.push(sampler.sampleMethodCall(depth + 1));
          } else {
            finalCalls.push(calls[index].mutate(sampler, depth + 1));
          }
        }
      }
    }

    return new RootObject(
      this.identifierDescription,
      this.type,
      prng.uniqueId(),
      finalCalls
    );
  }

  copy(): RootObject {
    const deepCopyChildren = this.children.map((a: Statement) => a.copy());

    return new RootObject(
      this.identifierDescription,
      this.type,
      this.id,
      deepCopyChildren
    );
  }

  decode(
    decoder: JavaScriptDecoder,
    id: string,
    options: { addLogs: boolean; exception: boolean }
  ): Decoding[] {
    const childStatements: Decoding[] = this.children.flatMap(
      (a: Statement) => {
        if (a instanceof MethodCall) {
          return a.decodeWithObject(decoder, id, options, this.varName);
        }
        return a.decode(decoder, id, options);
      }
    );

    let decoded = `const ${this.varName} = ${this.type}`;

    if (options.addLogs) {
      const logDirectory = decoder.getLogDirectory(id, this.varName);
      decoded += `\nawait fs.writeFileSync('${logDirectory}', '' + ${this.varName} + ';sep;' + JSON.stringify(${this.varName}))`;
    }

    return [
      {
        decoded: decoded,
        reference: this,
      },
      ...childStatements,
    ];
  }
}
