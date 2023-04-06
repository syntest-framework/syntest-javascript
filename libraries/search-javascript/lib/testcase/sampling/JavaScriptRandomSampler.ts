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
  IdentifierDescription,
  RootContext,
  TypeEnum,
  TypeProbability,
} from "@syntest/analysis-javascript";
import { prng } from "@syntest/core";

import { JavaScriptSubject, SubjectType } from "../../search/JavaScriptSubject";
import { JavaScriptTestCase } from "../JavaScriptTestCase";
import { Getter } from "../statements/action/Getter";
import { MethodCall } from "../statements/action/MethodCall";
import { Setter } from "../statements/action/Setter";
import { ArrayStatement } from "../statements/complex/ArrayStatement";
import { ArrowFunctionStatement } from "../statements/complex/ArrowFunctionStatement";
import { ObjectStatement } from "../statements/complex/ObjectStatement";
import { BoolStatement } from "../statements/primitive/BoolStatement";
import { NullStatement } from "../statements/primitive/NullStatement";
import { NumericStatement } from "../statements/primitive/NumericStatement";
import { StringStatement } from "../statements/primitive/StringStatement";
import { UndefinedStatement } from "../statements/primitive/UndefinedStatement";
import { ConstructorCall } from "../statements/root/ConstructorCall";
import { FunctionCall } from "../statements/root/FunctionCall";
import { RootObject } from "../statements/root/RootObject";
import { RootStatement } from "../statements/root/RootStatement";
import { Statement } from "../statements/Statement";

import { JavaScriptTestCaseSampler } from "./JavaScriptTestCaseSampler";

