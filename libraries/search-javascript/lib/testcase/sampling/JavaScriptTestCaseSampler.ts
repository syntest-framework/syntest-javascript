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

import { Action, ConstantPoolManager, ObjectType, RootContext } from "@syntest/analysis-javascript";
import { prng } from "@syntest/prng";
import { EncodingSampler } from "@syntest/search";

import { JavaScriptSubject } from "../../search/JavaScriptSubject";
import { JavaScriptTestCase } from "../JavaScriptTestCase";
import { StatementPool } from "../StatementPool";
import { ActionStatement } from "../statements/action/ActionStatement";
import { ConstructorCall } from "../statements/action/ConstructorCall";
import { FunctionCall } from "../statements/action/FunctionCall";
import { ImportStatement } from "../statements/action/ImportStatement";
import { MemberStatement } from "../statements/action/MemberStatement";
import { ArrayStatement } from "../statements/complex/ArrayStatement";
import { ArrowFunctionStatement } from "../statements/complex/ArrowFunctionStatement";
import { ObjectStatement } from "../statements/complex/ObjectStatement";
import { BoolStatement } from "../statements/literal/BoolStatement";
import { IntegerStatement } from "../statements/literal/IntegerStatement";
import { NullStatement } from "../statements/literal/NullStatement";
import { NumericStatement } from "../statements/literal/NumericStatement";
import { StringStatement } from "../statements/literal/StringStatement";
import { UndefinedStatement } from "../statements/literal/UndefinedStatement";
import { Statement } from "../statements/Statement";

/**
 * JavaScriptRandomSampler class
 */
export abstract class JavaScriptTestCaseSampler extends EncodingSampler<JavaScriptTestCase> {
  private _rootContext: RootContext;

  private _constantPoolManager: ConstantPoolManager;
  private _constantPoolEnabled: boolean;
  private _constantPoolProbability: number;

  private _typePoolEnabled: boolean;
  private _typePoolProbability: number;

  private _statementPoolEnabled: boolean;
  private _statementPoolProbability: number;

  private _typeInferenceMode: string;
  private _randomTypeProbability: number;
  private _incorporateExecutionInformation: boolean;
  private _maxActionStatements: number;
  private _stringAlphabet: string;
  private _stringMaxLength: number;

  private _deltaMutationProbability: number;
  // private _deltaSigma: number; // todo
  // private _adaptiveDeltaSigma: boolean; // todo

  private _exploreIllegalValues: boolean;

  private _statementPool: StatementPool | null;

  constructor(
    subject: JavaScriptSubject,
    constantPoolManager: ConstantPoolManager,
    constantPoolEnabled: boolean,
    constantPoolProbability: number,
    typePoolEnabled: boolean,
    typePoolProbability: number,
    statementPoolEnabled: boolean,
    statementPoolProbability: number,
    typeInferenceMode: string,
    randomTypeProbability: number,
    incorporateExecutionInformation: boolean,
    maxActionStatements: number,
    stringAlphabet: string,
    stringMaxLength: number,
    deltaMutationProbability: number,
    exploreIllegalValues: boolean
  ) {
    super(subject);
    this._constantPoolManager = constantPoolManager;
    this._constantPoolEnabled = constantPoolEnabled;
    this._constantPoolProbability = constantPoolProbability;

    this._typePoolEnabled = typePoolEnabled;
    this._typePoolProbability = typePoolProbability;

    this._statementPoolEnabled = statementPoolEnabled;
    this._statementPoolProbability = statementPoolProbability;

    this._typeInferenceMode = typeInferenceMode;
    this._randomTypeProbability = randomTypeProbability;
    this._incorporateExecutionInformation = incorporateExecutionInformation;
    this._maxActionStatements = maxActionStatements;
    this._stringAlphabet = stringAlphabet;
    this._stringMaxLength = stringMaxLength;
    this._deltaMutationProbability = deltaMutationProbability;
    this._exploreIllegalValues = exploreIllegalValues;
  }

  get rootContext() {
    return this._rootContext;
  }

  set rootContext(rootContext: RootContext) {
    this._rootContext = rootContext;
  }

