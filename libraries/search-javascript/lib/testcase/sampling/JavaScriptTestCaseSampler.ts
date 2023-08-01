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

import { EncodingSampler } from "@syntest/search";

import { JavaScriptSubject } from "../../search/JavaScriptSubject";
import { JavaScriptTestCase } from "../JavaScriptTestCase";
import { Getter } from "../statements/action/Getter";
import { MethodCall } from "../statements/action/MethodCall";
import { Setter } from "../statements/action/Setter";
import { BoolStatement } from "../statements/primitive/BoolStatement";
import { NumericStatement } from "../statements/primitive/NumericStatement";
import { StringStatement } from "../statements/primitive/StringStatement";
import { ConstructorCall } from "../statements/action/ConstructorCall";
import { Statement } from "../statements/Statement";
import { ConstantObject } from "../statements/action/ConstantObject";
import { ObjectFunctionCall } from "../statements/action/ObjectFunctionCall";
import { NullStatement } from "../statements/primitive/NullStatement";
import { UndefinedStatement } from "../statements/primitive/UndefinedStatement";
import { ArrowFunctionStatement } from "../statements/complex/ArrowFunctionStatement";
import { ArrayStatement } from "../statements/complex/ArrayStatement";
import { ObjectStatement } from "../statements/complex/ObjectStatement";
import { IntegerStatement } from "../statements/primitive/IntegerStatement";
import { FunctionCall } from "../statements/action/FunctionCall";
import { FunctionCallGenerator } from "./generators/FunctionCallGenerator";
import { RootContext } from "@syntest/analysis-javascript";
import { StatementPool } from "../StatementPool";
import { ActionStatement } from "../statements/action/ActionStatement";
import { ConstructorCallGenerator } from "./generators/ConstructorCallGenerator";
import { MethodCallGenerator } from "./generators/MethodCallGenerator";
import { GetterGenerator } from "./generators/GetterGenerator";
import { SetterGenerator } from "./generators/SetterGenerator";
import { ConstantObjectGenerator } from "./generators/ConstantObjectGenerator";
import { ObjectFunctionCallGenerator } from "./generators/ObjectFunctionCallGenerator";

/**
 * JavaScriptRandomSampler class
 *
 * @author Dimitri Stallenberg
 */
export abstract class JavaScriptTestCaseSampler extends EncodingSampler<JavaScriptTestCase> {
  private _rootContext: RootContext;

  private _typeInferenceMode: string;
  private _randomTypeProbability: number;
  private _incorporateExecutionInformation: boolean;
  private _maxActionStatements: number;
  private _stringAlphabet: string;
  private _stringMaxLength: number;
  private _resampleGeneProbability: number;
  private _deltaMutationProbability: number;
  private _exploreIllegalValues: boolean;

  private _statementPool: StatementPool | null;

  private _functionCallGenerator: FunctionCallGenerator;

  private _constructorCallGenerator: ConstructorCallGenerator;
  private _methodCallGenerator: MethodCallGenerator;
  private _getterGenerator: GetterGenerator;
  private _setterGenerator: SetterGenerator;

  private _constantObjectGenerator: ConstantObjectGenerator;
  private _objectFunctionCallGenerator: ObjectFunctionCallGenerator;

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

  get rootContext() {
    return this._rootContext;
  }

  set rootContext(rootContext: RootContext) {
    this._rootContext = rootContext;

    this._functionCallGenerator = new FunctionCallGenerator(this, rootContext);
    this._constructorCallGenerator = new ConstructorCallGenerator(
      this,
      rootContext
    );
    this._methodCallGenerator = new MethodCallGenerator(this, rootContext);
    this._getterGenerator = new GetterGenerator(this, rootContext);
    this._setterGenerator = new SetterGenerator(this, rootContext);
    this._constantObjectGenerator = new ConstantObjectGenerator(
      this,
      rootContext
    );
    this._objectFunctionCallGenerator = new ObjectFunctionCallGenerator(
      this,
      rootContext
    );
  }

  get functionCallGenerator() {
    return this._functionCallGenerator;
  }

  get constructorCallGenerator() {
    return this._constructorCallGenerator;
  }

  get methodCallGenerator() {
    return this._methodCallGenerator;
  }

  get getterGenerator() {
    return this._getterGenerator;
  }

  get setterGenerator() {
    return this._setterGenerator;
  }

  get constantObjectGenerator() {
    return this._constantObjectGenerator;
  }

  get objectFunctionCallGenerator() {
    return this._objectFunctionCallGenerator;
  }

  get statementPool() {
    return this._statementPool;
  }

  set statementPool(statementPool: StatementPool) {
    this._statementPool = statementPool;
  }

  abstract sampleRoot(): ActionStatement;

  abstract sampleFunctionCall(depth: number): FunctionCall;

  abstract sampleConstructorCall(
    depth: number,
    classId?: string
  ): ConstructorCall;
  abstract sampleClassAction(depth: number): MethodCall | Getter | Setter;
  abstract sampleMethodCall(depth: number): MethodCall;
  abstract sampleGetter(depth: number): Getter;
  abstract sampleSetter(depth: number): Setter;

  abstract sampleConstantObject(
    depth: number,
    objectId?: string
  ): ConstantObject;
  abstract sampleObjectFunctionCall(depth: number): ObjectFunctionCall;

  // TODO
  // abstract sampleStaticMethodCall(depth: number): MethodCall;

  abstract sampleArrayArgument(
    depth: number,
    arrayId: string,
    index?: number
  ): Statement;

  abstract sampleObjectArgument(
    depth: number,
    objectId: string,
    property?: string
  ): Statement;

  abstract sampleArgument(depth: number, id: string, name: string): Statement;

  abstract sampleObject(
    depth: number,
    id: string,
    name: string,
    type: string
  ): ObjectStatement | ConstructorCall | ConstantObject | FunctionCall;

  abstract sampleArray(
    depth: number,
    id: string,
    name: string,
    type: string
  ): ArrayStatement;

  abstract sampleArrowFunction(
    depth: number,
    id: string,
    name: string,
    type: string
  ): ArrowFunctionStatement;

  abstract sampleString(
    id: string,
    name: string,
    alphabet?: string,
    maxlength?: number
  ): StringStatement;

  // primitive types
  abstract sampleBool(id: string, name: string): BoolStatement;

  abstract sampleNull(id: string, name: string): NullStatement;

  abstract sampleNumber(id: string, name: string): NumericStatement;
  abstract sampleInteger(id: string, name: string): IntegerStatement;

  abstract sampleUndefined(id: string, name: string): UndefinedStatement;

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