export class JavaScriptRandomSampler extends JavaScriptTestCaseSampler {
  private rootContext: RootContext;

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
    exploreIllegalValues: boolean,
    rootContext: RootContext
  ) {
    super(
      subject,
      typeInferenceMode,
      randomTypeProbability,
      incorporateExecutionInformation,
      maxActionStatements,
      stringAlphabet,
      stringMaxLength,
      resampleGeneProbability,
      deltaMutationProbability,
      exploreIllegalValues
    );
    this.rootContext = rootContext;
  }

  sample(): JavaScriptTestCase {
    let root: RootStatement;

    if ((<JavaScriptSubject>this._subject).type === SubjectType.function) {
      root = this.sampleFunctionCall(0);
    } else if ((<JavaScriptSubject>this._subject).type === SubjectType.class) {
      root = this.sampleConstructor(0);
    } else if ((<JavaScriptSubject>this._subject).type === SubjectType.object) {
      root = this.sampleRootObject(0);
    }

    return new JavaScriptTestCase(root);
  }

  sampleFunctionCall(depth: number): FunctionCall {
    const action = prng.pickOne(
      (<JavaScriptSubject>this._subject).getPossibleActions(ActionType.FUNCTION)
    );

    const arguments_: Statement[] = action.parameters.map((parameter) =>
      this.sampleArgument(depth + 1, parameter)
    );

    return new FunctionCall(
      action.returnParameter,
      action.returnParameter.typeProbabilityMap.getRandomType(
        this.incorporateExecutionInformation
      ),
      prng.uniqueId(),
      action.name,
      arguments_
    );
  }

  sampleConstructor(depth: number): ConstructorCall {
    const constructors = (<JavaScriptSubject>this._subject).getPossibleActions(
      ActionType.CONSTRUCTOR
    );

    // TODO
    const typeMap = new TypeProbability([
      [
        this.subject.name,
        1,
        {
          name: this.subject.name,
          properties: new Set(), // TODO
          functions: new Set(), // tODO
        },
      ],
    ]);

    if (constructors.length > 0) {
      const action = prng.pickOne(constructors);

      const arguments_: Statement[] = action.parameters.map((parameter) =>
        this.sampleArgument(depth + 1, parameter)
      );

      const calls: Statement[] = [];
      const methods = (<JavaScriptSubject>this._subject).getPossibleActions(
        ActionType.METHOD
      );
      const getters = (<JavaScriptSubject>this._subject).getPossibleActions(
        ActionType.GET
      );
      const setters = (<JavaScriptSubject>this._subject).getPossibleActions(
        ActionType.SET
      );

      const nCalls =
        methods.length + getters.length + setters.length &&
        prng.nextInt(1, this.maxActionStatements);
      for (let index = 0; index < nCalls; index++) {
        calls.push(this.sampleMethodCall(depth + 1));
      }

      return new ConstructorCall(
        { typeProbabilityMap: typeMap, name: this.subject.name },
        this.subject.name,
        prng.uniqueId(),
        arguments_,
        calls,
        `${this.subject.name}`
      );
    } else {
      // if no constructors is available, we invoke the default (implicit) constructor

      const calls: Statement[] = [];
      const methods = (<JavaScriptSubject>this._subject).getPossibleActions(
        ActionType.METHOD
      );
      const nCalls =
        methods.length > 0 && prng.nextInt(1, this.maxActionStatements);
      for (let index = 0; index < nCalls; index++) {
        calls.push(this.sampleMethodCall(depth + 1));
      }

      return new ConstructorCall(
        { typeProbabilityMap: typeMap, name: this.subject.name },
        this.subject.name,
        prng.uniqueId(),
        [],
        calls,
        `${this._subject.name}`
      );
    }
  }

  sampleRootObject(depth: number): RootObject {
    // TODO
    const typeMap = new TypeProbability([
      [
        this.subject.name,
        1,
        {
          name: this.subject.name,
          properties: new Set(), // TODO
          functions: new Set(), // tODO
        },
      ],
    ]);

    // if no constructors is available, we invoke the default (implicit) constructor
    const calls: Statement[] = [];
    const methods = (<JavaScriptSubject>this._subject).getPossibleActions(
      ActionType.METHOD
    );
    const nCalls =
      methods.length > 0 && prng.nextInt(1, this.maxActionStatements);
    for (let index = 0; index < nCalls; index++) {
      calls.push(this.sampleMethodCall(depth + 1));
    }

    return new RootObject(
      { typeProbabilityMap: typeMap, name: this.subject.name },
      this.subject.name,
      prng.uniqueId(),
      calls
    );
  }

  sampleMethodCall(depth: number): MethodCall | Getter | Setter {
    const action = prng.pickOne([
      ...(<JavaScriptSubject>this._subject).getPossibleActions(
        ActionType.METHOD
      ),
      ...(<JavaScriptSubject>this._subject).getPossibleActions(ActionType.GET),
      ...(<JavaScriptSubject>this._subject).getPossibleActions(ActionType.SET),
    ]);

    switch (action.type) {
      case ActionType.METHOD: {
        const arguments_: Statement[] = action.parameters.map((parameter) => {
          return this.sampleArgument(depth + 1, parameter);
        });

        return new MethodCall(
          action.returnParameter,
          action.returnParameter.typeProbabilityMap.getRandomType(
            this.incorporateExecutionInformation
          ),
          prng.uniqueId(),
          action.name,
          arguments_
        );
      }
      case ActionType.GET: {
        return new Getter(
          action.returnParameter,
          action.returnParameter.typeProbabilityMap.getRandomType(
            this.incorporateExecutionInformation
          ),
          prng.uniqueId(),
          action.name
        );
      }
      case ActionType.SET: {
        // always one argument
        const arguments_: Statement[] = action.parameters.map((parameter) => {
          return this.sampleArgument(depth + 1, parameter);
        });
        return new Setter(
          action.returnParameter,
          action.returnParameter.typeProbabilityMap.getRandomType(
            this.incorporateExecutionInformation
          ),
          prng.uniqueId(),
          action.name,
          arguments_[0]
        );
      }

      // No default
    }

    throw new Error("Invalid action type: " + action.type);
  }

  sampleArgument(
    depth: number,
    identifierDescription: IdentifierDescription
  ): Statement {
    if (!identifierDescription) {
      identifierDescription = {
        name: "unnamed",
        typeProbabilityMap: new TypeProbability(),
      };
    }

    // console.log(identifierDescription.name)
    // console.log(identifierDescription.typeProbabilityMap)
    let chosenType: string;

    if (
      this.typeInferenceMode === "proportional" ||
      this.typeInferenceMode === "none"
    ) {
      chosenType = identifierDescription.typeProbabilityMap.getRandomType(
        this.incorporateExecutionInformation
      );
    } else if (this.typeInferenceMode === "ranked") {
      chosenType =
        identifierDescription.typeProbabilityMap.getHighestProbabilityType(
          this.incorporateExecutionInformation
        );
    } else {
      throw new Error("Invalid identifierDescription inference mode selected");
    }

    // this ensures that there is a chance of trying a random other identifierDescription
    if (prng.nextBoolean(this.randomTypeProbability)) {
      chosenType = "any";
    }

    if (chosenType === "any") {
      // TODO other types would also be nice (complex type especially)
      const typeOptions = [
        "function",
        "array",
        "boolean",
        "string",
        "numeric",
        "null",
        "undefined",
        "object",
      ];
      chosenType = prng.pickOne(typeOptions);

      // if (depth <= Properties.max_depth) {
      //   const complexObjects = new Map()
      //
      //   this.rootContext.typeResolver.availableTypes.forEach((t) => {
      //     [...t.objectDescription.keys()].forEach((o) => {
      //       complexObjects.set(o, t)
      //       typeOptions.push(o)
      //     })
      //   })
      //   chosenType = prng.pickOne(typeOptions)
      //
      //   if (complexObjects.has(chosenType)) {
      //     identifierDescription = {
      //       name: identifierDescription.name,
      //       typeProbabilityMap: complexObjects.get(chosenType)
      //     }
      //   }
      // }
    }

    // TODO REGEX
    switch (chosenType) {
      case "function": {
        return this.sampleArrowFunction(
          identifierDescription,
          chosenType,
          depth
        );
      }
      case "array": {
        return this.sampleArray(identifierDescription, chosenType, depth);
      }
      case "boolean": {
        return this.sampleBool(identifierDescription, chosenType);
      }
      case "string": {
        return this.sampleString(identifierDescription, chosenType);
      }
      case "numeric": {
        return this.sampleNumber(identifierDescription, chosenType);
      }
      case "null": {
        return this.sampleNull(identifierDescription, chosenType);
      }
      case "undefined": {
        return this.sampleUndefined(identifierDescription, chosenType);
      }
      default: {
        // must be object
        return this.sampleObject(identifierDescription, chosenType, depth);
      }
    }
  }

  sampleObject(
    identifierDescription: IdentifierDescription,
    type: string,
    depth: number
  ) {
    const keys: StringStatement[] = [];
    const values: Statement[] = [];

    const object =
      identifierDescription.typeProbabilityMap.getObjectDescription(type);

    if (identifierDescription.name.includes("%")) {
      throw new Error(
        `Identifiers should not include % in their names: ${identifierDescription.name}`
      );
    }
    if (object) {
      //  TODO WIP

      if (object.export) {
        const functionMap = this.rootContext.getFunctionMapSpecific(
          object.export.filePath,
          object.name
        );

        for (const key of functionMap.keys()) {
          const function_ = functionMap.get(key);
          for (const parameter of function_.parameters) {
            if (
              function_.type === ActionType.FUNCTION ||
              function_.type === ActionType.METHOD ||
              function_.type === ActionType.CONSTRUCTOR
            ) {
              parameter.typeProbabilityMap =
                this.rootContext.typeResolver.getTyping(
                  function_.scope,
                  parameter.name
                );
            } else {
              throw new Error(
                `Unimplemented action identifierDescription ${function_.type}`
              );
            }
          }

          // TODO return types
        }

        const constructors = [...functionMap.values()].filter(
          (a) =>
            a.type === ActionType.CONSTRUCTOR &&
            a.visibility === ActionVisibility.PUBLIC
        );
        const constructor = constructors.find(
          (c) => c.scope.filePath === object.export.filePath
        );

        if (constructor) {
          const arguments_: Statement[] = constructor.parameters.map(
            (parameter) => this.sampleArgument(depth + 1, parameter)
          );

          const calls: Statement[] = [];

          const methods = [...functionMap.values()].filter(
            (a) =>
              a.type === ActionType.METHOD &&
              a.visibility === ActionVisibility.PUBLIC
          );
          const nCalls =
            methods.length > 0 && prng.nextInt(1, this.maxActionStatements);
          for (let index = 0; index < nCalls; index++) {
            const action: ActionDescription = prng.pickOne(methods);
            const arguments__: Statement[] = action.parameters.map(
              (parameter) => {
                return this.sampleArgument(depth + 1, parameter);
              }
            );

            calls.push(
              new MethodCall(
                action.returnParameter,
                action.returnParameter.typeProbabilityMap.getRandomType(
                  this.incorporateExecutionInformation
                ),
                prng.uniqueId(),
                action.name,
                arguments__
              )
            );
          }

          return new ConstructorCall(
            identifierDescription,
            object.name,
            prng.uniqueId(),
            arguments_,
            calls,
            `${object.name}`
          );
        }
      }

      for (const p of object.properties) {
        if (object.functions.has(p)) {
          // prefer functions over property types
          continue;
        }

        const typeMap = new TypeProbability();
        typeMap.addType(TypeEnum.STRING, 1);

        const identifierDescriptionKey = {
          typeProbabilityMap: typeMap,
          name: p,
        };
        keys.push(
          new StringStatement(
            identifierDescriptionKey,
            TypeEnum.STRING,
            prng.uniqueId(),
            p,
            this.stringAlphabet,
            this.stringMaxLength
          )
        );

        const propertyTypings =
          identifierDescription.typeProbabilityMap.getPropertyTypes(type);

        if (propertyTypings && propertyTypings.has(p)) {
          values.push(
            this.sampleArgument(depth + 1, {
              name: `${p}`,
              typeProbabilityMap: propertyTypings.get(p),
            })
          );
        } else {
          values.push(
            this.sampleArgument(depth + 1, {
              name: `${p}`,
              typeProbabilityMap: new TypeProbability(),
            })
          );
        }
      }
      for (const f of object.functions) {
        const typeMap = new TypeProbability();
        typeMap.addType(TypeEnum.STRING, 1);

        const identifierDescriptionKey = {
          typeProbabilityMap: typeMap,
          name: f,
        };
        keys.push(
          new StringStatement(
            identifierDescriptionKey,
            TypeEnum.STRING,
            prng.uniqueId(),
            f,
            this.stringAlphabet,
            this.stringMaxLength
          )
        );

        const propertyTypings =
          identifierDescription.typeProbabilityMap.getPropertyTypes(type);

        if (propertyTypings && propertyTypings.has(f)) {
          values.push(
            this.sampleArgument(depth + 1, {
              name: f,
              typeProbabilityMap: propertyTypings.get(f),
            })
          );
        } else {
          values.push(
            this.sampleArrowFunction(
              { name: f, typeProbabilityMap: new TypeProbability() },
              undefined,
              depth + 1
            )
          );
        }
      }
    } else {
      // TODO random properties or none
    }

    if (identifierDescription.name.includes("%")) {
      throw new Error("XXX");
    }

    return new ObjectStatement(
      identifierDescription,
      type,
      prng.uniqueId(),
      keys,
      values
    );
  }

  sampleArray(
    identifierDescription: IdentifierDescription,
    type: string,
    depth: number
  ) {
    const children = [];

    for (let index = 0; index < prng.nextInt(0, 5); index++) {
      children.push(
        this.sampleArgument(depth + 1, {
          name: "arrayValue",
          typeProbabilityMap: new TypeProbability(),
        })
      );
    }
    return new ArrayStatement(
      identifierDescription,
      type,
      prng.uniqueId(),
      children
    );
  }

  sampleString(
    // eslint-disable-next-line unicorn/no-useless-undefined
    identifierDescription: IdentifierDescription | undefined = undefined,
    // eslint-disable-next-line unicorn/no-useless-undefined
    type: string | undefined = undefined,
    alphabet = this.stringAlphabet,
    maxlength = this.stringMaxLength
  ): StringStatement {
    if (!type) {
      type = TypeEnum.STRING;
    }

    if (!identifierDescription) {
      const typeMap = new TypeProbability();
      typeMap.addType(type, 1);
      identifierDescription = { typeProbabilityMap: typeMap, name: "noname" };
    }

    const valueLength = prng.nextInt(0, maxlength - 1);
    let value = "";

    for (let index = 0; index < valueLength; index++) {
      value += prng.pickOne([...alphabet]);
    }

    return new StringStatement(
      identifierDescription,
      type,
      prng.uniqueId(),
      value,
      alphabet,
      maxlength
    );
  }

  sampleNull(
    // eslint-disable-next-line unicorn/no-useless-undefined
    identifierDescription: IdentifierDescription | undefined = undefined,
    // eslint-disable-next-line unicorn/no-useless-undefined
    type: string | undefined = undefined
  ): NullStatement {
    if (!type) {
      type = TypeEnum.NULL;
    }

    if (!identifierDescription) {
      const typeMap = new TypeProbability();
      typeMap.addType(type, 1);
      identifierDescription = { typeProbabilityMap: typeMap, name: "noname" };
    }

    return new NullStatement(identifierDescription, type, prng.uniqueId());
  }

  sampleArrowFunction(
    // eslint-disable-next-line unicorn/no-useless-undefined
    identifierDescription: IdentifierDescription | undefined = undefined,
    // eslint-disable-next-line unicorn/no-useless-undefined
    type: string | undefined = undefined,
    depth: number
  ): ArrowFunctionStatement {
    if (!type) {
      type = TypeEnum.FUNCTION;
    }
    if (!identifierDescription) {
      const typeMap = new TypeProbability();
      typeMap.addType(type, 1);
      identifierDescription = { typeProbabilityMap: typeMap, name: "noname" };
    }

    // TODO expectation of return value
    return new ArrowFunctionStatement(
      identifierDescription,
      type,
      prng.uniqueId(),
      this.sampleArgument(depth + 1, {
        name: "returnValue",
        typeProbabilityMap: new TypeProbability(),
      })
    );
  }

  sampleUndefined(
    // eslint-disable-next-line unicorn/no-useless-undefined
    identifierDescription: IdentifierDescription | undefined = undefined,
    // eslint-disable-next-line unicorn/no-useless-undefined
    type: string | undefined = undefined
  ): UndefinedStatement {
    if (!type) {
      type = TypeEnum.UNDEFINED;
    }

    if (!identifierDescription) {
      const typeMap = new TypeProbability();
      typeMap.addType(type, 1);
      identifierDescription = { typeProbabilityMap: typeMap, name: "noname" };
    }

    return new UndefinedStatement(identifierDescription, type, prng.uniqueId());
  }

  sampleBool(
    // eslint-disable-next-line unicorn/no-useless-undefined
    identifierDescription: IdentifierDescription | undefined = undefined,
    // eslint-disable-next-line unicorn/no-useless-undefined
    type: string | undefined = undefined
  ): BoolStatement {
    if (!type) {
      type = TypeEnum.BOOLEAN;
    }

    if (!identifierDescription) {
      const typeMap = new TypeProbability();
      typeMap.addType(type, 1);
      identifierDescription = { typeProbabilityMap: typeMap, name: "noname" };
    }

    return new BoolStatement(
      identifierDescription,
      type,
      prng.uniqueId(),
      prng.nextBoolean()
    );
  }

  sampleNumber(
    // eslint-disable-next-line unicorn/no-useless-undefined
    identifierDescription: IdentifierDescription | undefined = undefined,
    // eslint-disable-next-line unicorn/no-useless-undefined
    type: string | undefined = undefined
  ): NumericStatement {
    if (!type) {
      type = TypeEnum.NUMERIC;
    }

    if (!identifierDescription) {
      const typeMap = new TypeProbability();
      typeMap.addType(type, 1);
      identifierDescription = { typeProbabilityMap: typeMap, name: "noname" };
    }

    // by default we create small numbers (do we need very large numbers?)
    const max = 10;
    const min = -10;

    return new NumericStatement(
      identifierDescription,
      type,
      prng.uniqueId(),
      prng.nextDouble(min, max)
    );
  }
}