  get statementPool() {
    return this._statementPool;
  }

  set statementPool(statementPool: StatementPool) {
    this._statementPool = statementPool;
  }

  /**
   * Samples an action
   * Use when 
   * @param depth 
   * @param action 
   */
  abstract sampleParentAction(
    depth: number,
    action: Action
  ): ActionStatement;

  abstract sampleFunctionCall(
    depth: number
  ): FunctionCall;

  abstract sampleSpecificFunctionCall(
    depth: number,
    action: string | Action
  ): FunctionCall;

  abstract sampleConstructorCall(
    depth: number
  ): ConstructorCall;

  abstract sampleSpecificConstructorCall(
    depth: number,
    action: string | Action
  ): ConstructorCall;

  abstract sampleMemberStatement(
    depth: number,
    action: Action,
    key: string
  ): MemberStatement

  abstract sampleImportStatement(
    depth: number,
    action: Action
  ): ImportStatement

  // TODO
  // abstract sampleStaticMethodCall(depth: number): MethodCall;

  abstract sampleArrayArgument(depth: number, arrayId: string): Statement;

  abstract sampleObjectArgument(
    depth: number,
    objectId: string,
    property?: string
  ): Statement;

  abstract sampleArgument(depth: number, id: string, name: string): Statement;

  abstract sampleObject(
    depth: number,
    id: string,
    typeId: string,
    name: string
  ): ObjectStatement | ConstructorCall | FunctionCall;

  abstract sampleArray(
    depth: number,
    id: string,
    typeId: string,
    name: string
  ): ArrayStatement;

  abstract sampleArrowFunction(
    depth: number,
    id: string,
    typeId: string,
    name: string
  ): ArrowFunctionStatement;

  abstract sampleString(
    id: string,
    typeId: string,
    name: string,
    alphabet?: string,
    maxlength?: number
  ): StringStatement;

  // primitive types
  abstract sampleBool(id: string, typeId: string, name: string): BoolStatement;

  abstract sampleNull(id: string, typeId: string, name: string): NullStatement;

  abstract sampleNumber(
    id: string,
    typeId: string,
    name: string
  ): NumericStatement;
  abstract sampleInteger(
    id: string,
    typeId: string,
    name: string
  ): IntegerStatement;

  abstract sampleUndefined(
    id: string,
    typeId: string,
    name: string
  ): UndefinedStatement;

  sampleArguments(depth: number, type_: ObjectType): Statement[] {
    const arguments_: Statement[] = [];

    for (const [index, parameterId] of type_.parameters.entries()) {
      const name = type_.parameterNames.get(index);
      arguments_[index] = this.sampleArgument(
        depth + 1,
        parameterId,
        name
      );
    }

    // if some params are missing, fill them with fake params
    const parameterIds = [...type_.parameters.values()];
    for (let index = 0; index < arguments_.length; index++) {
      if (!arguments_[index]) {
        arguments_[index] = this.sampleArgument(
          depth + 1,
          prng.pickOne(parameterIds),
          String(index)
        );
      }
    }

    for (let index = 0; index < 10; index++) {
      if (prng.nextBoolean(0.05)) {
        // TODO make this a config parameter
        arguments_.push(this.sampleArgument(depth + 1, "anon", "anon"));
      }
    }

    return arguments_;
  }

  get constantPoolManager(): ConstantPoolManager {
    return this._constantPoolManager;
  }

  get constantPoolEnabled(): boolean {
    return this._constantPoolEnabled;
  }

  get constantPoolProbability(): number {
    return this._constantPoolProbability;
  }

  get typePoolEnabled(): boolean {
    return this._typePoolEnabled;
  }

  get typePoolProbability(): number {
    return this._typePoolProbability;
  }

  get statementPoolEnabled(): boolean {
    return this._statementPoolEnabled;
  }

  get statementPoolProbability(): number {
    return this._statementPoolProbability;
  }

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

  get deltaMutationProbability(): number {
    return this._deltaMutationProbability;
  }

  get exploreIllegalValues(): boolean {
    return this._exploreIllegalValues;
  }
}
