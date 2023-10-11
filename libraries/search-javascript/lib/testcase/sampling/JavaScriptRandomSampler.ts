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
  Action,
  ConstantPoolManager,
  DiscoveredObjectKind,
} from "@syntest/analysis-javascript";
import { getLogger, Logger } from "@syntest/logging";
import { prng } from "@syntest/prng";

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

import { JavaScriptTestCaseSampler } from "./JavaScriptTestCaseSampler";

export class JavaScriptRandomSampler extends JavaScriptTestCaseSampler {
  private static LOGGER: Logger
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
    super(
      subject,
      constantPoolManager,
      constantPoolEnabled,
      constantPoolProbability,
      typePoolEnabled,
      typePoolProbability,
      statementPoolEnabled,
      statementPoolProbability,
      typeInferenceMode,
      randomTypeProbability,
      incorporateExecutionInformation,
      maxActionStatements,
      stringAlphabet,
      stringMaxLength,
      deltaMutationProbability,
      exploreIllegalValues
    );

    JavaScriptRandomSampler.LOGGER = getLogger(JavaScriptRandomSampler.name)
  }

  sample(): JavaScriptTestCase {
    JavaScriptRandomSampler.LOGGER.debug('Sampling Encoding')
    console.log("SAMPLING ENCODING")
    const roots: ActionStatement[] = [];

    for (
      let index = 0;
      index < prng.nextInt(1, this.maxActionStatements); // (i think its better to start with a single statement)
      index++
    ) {
      this.statementPool = new StatementPool(roots);
      roots.push(this.sampleFunctionCall(0));
    }
    this.statementPool = undefined;

    return new JavaScriptTestCase(roots);
  }


  override sampleParentAction(depth: number, action: Action): ActionStatement {
    const actions = this.rootContext
        .getAllActions()
        .get(action.filePath)
    const parentAction = actions.get(action.parentId)
    return parentAction ? this.sampleMemberStatement(depth, parentAction, action.name) : this.sampleImportStatement(depth, action);
  }

  sampleSpecificFunctionCall(depth: number, action: string | Action): FunctionCall {
    JavaScriptRandomSampler.LOGGER.debug('Sampling Function')

    if (typeof action === 'string') {
      const actions = this.rootContext
        .getAllActions()
        .get(action.split(':')[0])

      action = actions.get(action)
      // TODO what if not existing
    }

    const id = action.id
      
    const type_ = this.rootContext
      .getTypeModel()
      .getObjectDescription(id);

    const arguments_: Statement[] = this.sampleArguments(depth, type_);

    const parent: Statement = this.sampleParentAction(depth + 1, action)

    return new FunctionCall(
      id,
      id,
      action.name,
      prng.uniqueId(),
      action,
      arguments_,
      parent
    );
  }

  sampleFunctionCall(depth: number): FunctionCall {
    // TODO statement stuff
    // if (this.statementPoolEnabled) {
    //   const constructor_ = this.statementPool.getRandomConstructor();

    //   if (constructor_ && prng.nextBoolean(this.statementPoolProbability)) {
    //     // TODO ignoring getters and setters for now
    //     const actions = Object.values(
    //       this.rootContext
    //       .getAllActions()
    //       .get(constructor_.typeIdentifier.split(":")[0])
    //       .get(constructor_.action.id)
    //       .children
    //     ).filter((x) => x.name === 'constructor')

    //     if (actions.length > 0) {
    //       const action = prng.pickOne(actions);

    //       const type_ = this.rootContext
    //         .getTypeModel()
    //         .getObjectDescription(action.id);

    //       const arguments_: Statement[] =
    //         this.sampleArguments(0, type_);

    //       return new FunctionCall(
    //         action.id,
    //         action.id,
    //         action.name,
    //         prng.uniqueId(),
    //         arguments_,
    //         action,
    //         constructor_
    //       );
    //     }
    //   }
    // }

    // get a random function
    const actions = (<JavaScriptSubject>this._subject).functionActions
    const action = prng.pickOne(actions)

    if (action.name === 'constructor') {
      return this.sampleSpecificConstructorCall(depth, action)
    }

    return this.sampleSpecificFunctionCall(depth, action)
  }

  sampleSpecificConstructorCall(depth: number, action: string | Action): ConstructorCall {
    // TODO could make this more efficient by having either an id or action as argument

    // TODO statement pool
        // if (this.statementPoolEnabled) {
    //   const statementFromPool =
    //     this.statementPool.getRandomConstructor(action);

    //   if (
    //     statementFromPool &&
    //     prng.nextBoolean(this.statementPoolProbability)
    //   ) {
    //     return statementFromPool;
    //   }
    // }

    if (typeof action === 'string') {
      const actions = this.rootContext
        .getAllActions()
        .get(action.split(':')[0])

      action = actions.get(action)
      // TODO what if not existing
    }

    const id = action.id

    const type_ = this.rootContext
      .getTypeModel()
      .getObjectDescription(id);

    // TODO what if not existing

    const arguments_: Statement[] = this.sampleArguments(depth, type_);

    const parent = this.sampleParentAction(depth + 1, action)

    return new ConstructorCall(
      id,
      id,
      action.name,
      prng.uniqueId(),
      action,
      arguments_,
      parent
    );
  }

  sampleConstructorCall(depth: number): ConstructorCall {
    // get a random class
    const classActions = (<JavaScriptSubject>this._subject).constructableActions
    const classAction = prng.pickOne(classActions)
    const constructorAction = classAction.hasOwnProperty('constructor') ? classAction.children['constructor'] : undefined

    if (constructorAction) {
      return this.sampleSpecificConstructorCall(
        depth,
        constructorAction.id
      );
    } else {
      const parent = this.sampleParentAction(depth + 1, classAction)
      // default constructor no args
      return new ConstructorCall(
        classAction.id,
        classAction.id,
        classAction.name,
        prng.uniqueId(),
        classAction,
        [],
        parent
      );
    }
  }

  sampleMemberStatement(
    depth: number,
    parentAction: Action,
    key: string
  ): MemberStatement {
    let parent: Statement
    if (parentAction.type === 'function') {
      parent = this.sampleSpecificFunctionCall(depth + 1, parentAction)
    } else if (parentAction.type === 'object') {
      if (parentAction.constructable) {
        parent = this.sampleSpecificConstructorCall(depth + 1, parentAction)
      } else {
        // get higher parent
        parent = this.sampleParentAction(depth + 1, parentAction)
      }
    } else {
      // TODO
      throw new Error("not supported yet")
    }

    return new MemberStatement(
      '',
      '',
      key,
      prng.uniqueId(),
      parentAction,
      parent,
      key
    )
  }

  sampleImportStatement(
    depth: number,
    action: Action
  ): ImportStatement {
    return new ImportStatement(
      "",
      "",
      "import",
      prng.uniqueId(),
      action
    )
  }

  // arguments
  sampleArrayArgument(depth: number, arrayId: string): Statement {
    const arrayType = this.rootContext
      .getTypeModel()
      .getObjectDescription(arrayId);

    const childIds = [...arrayType.elements];

    if (childIds.length === 0) {
      // TODO should be done in the typemodel somehow
      // maybe create types for the subproperties by doing /main/array/id::1::1[element-index]
      // maybe create types for the subproperties by doing /main/array/id::1::1.property
      return this.sampleArgument(depth, "anon", "arrayElement");
    }

    const element = prng.pickOne(childIds);
    return this.sampleArgument(depth, element, "arrayElement");
  }

  sampleObjectArgument(
    depth: number,
    objectTypeId: string,
    property: string
  ): Statement {
    const objectType = this.rootContext
      .getTypeModel()
      .getObjectDescription(objectTypeId);

    const value = objectType.properties.get(property);
    if (!value) {
      throw new Error(
        `Property ${property} not found in object ${objectTypeId}`
      );
    }

    return this.sampleArgument(depth, value, property);
  }

  sampleArgument(depth: number, id: string, name: string): Statement {
    if (depth > 10) {
      // max depth
      // TODO should be any primitive type
      return this.sampleBool(id, id, name);
    }

    let chosenType: string;

    switch (this.typeInferenceMode) {
      case "none": {
        chosenType = this.rootContext
          .getTypeModel()
          .getRandomType(false, 1, id);

        break;
      }
      case "proportional": {
        chosenType = this.rootContext
          .getTypeModel()
          .getRandomType(
            this.incorporateExecutionInformation,
            this.randomTypeProbability,
            id
          );

        break;
      }
      case "ranked": {
        chosenType = this.rootContext
          .getTypeModel()
          .getHighestProbabilityType(
            this.incorporateExecutionInformation,
            this.randomTypeProbability,
            id
          );

        break;
      }
      default: {
        throw new Error(
          "Invalid identifierDescription inference mode selected"
        );
      }
    }

    // take from pool
    if (this.statementPoolEnabled) {
      const statementFromPool =
        this.statementPool.getRandomStatement(chosenType);

      if (
        statementFromPool &&
        prng.nextBoolean(this.statementPoolProbability)
      ) {
        return statementFromPool;
      }
    }

    const typeId = chosenType.includes("<>") ? chosenType.split("<>")[0] : id;
    const type = chosenType.includes("<>")
      ? chosenType.split("<>")[1]
      : chosenType;

    switch (type) {
      case "boolean": {
        return this.sampleBool(id, typeId, name);
      }
      case "string": {
        return this.sampleString(id, typeId, name);
      }
      case "numeric": {
        return this.sampleNumber(id, typeId, name);
      }
      case "integer": {
        return this.sampleInteger(id, typeId, name);
      }
      case "null": {
        return this.sampleNull(id, typeId, name);
      }
      case "undefined": {
        return this.sampleUndefined(id, typeId, name);
      }
      case "object": {
        return this.sampleObject(depth, id, typeId, name);
      }
      case "array": {
        return this.sampleArray(depth, id, typeId, name);
      }
      case "function": {
        return this.sampleArrowFunction(depth, id, typeId, name);
      }
      case "regex": {
        // TODO REGEX
        return this.sampleString(id, typeId, name);
      }
    }

    throw new Error(`unknown type: ${chosenType}`);
  }

  sampleObject(depth: number, id: string, typeId: string, name: string) {
    const typeObject = this.rootContext
      .getTypeModel()
      .getObjectDescription(typeId);

    if (this.typePoolEnabled) {
      // TODO maybe we should sample from the typepool for the other stuff as well (move this to sample arg for example)
      const typeFromTypePool = this.rootContext
        .getTypePool()
        // .getRandomMatchingType(typeObject)
        // TODO this prevents ONLY allows sampling of matching class constructors
        .getRandomMatchingType(
          typeObject,
          (type_) => type_.kind === DiscoveredObjectKind.CLASS
        );

      if (typeFromTypePool && prng.nextBoolean(this.typePoolProbability)) {
        // always prefer type from type pool
        switch (typeFromTypePool.kind) {
          case DiscoveredObjectKind.CLASS: {
            // find constructor of class
            return this.sampleSpecificConstructorCall(
              depth,
              typeFromTypePool.id
            );
          }
          case DiscoveredObjectKind.FUNCTION: {
            return this.sampleSpecificFunctionCall(
              depth,
              typeFromTypePool.id
            );
          }
          case DiscoveredObjectKind.INTERFACE: {
            // TODO
            return this.sampleSpecificConstructorCall(
              depth,
              typeFromTypePool.id
            );
          }
          case DiscoveredObjectKind.OBJECT:
            // uhhh
            // TODO
          
          // No default
        }
      }
    }

    const object_: { [key: string]: Statement } = {};

    for (const key of typeObject.properties.keys()) {
      object_[key] = this.sampleObjectArgument(depth + 1, typeId, key);
    }

    return new ObjectStatement(id, typeId, name, prng.uniqueId(), object_);
  }

  sampleArray(depth: number, id: string, typeId: string, name: string) {
    const elements: Statement[] = [];

    for (
      let index = 0;
      index < prng.nextInt(0, this.maxActionStatements);
      index++
    ) {
      elements.push(this.sampleArrayArgument(depth + 1, typeId));
    }

    return new ArrayStatement(id, typeId, name, prng.uniqueId(), elements);
  }

  sampleArrowFunction(
    depth: number,
    id: string,
    typeId: string,
    name: string
  ): ArrowFunctionStatement {
    const typeObject = this.rootContext
      .getTypeModel()
      .getObjectDescription(typeId);

    const parameters: string[] = [];

    for (const [index, name] of typeObject.parameterNames.entries()) {
      parameters[index] = name;
    }

    // if some params are missing, fill them with fake params
    for (let index = 0; index < parameters.length; index++) {
      if (!parameters[index]) {
        parameters[index] = `param${index}`;
      }
    }

    if (typeObject.return.size === 0) {
      return new ArrowFunctionStatement(
        id,
        typeId,
        name,
        prng.uniqueId(),
        parameters,
        undefined // maybe something random?
      );
    }

    const chosenReturn = prng.pickOne([...typeObject.return]);

    return new ArrowFunctionStatement(
      id,
      typeId,
      name,
      prng.uniqueId(),
      parameters,
      this.sampleArgument(depth + 1, chosenReturn, "return")
    );
  }

  sampleString(id: string, typeId: string, name: string): StringStatement {
    let value: string;
    if (
      this.constantPoolEnabled &&
      prng.nextBoolean(this.constantPoolProbability)
    ) {
      value = this.constantPoolManager.contextConstantPool.getRandomString();
    }

    if (value === undefined) {
      value = "";
      const valueLength = prng.nextInt(0, this.stringMaxLength - 1);

      for (let index = 0; index < valueLength; index++) {
        value += prng.pickOne([...this.stringAlphabet]);
      }
    }

    return new StringStatement(id, typeId, name, prng.uniqueId(), value);
  }

  // primitives
  sampleBool(id: string, typeId: string, name: string): BoolStatement {
    return new BoolStatement(
      id,
      typeId,
      name,
      prng.uniqueId(),
      prng.nextBoolean()
    );
  }

  sampleNull(id: string, typeId: string, name: string): NullStatement {
    return new NullStatement(id, typeId, name, prng.uniqueId());
  }

  sampleNumber(id: string, typeId: string, name: string): NumericStatement {
    // by default we create small numbers (do we need very large numbers?)
    const max = 1000;
    const min = -1000;

    const value =
      this.constantPoolEnabled && prng.nextBoolean(this.constantPoolProbability)
        ? this.constantPoolManager.contextConstantPool.getRandomNumeric()
        : prng.nextDouble(min, max);

    if (value === undefined) {
      prng.nextDouble(min, max);
    }

    return new NumericStatement(id, typeId, name, prng.uniqueId(), value);
  }

  sampleInteger(id: string, typeId: string, name: string): IntegerStatement {
    // by default we create small numbers (do we need very large numbers?)
    const max = 1000;
    const min = -1000;

    const value =
      this.constantPoolEnabled && prng.nextBoolean(this.constantPoolProbability)
        ? this.constantPoolManager.contextConstantPool.getRandomInteger()
        : prng.nextInt(min, max);

    if (value === undefined) {
      prng.nextInt(min, max);
    }

    return new IntegerStatement(id, typeId, name, prng.uniqueId(), value);
  }

  sampleUndefined(
    id: string,
    typeId: string,
    name: string
  ): UndefinedStatement {
    return new UndefinedStatement(id, typeId, name, prng.uniqueId());
  }
}
