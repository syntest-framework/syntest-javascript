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

import { JavaScriptTestCaseSampler } from "./JavaScriptTestCaseSampler";
import { JavaScriptTestCase } from "../JavaScriptTestCase";
import { prng } from "@syntest/core";
import { ConstructorCall } from "../statements/root/ConstructorCall";
import { MethodCall } from "../statements/action/MethodCall";
import { BoolStatement } from "../statements/primitive/BoolStatement";
import { StringStatement } from "../statements/primitive/StringStatement";
import { NumericStatement } from "../statements/primitive/NumericStatement";
import { RootStatement } from "../statements/root/RootStatement";
import { Statement } from "../statements/Statement";
import { FunctionCall } from "../statements/root/FunctionCall";
import { JavaScriptSubject, SubjectType } from "../../search/JavaScriptSubject";
import { ArrowFunctionStatement } from "../statements/complex/ArrowFunctionStatement";
import { ActionDescription } from "../../analysis/static/parsing/ActionDescription";
import { ActionType } from "../../analysis/static/parsing/ActionType";
import { IdentifierDescription } from "../../analysis/static/parsing/IdentifierDescription";
import { ArrayStatement } from "../statements/complex/ArrayStatement";
import { ObjectStatement } from "../statements/complex/ObjectStatement";
import { TypeProbability } from "../../analysis/static/types/TypeProbability";
import { TypeEnum } from "../../analysis/static/types/TypeEnum";
import { NullStatement } from "../statements/primitive/NullStatement";
import { UndefinedStatement } from "../statements/primitive/UndefinedStatement";
import { ActionVisibility } from "../../analysis/static/parsing/ActionVisibility";
import { JavaScriptTargetPool } from "../../analysis/static/JavaScriptTargetPool";
import { RootObject } from "../statements/root/RootObject";
import { Getter } from "../statements/action/Getter";
import { Setter } from "../statements/action/Setter";
import { TypeSelector } from "../../analysis/static/types/selecting/TypeSelector";

export class JavaScriptRandomSampler extends JavaScriptTestCaseSampler {
  private targetPool: JavaScriptTargetPool;
  private typeSelector: TypeSelector;

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
    targetPool: JavaScriptTargetPool,
    typeSelector: TypeSelector
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
    this.targetPool = targetPool;
    this.typeSelector = typeSelector;
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
    const action = <ActionDescription>(
      prng.pickOne(
        (<JavaScriptSubject>this._subject).getPossibleActions(
          ActionType.FUNCTION
        )
      )
    );

    const args: Statement[] = action.parameters.map((param) =>
      this.sampleArgument(depth + 1, param)
    );

