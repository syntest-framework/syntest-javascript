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
  ClassTarget,
  ComplexType,
  IdentifierDescription,
  MethodTarget,
  ObjectFunctionTarget,
  ObjectTarget,
  Relation,
  RootContext,
  TypeEnum,
  TypeProbability,
} from "@syntest/analysis-javascript";
import { prng } from "@syntest/core";

import { JavaScriptSubject } from "../../search/JavaScriptSubject";
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
import { TargetType } from "@syntest/analysis";
import { ObjectFunctionCall } from "../statements/action/ObjectFunctionCall";

export class JavaScriptRandomSampler extends JavaScriptTestCaseSampler {
  private _rootContext: RootContext;

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
  }

  set rootContext(rootContext: RootContext) {
    this._rootContext = rootContext;
  }

  sample(): JavaScriptTestCase {
    let root: RootStatement;

    const actionableTargets = (<JavaScriptSubject>(
      this._subject
    )).getActionableTargets();
    const rootTargets = actionableTargets.filter(
      (target) =>
        target.type === TargetType.FUNCTION ||
        target.type === TargetType.CLASS ||
        target.type === TargetType.OBJECT
    );

    if (rootTargets.length === 0) {
      throw new Error("No root targets found");
    }

    const rootTarget = prng.pickOne(rootTargets);

    switch (rootTarget.type) {
      case TargetType.FUNCTION: {
        root = this.sampleFunctionCall(0);

        break;
      }
      case TargetType.CLASS: {
        root = this.sampleClass(0);

        break;
      }
      case TargetType.OBJECT: {
        root = this.sampleRootObject(0);

        break;
      }
      // No default
    }

    return new JavaScriptTestCase(root);
  }

  sampleFunctionCall(depth: number): FunctionCall {
    // get a random function
    const action = prng.pickOne(
      (<JavaScriptSubject>this._subject).getActionableTargetsByType(
        TargetType.FUNCTION
      )
    );

    console.log(action.id);
    // get the relation of the function
    const relation: Relation = this._rootContext.typeResolver.getRelation(
      action.id
    );
    const [_function, ...parameters] = relation.involved;

    const arguments_: Statement[] = parameters.map((parameter) => {
      const element = this._rootContext.typeResolver.getElement(parameter);
      const type = this._rootContext.typeResolver.getTyping(parameter);

      const identifierDescription: IdentifierDescription = {
        name: element.type === "identifier" ? element.name : element.value,
        typeProbabilityMap: type,
      };

      return this.sampleArgument(depth + 1, identifierDescription);
    });

    const functionElement =
      this._rootContext.typeResolver.getElement(_function);
    const functionType = this._rootContext.typeResolver.getTyping(_function);
    const functionName =
      functionElement.type === "identifier"
        ? functionElement.name
        : functionElement.value;

    const identifierDescription: IdentifierDescription = {
      name: `return_${functionName}`,
      typeProbabilityMap: functionType,
    };

    return new FunctionCall(
      identifierDescription,
      identifierDescription.typeProbabilityMap.getRandomType(
        this.incorporateExecutionInformation
      ),
      prng.uniqueId(),
      functionName,
      arguments_
    );
  }
  sampleClass(depth: number): ConstructorCall {
    // get a random class
    const class_ = <ClassTarget>(
      prng.pickOne(
        (<JavaScriptSubject>this._subject).getActionableTargetsByType(
          TargetType.CLASS
        )
      )
    );

    return this.sampleSpecificClass(depth, class_.id);
  }

  sampleSpecificClass(depth: number, id: string): ConstructorCall {
    const classElement = this._rootContext.typeResolver.getElement(id);
    const classType = this._rootContext.typeResolver.getTyping(id);
    const className =
      classElement.type === "identifier"
        ? classElement.name
        : classElement.value;

    const identifierDescription: IdentifierDescription = {
      name: className,
      typeProbabilityMap: classType,
    };

    // get the constructor of the class
    const constructor_ = (<JavaScriptSubject>this._subject)
      .getActionableTargetsByType(TargetType.METHOD)
      .filter(
        (method) =>
          (<MethodTarget>method).className === className &&
          (<MethodTarget>method).methodType === "constructor"
      );
    if (constructor_.length > 1) {
      throw new Error("Multiple constructors found for class");
    } else if (constructor_.length === 0) {
      // default constructor

      const calls: Statement[] = [];
      const methods = (<JavaScriptSubject>this._subject)
        .getActionableTargetsByType(TargetType.METHOD)
        .filter(
          (method) =>
            (<MethodTarget>method).className === className &&
            (<MethodTarget>method).methodType === "method"
        );
      const getters = (<JavaScriptSubject>this._subject)
        .getActionableTargetsByType(TargetType.METHOD)
        .filter(
          (method) =>
            (<MethodTarget>method).className === className &&
            (<MethodTarget>method).methodType === "get"
        );
      const setters = (<JavaScriptSubject>this._subject)
        .getActionableTargetsByType(TargetType.METHOD)
        .filter(
          (method) =>
            (<MethodTarget>method).className === className &&
            (<MethodTarget>method).methodType === "set"
        );

      const nCalls =
        methods.length + getters.length + setters.length &&
        prng.nextInt(1, this.maxActionStatements);
      for (let index = 0; index < nCalls; index++) {
        calls.push(this.sampleMethodCall(depth + 1, className));
      }

      return new ConstructorCall(
        identifierDescription,
        className,
        prng.uniqueId(),
        [],
        calls,
        className
      );
    } else {
      const action = constructor_[0];

      // get the relation of the constructor
      const relation: Relation = this._rootContext.typeResolver.getRelation(
        action.id
      );
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [_function, ...parameters] = relation.involved;

      const arguments_: Statement[] = parameters.map((parameter) => {
        const element = this._rootContext.typeResolver.getElement(parameter);
        const type = this._rootContext.typeResolver.getTyping(parameter);

        const identifierDescription: IdentifierDescription = {
          name: element.type === "identifier" ? element.name : element.value,
          typeProbabilityMap: type,
        };

        return this.sampleArgument(depth + 1, identifierDescription);
      });

      const calls: Statement[] = [];
      const methods = (<JavaScriptSubject>this._subject)
        .getActionableTargetsByType(TargetType.METHOD)
        .filter(
          (method) =>
            (<MethodTarget>method).className === className &&
            (<MethodTarget>method).methodType === "method"
        );
      const getters = (<JavaScriptSubject>this._subject)
        .getActionableTargetsByType(TargetType.METHOD)
        .filter(
          (method) =>
            (<MethodTarget>method).className === className &&
            (<MethodTarget>method).methodType === "get"
        );
      const setters = (<JavaScriptSubject>this._subject)
        .getActionableTargetsByType(TargetType.METHOD)
        .filter(
          (method) =>
            (<MethodTarget>method).className === className &&
            (<MethodTarget>method).methodType === "set"
        );

      const nCalls =
        methods.length + getters.length + setters.length &&
        prng.nextInt(1, this.maxActionStatements);
      for (let index = 0; index < nCalls; index++) {
        calls.push(this.sampleMethodCall(depth + 1, className));
      }

      return new ConstructorCall(
        identifierDescription,
        className,
        prng.uniqueId(),
        arguments_,
        calls,
        className
      );
    }
  }

  sampleMethodCall(
    depth: number,
    className: string
  ): MethodCall | Getter | Setter {
    const methods = (<JavaScriptSubject>this._subject)
      .getActionableTargetsByType(TargetType.METHOD)
      .filter(
        (method) =>
          (<MethodTarget>method).className === className &&
          (<MethodTarget>method).methodType === "method"
      );
    const getters = (<JavaScriptSubject>this._subject)
      .getActionableTargetsByType(TargetType.METHOD)
      .filter(
        (method) =>
          (<MethodTarget>method).className === className &&
          (<MethodTarget>method).methodType === "get"
      );
    const setters = (<JavaScriptSubject>this._subject)
      .getActionableTargetsByType(TargetType.METHOD)
      .filter(
        (method) =>
          (<MethodTarget>method).className === className &&
          (<MethodTarget>method).methodType === "set"
      );

    const action = <MethodTarget>(
      prng.pickOne([...methods, ...getters, ...setters])
    );

    // get the relation of the method
    const relation: Relation = this._rootContext.typeResolver.getRelation(
      action.id
    );
    const [_function, ...parameters] = relation.involved;

    const methodElement = this._rootContext.typeResolver.getElement(_function);
    const methodType = this._rootContext.typeResolver.getTyping(_function);
    const methodName =
      methodElement.type === "identifier"
        ? methodElement.name
        : methodElement.value;

    const identifierDescription: IdentifierDescription = {
      name: `return_${methodName}`,
      typeProbabilityMap: methodType,
    };

    switch (action.methodType) {
      case "method": {
        const arguments_: Statement[] = parameters.map((parameter) => {
          const element = this._rootContext.typeResolver.getElement(parameter);
          const type = this._rootContext.typeResolver.getTyping(parameter);

          const identifierDescription: IdentifierDescription = {
            name: element.type === "identifier" ? element.name : element.value,
            typeProbabilityMap: type,
          };

          return this.sampleArgument(depth + 1, identifierDescription);
        });

        return new MethodCall(
          identifierDescription,
          identifierDescription.typeProbabilityMap.getRandomType(
            this.incorporateExecutionInformation
          ),
          prng.uniqueId(),
          className,
          methodName,
          arguments_
        );
      }
      case "get": {
        return new Getter(
          identifierDescription,
          identifierDescription.typeProbabilityMap.getRandomType(
            this.incorporateExecutionInformation
          ),
          prng.uniqueId(),
          className,
          methodName
        );
      }
      case "set": {
        // always one argument
        const arguments_: Statement[] = parameters.map((parameter) => {
          const element = this._rootContext.typeResolver.getElement(parameter);
          const type = this._rootContext.typeResolver.getTyping(parameter);

          const identifierDescription: IdentifierDescription = {
            name: element.type === "identifier" ? element.name : element.value,
            typeProbabilityMap: type,
          };

          return this.sampleArgument(depth + 1, identifierDescription);
        });
        return new Setter(
          identifierDescription,
          identifierDescription.typeProbabilityMap.getRandomType(
            this.incorporateExecutionInformation
          ),
          prng.uniqueId(),
          className,
          methodName,
          arguments_[0]
        );
      }

      // No default
    }

    throw new Error("Invalid action type: " + action.type);
  }

  sampleRootObject(depth: number): RootObject {
    // get a random object
    const object_ = <ObjectTarget>(
      prng.pickOne(
        (<JavaScriptSubject>this._subject).getActionableTargetsByType(
          TargetType.OBJECT
        )
      )
    );

    const objectElement = this._rootContext.typeResolver.getElement(object_.id);
    const objectType = this._rootContext.typeResolver.getTyping(object_.id);
    const objectName =
      objectElement.type === "identifier"
        ? objectElement.name
        : objectElement.value;

    const identifierDescription: IdentifierDescription = {
      name: objectName,
      typeProbabilityMap: objectType,
    };

    const calls: Statement[] = [];
    const functions = (<JavaScriptSubject>this._subject)
      .getActionableTargetsByType(TargetType.OBJECT_FUNCTION)
      .filter(
        (function_) =>
          (<ObjectFunctionTarget>function_).objectName === object_.name
      );

    const nCalls =
      functions.length > 0 && prng.nextInt(1, this.maxActionStatements);
    for (let index = 0; index < nCalls; index++) {
      calls.push(this.sampleObjectFunctionCall(depth + 1, object_.name));
    }

    return new RootObject(
      identifierDescription,
      objectName,
      prng.uniqueId(),
      objectName,
      calls
    );
  }

  sampleObjectFunctionCall(
    depth: number,
    objectName: string
  ): ObjectFunctionCall {
    const functions = (<JavaScriptSubject>this._subject)
      .getActionableTargetsByType(TargetType.OBJECT_FUNCTION)
      .filter(
        (function_) =>
          (<ObjectFunctionTarget>function_).objectName === objectName
      );

    const action = prng.pickOne(functions);

    // get the relation of the function
    const relation: Relation = this._rootContext.typeResolver.getRelation(
      action.id
    );
    const [_function, ...parameters] = relation.involved;

    const arguments_: Statement[] = parameters.map((parameter) => {
      const element = this._rootContext.typeResolver.getElement(parameter);
      const type = this._rootContext.typeResolver.getTyping(parameter);

      const identifierDescription: IdentifierDescription = {
        name: element.type === "identifier" ? element.name : element.value,
        typeProbabilityMap: type,
      };

      return this.sampleArgument(depth + 1, identifierDescription);
    });

    const functionElement =
      this._rootContext.typeResolver.getElement(_function);
    const functionType = this._rootContext.typeResolver.getTyping(_function);
    const functionName =
      functionElement.type === "identifier"
        ? functionElement.name
        : functionElement.value;

    const identifierDescription: IdentifierDescription = {
      name: `return_${functionName}`,
      typeProbabilityMap: functionType,
    };

    return new ObjectFunctionCall(
      identifierDescription,
      identifierDescription.typeProbabilityMap.getRandomType(
        this.incorporateExecutionInformation
      ),
      prng.uniqueId(),
      objectName,
      functionName,
      arguments_
    );
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
    if (!identifierDescription.typeProbabilityMap.isComplexType(type)) {
      throw new Error(
        `Type ${type} is not a complex type, but was passed to sampleObject`
      );
    }

    const keys: StringStatement[] = [];
    const values: Statement[] = [];

    const complexType: ComplexType =
      identifierDescription.typeProbabilityMap.getComplexType(type);

    const filePath = complexType.id.split("::")[0];
    const export_ = this._rootContext
      .getExports(filePath)
      .find((export_) => export_.id === complexType.id);

    if (export_) {
      // TODO
      // const functionMap = this.rootContext.getFunctionMapSpecific(
      //   complexType.export.filePath,
      //   complexType.name
      // );
      // for (const key of functionMap.keys()) {
      //   const function_ = functionMap.get(key);
      //   for (const parameter of function_.parameters) {
      //     if (
      //       function_.type === ActionType.FUNCTION ||
      //       function_.type === ActionType.METHOD ||
      //       function_.type === ActionType.CONSTRUCTOR
      //     ) {
      //       parameter.typeProbabilityMap =
      //         this.rootContext.typeResolver.getTyping(
      //           function_.scope,
      //           parameter.name
      //         );
      //     } else {
      //       throw new Error(
      //         `Unimplemented action identifierDescription ${function_.type}`
      //       );
      //     }
      //   }
      //   // TODO return types
      // }
      // const constructors = [...functionMap.values()].filter(
      //   (a) =>
      //     a.type === ActionType.CONSTRUCTOR &&
      //     a.visibility === ActionVisibility.PUBLIC
      // );
      // const constructor = constructors.find(
      //   (c) => c.scope.filePath === complexType.export.filePath
      // );
      // if (constructor) {
      //   const arguments_: Statement[] = constructor.parameters.map(
      //     (parameter) => this.sampleArgument(depth + 1, parameter)
      //   );
      //   const calls: Statement[] = [];
      //   const methods = [...functionMap.values()].filter(
      //     (a) =>
      //       a.type === ActionType.METHOD &&
      //       a.visibility === ActionVisibility.PUBLIC
      //   );
      //   const nCalls =
      //     methods.length > 0 && prng.nextInt(1, this.maxActionStatements);
      //   for (let index = 0; index < nCalls; index++) {
      //     const action: ActionDescription = prng.pickOne(methods);
      //     const arguments__: Statement[] = action.parameters.map(
      //       (parameter) => {
      //         return this.sampleArgument(depth + 1, parameter);
      //       }
      //     );
      //     calls.push(
      //       new MethodCall(
      //         action.returnParameter,
      //         action.returnParameter.typeProbabilityMap.getRandomType(
      //           this.incorporateExecutionInformation
      //         ),
      //         prng.uniqueId(),
      //         action.name,
      //         arguments__
      //       )
      //     );
      //   }
      //   return new ConstructorCall(
      //     identifierDescription,
      //     complexType.name,
      //     prng.uniqueId(),
      //     arguments_,
      //     calls,
      //     `${complexType.name}`
      //   );
      // }
    }

    for (const [key, value] of complexType.properties.entries()) {
      const typeMap = new TypeProbability();
      typeMap.addType(TypeEnum.STRING, 1);

      const identifierDescriptionKey: IdentifierDescription = {
        typeProbabilityMap: typeMap,
        name: key,
      };
      keys.push(
        new StringStatement(
          identifierDescriptionKey,
          TypeEnum.STRING,
          prng.uniqueId(),
          key,
          this.stringAlphabet,
          this.stringMaxLength
        )
      );

      const propertyType = this._rootContext.typeResolver.getTyping(value);

      values.push(
        this.sampleArgument(depth + 1, {
          name: key,
          typeProbabilityMap: propertyType,
        })
      );
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
