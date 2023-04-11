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
import { EncodingSampler } from "@syntest/core";

import { JavaScriptSubject } from "../../search/JavaScriptSubject";
import { JavaScriptTestCase } from "../JavaScriptTestCase";
import { Getter } from "../statements/action/Getter";
import { MethodCall } from "../statements/action/MethodCall";
import { Setter } from "../statements/action/Setter";
import { BoolStatement } from "../statements/primitive/BoolStatement";
import { NumericStatement } from "../statements/primitive/NumericStatement";
import { StringStatement } from "../statements/primitive/StringStatement";
import { ConstructorCall } from "../statements/root/ConstructorCall";
import { Statement } from "../statements/Statement";
import { RootObject } from "../statements/root/RootObject";
import { ObjectFunctionCall } from "../statements/action/ObjectFunctionCall";

/**
 * JavaScriptRandomSampler class
 *
 * @author Dimitri Stallenberg
 */
export abstract class JavaScriptTestCaseSampler extends EncodingSampler<JavaScriptTestCase> {
  private _typeInferenceMode: string;
  private _randomTypeProbability: number;
  private _incorporateExecutionInformation: boolean;
  private _maxActionStatements: number;
  private _stringAlphabet: string;
  private _stringMaxLength: number;
  private _resampleGeneProbability: number;
  private _deltaMutationProbability: number;
  private _exploreIllegalValues: boolean;

  constructor(
    subject: JavaScriptSubject,
    typeInferenceMode: string,
    randomTypeProbability: number,
    incorporateExecutionInformation: boolean,
    maxActionStatements: number,
    stringAlphabet: string,
    stringMaxLength: number,
    resampleGeneProbability: number,
    deltaMutationProbability: number,
    exploreIllegalValues: boolean
  ) {
    super(subject);
    this._typeInferenceMode = typeInferenceMode;
    this._randomTypeProbability = randomTypeProbability;
    this._incorporateExecutionInformation = incorporateExecutionInformation;
    this._maxActionStatements = maxActionStatements;
    this._stringAlphabet = stringAlphabet;
    this._stringMaxLength = stringMaxLength;
    this._resampleGeneProbability = resampleGeneProbability;
    this._deltaMutationProbability = deltaMutationProbability;
    this._exploreIllegalValues = exploreIllegalValues;
  }

  abstract sampleClass(depth: number): ConstructorCall;
  abstract sampleMethodCall(
    depth: number,
    className: string
  ): MethodCall | Getter | Setter;

  abstract sampleRootObject(depth: number): RootObject;
  abstract sampleObjectFunctionCall(
    depth: number,
    objectName: string
  ): ObjectFunctionCall;
  // TODO
  // abstract sampleStaticMethodCall(depth: number): MethodCall;
  // abstract sampleFunctionCall(depth: number): FunctionCall;

  abstract sampleArgument(
    depth: number,
    type: IdentifierDescription
  ): Statement;

  abstract sampleString(
    identifierDescription?: IdentifierDescription,
    type?: string,
    alphabet?: string,
    maxlength?: number
  ): StringStatement;

  abstract sampleBool(
    identifierDescription?: IdentifierDescription,
    type?: string
  ): BoolStatement;

  abstract sampleNumber(
    identifierDescription?: IdentifierDescription,
    type?: string
  ): NumericStatement;

  get typeInferenceMode(): string {
    return this._typeInferenceMode;
  }

  get randomTypeProbability(): number {
    return this._randomTypeProbability;
  }

  get incorporateExecutionInformation(): boolean {
    return this._incorporateExecutionInformation;
  }

  get maxActionStatements(): number {
    return this._maxActionStatements;
  }

  get stringAlphabet(): string {
    return this._stringAlphabet;
  }

  get stringMaxLength(): number {
    return this._stringMaxLength;
  }

  get resampleGeneProbability(): number {
    return this._resampleGeneProbability;
  }

  get deltaMutationProbability(): number {
    return this._deltaMutationProbability;
  }

  get exploreIllegalValues(): boolean {
    return this._exploreIllegalValues;
  }
}