    return new FunctionCall(
      action.returnParameter,
      this.typeSelector.selectType(action.returnParameter.typeProbabilityMap),
      prng.uniqueId(),
      action.name,
      args
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
      const action = <ActionDescription>prng.pickOne(constructors);

      const args: Statement[] = action.parameters.map((param) =>
        this.sampleArgument(depth + 1, param)
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
      for (let i = 0; i < nCalls; i++) {
        calls.push(this.sampleMethodCall(depth + 1));
      }

      return new ConstructorCall(
        { typeProbabilityMap: typeMap, name: this.subject.name },
        this.subject.name,
        prng.uniqueId(),
        args,
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
        methods.length && prng.nextInt(1, this.maxActionStatements);
      for (let i = 0; i < nCalls; i++) {
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
      const calls: Statement[] = [];
      const methods = (<JavaScriptSubject>this._subject).getPossibleActions(
        ActionType.METHOD
      );
      const nCalls =
        methods.length && prng.nextInt(1, this.maxActionStatements);
      for (let i = 0; i < nCalls; i++) {
        calls.push(this.sampleMethodCall(depth + 1));
      }

      return new RootObject(
        { typeProbabilityMap: typeMap, name: this.subject.name },
        this.subject.name,
        prng.uniqueId(),
        calls
      );
    } else {
      // if no constructors is available, we invoke the default (implicit) constructor
      const calls: Statement[] = [];
      const methods = (<JavaScriptSubject>this._subject).getPossibleActions(
        ActionType.METHOD
      );
      const nCalls =
        methods.length && prng.nextInt(1, this.maxActionStatements);
      for (let i = 0; i < nCalls; i++) {
        calls.push(this.sampleMethodCall(depth + 1));
      }

      return new RootObject(
        { typeProbabilityMap: typeMap, name: this.subject.name },
        this.subject.name,
        prng.uniqueId(),
        calls
      );
    }
  }

  sampleMethodCall(depth: number): MethodCall | Getter | Setter {
    const action = <ActionDescription>(
      prng.pickOne([
        ...(<JavaScriptSubject>this._subject).getPossibleActions(
          ActionType.METHOD
        ),
        ...(<JavaScriptSubject>this._subject).getPossibleActions(
          ActionType.GET
        ),
        ...(<JavaScriptSubject>this._subject).getPossibleActions(
          ActionType.SET
        ),
      ])
    );

    if (action.type === ActionType.METHOD) {
      const args: Statement[] = action.parameters.map((param) => {
        return this.sampleArgument(depth + 1, param);
      });

      return new MethodCall(
        action.returnParameter,
        this.typeSelector.selectType(action.returnParameter.typeProbabilityMap),
        prng.uniqueId(),
        action.name,
        args
      );
    } else if (action.type === ActionType.GET) {
      return new Getter(
        action.returnParameter,
        this.typeSelector.selectType(action.returnParameter.typeProbabilityMap),
        prng.uniqueId(),
        action.name
      );
    } else if (action.type === ActionType.SET) {
      // always one argument
      const args: Statement[] = action.parameters.map((param) => {
        return this.sampleArgument(depth + 1, param);
      });
      return new Setter(
        action.returnParameter,
        this.typeSelector.selectType(action.returnParameter.typeProbabilityMap),
        prng.uniqueId(),
        action.name,
        args[0]
      );
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
    let chosenType = this.typeSelector.selectType(
      identifierDescription.typeProbabilityMap
    );

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
      //   this.targetPool.typeResolver.availableTypes.forEach((t) => {
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
    if (chosenType === "function") {
      return this.sampleArrowFunction(identifierDescription, chosenType, depth);
    } else if (chosenType === "array") {
      return this.sampleArray(identifierDescription, chosenType, depth);
    } else if (chosenType === "boolean") {
      return this.sampleBool(identifierDescription, chosenType);
    } else if (chosenType === "string") {
      return this.sampleString(identifierDescription, chosenType);
    } else if (chosenType === "numeric") {
      return this.sampleNumber(identifierDescription, chosenType);
    } else if (chosenType === "null") {
      return this.sampleNull(identifierDescription, chosenType);
    } else if (chosenType === "undefined") {
      return this.sampleUndefined(identifierDescription, chosenType);
    } else {
      // must be object
      return this.sampleObject(identifierDescription, chosenType, depth);
    }

    throw new Error(`Unknown type!\n${JSON.stringify(chosenType, null, 2)}`);
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
        const functionMap = this.targetPool.getFunctionMapSpecific(
          object.export.filePath,
          object.name
        );

        for (const key of functionMap.keys()) {
          const func = functionMap.get(key);
          for (const param of func.parameters) {
            if (func.type === ActionType.FUNCTION) {
              param.typeProbabilityMap = this.targetPool.typeResolver.getTyping(
                func.scope,
                param.name
              );
            } else if (
              func.type === ActionType.METHOD ||
              func.type === ActionType.CONSTRUCTOR
            ) {
              param.typeProbabilityMap = this.targetPool.typeResolver.getTyping(
                func.scope,
                param.name
              );
            } else {
              throw new Error(
                `Unimplemented action identifierDescription ${func.type}`
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
          const args: Statement[] = constructor.parameters.map((param) =>
            this.sampleArgument(depth + 1, param)
          );

          const calls: Statement[] = [];

          const methods = [...functionMap.values()].filter(
            (a) =>
              a.type === ActionType.METHOD &&
              a.visibility === ActionVisibility.PUBLIC
          );
          const nCalls =
            methods.length && prng.nextInt(1, this.maxActionStatements);
          for (let i = 0; i < nCalls; i++) {
            const action: ActionDescription = prng.pickOne(methods);
            const args: Statement[] = action.parameters.map((param) => {
              return this.sampleArgument(depth + 1, param);
            });

            calls.push(
              new MethodCall(
                action.returnParameter,
                this.typeSelector.selectType(
                  action.returnParameter.typeProbabilityMap
                ),
                prng.uniqueId(),
                action.name,
                args
              )
            );
          }

          return new ConstructorCall(
            identifierDescription,
            object.name,
            prng.uniqueId(),
            args,
            calls,
            `${object.name}`
          );
        }
      }

      object.properties.forEach((p) => {
        if (object.functions.has(p)) {
          // prefer functions over property types
          return;
        }

        const typeMap = new TypeProbability();
        typeMap.addType(TypeEnum.STRING, 1, null);

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
      });
      object.functions.forEach((f) => {
        const typeMap = new TypeProbability();
        typeMap.addType(TypeEnum.STRING, 1, null);

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
              null,
              depth + 1
            )
          );
        }
      });
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

    for (let i = 0; i < prng.nextInt(0, 5); i++) {
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
    identifierDescription: IdentifierDescription = null,
    type: string = null,
    alphabet = this.stringAlphabet,
    maxlength = this.stringMaxLength
  ): StringStatement {
    if (!type) {
      type = TypeEnum.STRING;
    }

    if (!identifierDescription) {
      const typeMap = new TypeProbability();
      typeMap.addType(type, 1, null);
      identifierDescription = { typeProbabilityMap: typeMap, name: "noname" };
    }

    const valueLength = prng.nextInt(0, maxlength - 1);
    let value = "";

    for (let i = 0; i < valueLength; i++) {
      value += prng.pickOne(alphabet.split(""));
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
    identifierDescription: IdentifierDescription = null,
    type: string = null
  ): NullStatement {
    if (!type) {
      type = TypeEnum.NULL;
    }

    if (!identifierDescription) {
      const typeMap = new TypeProbability();
      typeMap.addType(type, 1, null);
      identifierDescription = { typeProbabilityMap: typeMap, name: "noname" };
    }

    return new NullStatement(identifierDescription, type, prng.uniqueId());
  }

  sampleArrowFunction(
    identifierDescription: IdentifierDescription = null,
    type: string = null,
    depth: number
  ): ArrowFunctionStatement {
    if (!type) {
      type = TypeEnum.FUNCTION;
    }
    if (!identifierDescription) {
      const typeMap = new TypeProbability();
      typeMap.addType(type, 1, null);
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
    identifierDescription: IdentifierDescription = null,
    type: string = null
  ): UndefinedStatement {
    if (!type) {
      type = TypeEnum.UNDEFINED;
    }

    if (!identifierDescription) {
      const typeMap = new TypeProbability();
      typeMap.addType(type, 1, null);
      identifierDescription = { typeProbabilityMap: typeMap, name: "noname" };
    }

    return new UndefinedStatement(identifierDescription, type, prng.uniqueId());
  }

  sampleBool(
    identifierDescription: IdentifierDescription = null,
    type: string = null
  ): BoolStatement {
    if (!type) {
      type = TypeEnum.BOOLEAN;
    }

    if (!identifierDescription) {
      const typeMap = new TypeProbability();
      typeMap.addType(type, 1, null);
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
    identifierDescription: IdentifierDescription = null,
    type: string = null
  ): NumericStatement {
    if (!type) {
      type = TypeEnum.NUMERIC;
    }

    if (!identifierDescription) {
      const typeMap = new TypeProbability();
      typeMap.addType(type, 1, null);
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
