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

import { Relation, RelationType } from "../discovery/relation/Relation";
import { elementTypeToTypingType, TypeEnum } from "./TypeEnum";
import { TypeModelFactory } from "./TypeModelFactory";

import { Element, ElementType } from "../discovery/element/Element";
import { TypeModel } from "./TypeModel";
import {
  DiscoveredObjectType,
  FunctionType,
} from "../discovery/object/DiscoveredType";

export class InferenceTypeModelFactory extends TypeModelFactory {
  private _typeModel: TypeModel;

  private _elementMap: Map<string, Element>;
  private _relationsMap: Map<string, Relation>;

  private _idToBindingIdMap: Map<string, string>;

  // private _processedIds: Set<string>;

  // property -> [typeId]
  private _reversePropertyMap: Map<string, Set<string>>;

  constructor() {
    super();
    this._elementMap = new Map();
    this._relationsMap = new Map();

    this._idToBindingIdMap = new Map();

    // this._processedIds = new Set();
  }

  resolveTypes(
    elementMap: Map<string, Element>,
    relationMap: Map<string, Relation>,
    objectMap: Map<string, DiscoveredObjectType>
  ) {
    this._typeModel = new TypeModel(objectMap);
    this._elementMap = elementMap;
    this._relationsMap = relationMap;

    this.createReversePropertyMap(objectMap);
    this.createLiteralTypeMaps(elementMap);
    this.createIdentifierTypeMaps(elementMap);
    this.createRelationTypeMaps(relationMap);

    // create objects

    this.inferRelationTypes(relationMap);

    this.inferComplexTypes(relationMap, objectMap);

    return this._typeModel;
  }

  createNewTypeProbability(id: string, bindingId: string) {
    this._typeModel.addId(bindingId);

    if (id === bindingId) {
      // don't set if the id and binding are equal
      return;
    }

    if (
      this._idToBindingIdMap.has(id) &&
      this._idToBindingIdMap.get(id) !== bindingId
    ) {
      throw new Error(
        `Setting a new binding id to a previously set id is not allowed. Id: ${id}, old binding: ${this._idToBindingIdMap.get(
          id
        )}, new binding: ${bindingId}`
      );
    }

    this._idToBindingIdMap.set(id, bindingId);
    // always requires a mapping to itself
    // because for example a global variable is never declared
    // so we create a global::variable binding id
    // but this binding id is never created in the element map
    // so we manually add it here
    // if ()
    // this._idToBindingIdMap.set(bindingId, bindingId);
  }

  createReversePropertyMap(objectMap: Map<string, DiscoveredObjectType>) {
    this._reversePropertyMap = new Map();

    for (const [id, type] of objectMap.entries()) {
      for (const property of type.properties.keys()) {
        if (!this._reversePropertyMap.has(property)) {
          this._reversePropertyMap.set(property, new Set());
        }
        this._reversePropertyMap.get(property).add(id);
      }
    }
  }

  createLiteralTypeMaps(elementMap: Map<string, Element>) {
    for (const element of elementMap.values()) {
      if (element.type === ElementType.Identifier) {
        continue;
      }

      this.createNewTypeProbability(element.id, element.id);
      this._typeModel.addTypeScore(
        element.id,
        elementTypeToTypingType(element.type)
      );
    }
  }

  createIdentifierTypeMaps(elementMap: Map<string, Element>) {
    for (const element of elementMap.values()) {
      if (element.type !== ElementType.Identifier) {
        continue;
      }

      this.createNewTypeProbability(element.id, element.bindingId);
    }
  }

  createRelationTypeMaps(relationMap: Map<string, Relation>) {
    for (const relation of relationMap.values()) {
      this.createNewTypeProbability(relation.id, relation.id);

      for (let index = 0; index < relation.involved.length; index++) {
        const involvedId = relation.involved[index];
        if (this._elementMap.has(involvedId)) {
          const element = this._elementMap.get(involvedId);

          if (element.type === ElementType.Identifier) {
            this.createNewTypeProbability(element.id, element.bindingId);
          } else {
            this.createNewTypeProbability(element.id, element.id);
          }
        } else {
          // relation
          this.createNewTypeProbability(involvedId, involvedId);
        }
      }
    }
  }

  inferComplexTypes(
    relationMap: Map<string, Relation>,
    objects: Map<string, DiscoveredObjectType>
  ) {
    // get all property accessor relations
    const propertyAccessorRelations = [...relationMap.values()]
      .filter((relation) =>
        [
          RelationType.PropertyAccessor,
          RelationType.OptionalPropertyAccessor,
        ].includes(relation.type)
      )
      // not computed only unless its a string
      .filter((relation) => {
        if (relation.computed) {
          const propertyId = relation.involved[1];
          const element = this.getElement(propertyId);
          if (!element) {
            // its a relation
            return false;
          }
          if ("name" in element) {
            // its an identifier
            return false;
          }
        }
        return true;
      });

    // group by object id
    // eslint-disable-next-line unicorn/no-array-reduce
    const grouped = propertyAccessorRelations.reduce((results, relation) => {
      let objectId = relation.involved[0];

      while (this._idToBindingIdMap.has(objectId)) {
        objectId = this._idToBindingIdMap.get(objectId);
      }

      if (!results.has(objectId)) {
        results.set(objectId, []);
      }

      results.get(objectId).push(relation);
      return results;
    }, new Map<string, Relation[]>());

    // per id check the best matching objects
    for (const [id, relations] of grouped.entries()) {
      for (const [objectId, object] of objects.entries()) {
        let allMatched = true;
        for (const relation of relations) {
          const propertyId = relation.involved[1];

          const element = this.getElement(propertyId);

          if (!element) {
            // could be another relation?
            continue;
          }

          const propertyName = "name" in element ? element.name : element.value;

          if (!object.properties.has(propertyName)) {
            allMatched = false;
            break;
          }
        }
        if (allMatched) {
          this._typeModel.addTypeScore(id, objectId, relations.length);
        }
      }
    }
  }

  inferRelationTypes(relationMap: Map<string, Relation>) {
    const solveOrder = [
      RelationType.ClassDefinition,
      RelationType.ObjectPattern,
      RelationType.ArrayPattern,
      RelationType.ObjectInitializer,
      RelationType.ArrayInitializer,

      RelationType.FunctionDefinition,
      RelationType.FunctionStarDefinition,
      RelationType.AsyncFunctionDefinition,
      RelationType.AsyncFunctionStarDefinition,

      RelationType.ClassProperty,
      RelationType.StaticClassProperty,
      RelationType.ClassMethod,
      RelationType.AsyncClassMethod,
      RelationType.StaticClassMethod,
      RelationType.StaticAsyncClassMethod,
      RelationType.ClassConstructor,
      RelationType.ClassGetter,
      RelationType.ClassSetter,

      RelationType.ObjectMethod,
      RelationType.ObjectProperty,

      RelationType.Return,

      RelationType.PropertyAccessor,
      RelationType.OptionalPropertyAccessor,
    ];
    const sortedRelations = [...relationMap.values()].sort((a, b) => {
      const aIndex = solveOrder.indexOf(a.type);
      const bIndex = solveOrder.indexOf(b.type);

      if (aIndex === -1) {
        return 1;
      } else if (bIndex === -1) {
        return -1;
      } else {
        return aIndex - bIndex;
      }
    });

    for (const relation of sortedRelations) {
      this.resolveRelation(relation);
    }
  }

  getElement(id: string): Element {
    return this._elementMap.get(id);
  }

  getRelation(id: string): Relation {
    return this._relationsMap.get(id);
  }

  resolveRelation(relation: Relation): void {
    const relationId = relation.id;
    const relationType: RelationType = relation.type;
    const originalInvolved: string[] = relation.involved;
    const involved: string[] = originalInvolved.map((id) => {
      while (this._idToBindingIdMap.has(id)) {
        id = this._idToBindingIdMap.get(id);
      }
      return id;
    });

    switch (relationType) {
      case RelationType.Return: {
        const functionId = involved[0];
        const argumentId = involved[1];

        if (argumentId !== undefined) {
          this._typeModel.addRelationScore(relationId, argumentId);

          // find the discovered type
          const type = <FunctionType>(
            this._typeModel.getDiscoveredObjectType(functionId)
          );

          type.return.add(argumentId);

          // this can also be done in the object discovery phase...
        }

        break;
      }
      case RelationType.Call: {
        // TODO currently not possible because of the way the relations are created

        const [functionId] = involved;

        this._typeModel.addTypeScore(functionId, "DEFAULT_FUNCTION");

        // const [functionId, ...arguments_] = involved;

        // const type = <FunctionType>this._typeModel.getType(functionId, TypeEnum.FUNCTION)

        // // relation result is equal to return type of functionId
        // for (const returnValueId of type.return) {
        //   this._typeModel.addRelationScore(relationId, returnValueId)
        // }

        // // couple function arguments with function parameters
        // if (arguments_.length > type.parameters.size) {
        //   throw new Error(`Function ${functionId} has ${type.parameters.size} parameters, but was called with ${arguments_.length} arguments`)
        // }

        // for (const [index, argumentId] of arguments_.entries()) {
        //   const parameterId = type.parameters.get(index)
        //   this._typeModel.addRelationScore(parameterId, argumentId)
        // }

        break;
      }
      case RelationType.PrivateName: {
        // TODO
        break;
      }
      case RelationType.ObjectProperty: {
        const [propertyId, valueId] = involved;

        // connect property to value
        if (valueId !== undefined) {
          this._typeModel.addRelationScore(propertyId, valueId);
        }

        break;
      }
      case RelationType.ObjectMethod: {
        // objectvisitor takes care of this
        break;
      }

      case RelationType.ClassProperty:
      case RelationType.StaticClassProperty: {
        if (involved.length < 2) {
          throw new Error(
            `Class property relation should have at least 2 elements, but has ${involved.length}`
          );
        }

        const propertyId = involved[1];
        const valueId = involved[2];
        // connect property to value
        if (valueId !== undefined) {
          this._typeModel.addRelationScore(propertyId, valueId);
        }

        break;
      }
      case RelationType.ClassMethod:
      case RelationType.AsyncClassMethod:
      case RelationType.StaticClassMethod:
      case RelationType.StaticAsyncClassMethod:
      case RelationType.ClassConstructor:
      case RelationType.ClassGetter:
      case RelationType.ClassSetter: {
        if (involved.length < 2) {
          throw new Error(
            `Class method relation should have at least 2 elements, but has ${involved.length}`
          );
        }
        // objectvisitor takes care of this

        break;
      }

      case RelationType.ArrayPattern: {
        // objectvisitor takes care of this
        break;
      }
      case RelationType.ObjectPattern: {
        // objectvisitor takes care of this
        break;
      }
      case RelationType.RestElement: {
        const restElement = involved[0];

        // // get general array type
        // const arrayId = // TODO
        // this._typeModel.addTypeScore(relationId, arrayId);

        // connect rest element to array
        this._typeModel.addRelationScore(restElement, relationId);
        break;
      }

      case RelationType.While:
      case RelationType.If: {
        const conditionId = involved[0];

        // add boolean type to condition
        this._typeModel.addTypeScore(conditionId, TypeEnum.BOOLEAN);

        break;
      }
      case RelationType.For: {
        const conditionId = involved[0];

        if (conditionId) {
          // weird
          break;
        }
        // add boolean type to condition
        this._typeModel.addTypeScore(conditionId, TypeEnum.BOOLEAN);

        break;
      }
      case RelationType.ForIn: {
        // const declarator = involved[0];
        // const arrayOrObject = involved[1];

        // // create array type

        // // TODO should actually add any iterable type (but how do we check for these)

        // // // get general array type
        // // const arrayId = // TODO
        // // this._typeModel.addTypeScore(arrayOrObject, arrayId);

        // // // get general object type
        // // const objectId = // TODO
        // // this._typeModel.addTypeScore(arrayOrObject, objectId);

        // const typeOfArray = <ArrayType>(
        //   this._typeModel.getDiscoveredObjectType(arrayOrObject)
        // );

        // if (typeOfArray) {
        //   if (typeOfArray.elements) {
        //     for (const id of typeOfArray.elements.values()) {
        //       // connect declarator to array element
        //       this._typeModel.addRelationScore(declarator, id);
        //     }
        //   } else {
        //     for (const id of typeOfArray.properties.values()) {
        //       // connect declarator to object property
        //       this._typeModel.addRelationScore(declarator, id);
        //     }
        //   }
        // }

        break;
      }
      case RelationType.ForOf: {
        // const declarator = involved[0];
        // const array = involved[1];

        // // create array type
        // // this._typeModel.addArrayTypeScore(array, {
        // //   type: TypeEnum.ARRAY,
        // //   elements: new Map(),
        // // });

        // const typeOfArray = <ArrayType>(
        //   this._typeModel.getDiscoveredObjectType(array)
        // );

        // for (const id of typeOfArray.elements.values()) {
        //   // connect declarator to array element
        //   this._typeModel.addRelationScore(declarator, id);
        // }

        break;
      }
      case RelationType.Switch: {
        const [discriminant, ...cases] = involved;

        for (const case_ of cases) {
          this._typeModel.addRelationScore(discriminant, case_);
        }

        break;
      }

      // Primary Expressions
      case RelationType.This: {
        const thisParent = involved[0];

        // add this type to parent
        this._typeModel.addRelationScore(thisParent, relationId);

        // // create object type
        // this._typeModel.addObjectTypeScore(relationId, {
        //   type: TypeEnum.OBJECT,
        //   properties: new Map(),
        // });

        break;
      }

      case RelationType.ArrayInitializer: {
        // get array type
        // const arrayId = // TODO
        // this._typeModel.addTypeScore(relationId, arrayId)

        break;
      }
      case RelationType.ObjectInitializer: {
        // get object type
        // const objectId = // TODO
        // this._typeModel.addTypeScore(relationId, objectId)
        break;
      }

      case RelationType.ClassDefinition: {
        if (involved.length === 0) {
          throw new Error(`Class definition has no involved elements`);
        }
        const classId = involved[0];

        // // make object for the class
        // this._typeModel.addObjectTypeScore(classId, {
        //   type: TypeEnum.OBJECT,
        //   properties: new Map(), // the properties are added through the ClassMethod/ClassProperty relations
        // });

        // connect class to relation
        this._typeModel.addRelationScore(classId, relationId);

        break;
      }

      case RelationType.FunctionDefinition:
      case RelationType.FunctionStarDefinition:
      case RelationType.AsyncFunctionDefinition:
      case RelationType.AsyncFunctionStarDefinition: {
        if (involved.length === 0) {
          throw new Error(`Function definition has no involved elements`);
        }
        const [functionId] = involved;

        // connect function to relation
        this._typeModel.addRelationScore(functionId, relationId);

        break;
      }

      case RelationType.TemplateLiteral: {
        // TODO something with the quasis and expressions
        this._typeModel.addTypeScore(relationId, TypeEnum.STRING);
        break;
      }

      case RelationType.Sequence: {
        // TODO nothing i think
        break;
      }

      // Left-hand-side Expressions
      case RelationType.PropertyAccessor:
      case RelationType.OptionalPropertyAccessor: {
        // TODO
        const [objectId, propertyId] = involved;
        const [, originalProperty] = originalInvolved;

        const propertyElement = this.getElement(originalProperty);

        if (propertyElement === undefined) {
          // TODO what if the property is not an element
        } else {
          if (propertyElement.type === ElementType.NumericalLiteral) {
            // e.g. object[0]
            // add array type to object

            // // find the array typeid
            // const arrayId = // TODO
            this._typeModel.addTypeScore(objectId, "DEFAULT_ARRAY");
          }
        }

        // we don't have to connect the relationid to the propertyId since they are equal already
        this._typeModel.addRelationScore(relationId, propertyId);

        // ofcourse this can be any object type (string, function, etc)
        // however if we match the object type to the string object type we can get more information here

        break;
      }

      case RelationType.New: {
        const class_ = involved[0];
        // TODO maybe this is not neccessary since the class is already connected to the relation
        // this._typeModel.addObjectTypeScore(relationId, {
        //   type: TypeEnum.OBJECT,
        //   properties: new Map()
        // });
        this._typeModel.addRelationScore(relationId, class_);
        break;
      }

      case RelationType.PlusPlusPrefix: // must be numerical
      case RelationType.MinusMinusPrefix: // must be numerical
      case RelationType.PlusPlusPostFix: // must be numerical
      case RelationType.MinusMinusPostFix: {
        // must be numerical
        const argumentId = involved[0];

        this._typeModel.addTypeScore(argumentId, TypeEnum.NUMERIC);
        this._typeModel.addRelationScore(relationId, argumentId);
        break;
      }

      // Unary
      case RelationType.Delete: {
        // TODO can we say something about the argument?
        this._typeModel.addTypeScore(relationId, TypeEnum.UNDEFINED);
        break;
      }
      case RelationType.Void: {
        // TODO can we say something about the argument?
        this._typeModel.addTypeScore(relationId, TypeEnum.UNDEFINED);
        break;
      }
      case RelationType.TypeOf: {
        // TODO can we say something about the argument?
        this._typeModel.addTypeScore(relationId, TypeEnum.STRING);
        break;
      }
      case RelationType.PlusUnary:
      case RelationType.MinusUnary:
      case RelationType.BitwiseNotUnary: {
        // could be multiple things but the argument is probably numerical
        const argumentId = involved[0];
        this._typeModel.addTypeScore(argumentId, TypeEnum.NUMERIC);
        this._typeModel.addTypeScore(relationId, TypeEnum.NUMERIC);

        break;
      }
      case RelationType.LogicalNotUnary: {
        // TODO can we say something about the argument?
        this._typeModel.addTypeScore(relationId, TypeEnum.BOOLEAN);

        break;
      }
      case RelationType.Await: {
        // TODO
        // // often function?
        // const argumentId = involved[0];

        // this._typeModel.addFunctionTypeScore(argumentId, {
        //   type: TypeEnum.FUNCTION,
        //   parameters: new Map(),
        //   return: new Set(),
        // });

        // const type_ = <FunctionType>(
        //   this._typeModel.getType(argumentId, TypeEnum.FUNCTION)
        // );

        // for (const returnType of type_.return) {
        //   this._typeModel.addRelationScore(relationId, returnType);
        // }

        break;
      }

      // binary
      case RelationType.Addition: {
        if (involved.length !== 2) {
          throw new Error(`Addition relation has wrong involved elements`);
        }

        const [leftId, rightId] = involved;

        // can be multiple things but string and number are the most likely
        this._typeModel.addTypeScore(leftId, TypeEnum.NUMERIC);

        this._typeModel.addTypeScore(leftId, TypeEnum.STRING);

        this._typeModel.addTypeScore(rightId, TypeEnum.NUMERIC);
        this._typeModel.addTypeScore(rightId, TypeEnum.STRING);

        this._typeModel.addRelationScore(relationId, leftId);
        this._typeModel.addRelationScore(relationId, rightId);
        // even though we add the relations we still add the number type directly since it is most likely
        this._typeModel.addTypeScore(relationId, TypeEnum.NUMERIC);

        break;
      }
      case RelationType.Subtraction: // must be numerical
      case RelationType.Division: // must be numerical
      case RelationType.Multiplication: // must be numerical
      case RelationType.Remainder: // must be numerical
      case RelationType.Exponentiation: {
        if (involved.length !== 2) {
          throw new Error(`Relation has wrong involved elements`);
        }

        const [leftId, rightId] = involved;

        // can be multiple things but number is the most likely
        this._typeModel.addTypeScore(leftId, TypeEnum.NUMERIC);
        this._typeModel.addTypeScore(rightId, TypeEnum.NUMERIC);
        this._typeModel.addRelationScore(relationId, leftId);
        this._typeModel.addRelationScore(relationId, rightId);
        // even though we add the relations we still add the number type directly since it is most likely
        // in this case we are pretty sure the result is numeric so we give 2 score
        this._typeModel.addTypeScore(relationId, TypeEnum.NUMERIC, 2);

        break;
      }

      case RelationType.In: {
        // const [, rightId] = involved;

        // right is likely an array or object

        // this._typeModel.addArrayTypeScore(rightId, {
        //   type: TypeEnum.ARRAY,
        //   elements: new Map(),
        // });
        // this._typeModel.addObjectTypeScore(rightId, {
        //   type: TypeEnum.OBJECT,
        //   properties: new Map(),
        // });

        // TODO
        // if it is an array we know the leftId is an element of the array
        // if it is an object we know the leftId is a property of the object

        this._typeModel.addTypeScore(relationId, TypeEnum.BOOLEAN);

        break;
      }
      case RelationType.InstanceOf: {
        // TODO
        // const [leftId, rightId] = involved;

        // this._typeModel.addObjectTypeScore(leftId, {
        //   type: TypeEnum.OBJECT,
        //   properties: new Map(),
        // });
        // this._typeModel.addObjectTypeScore(rightId, {
        //   type: TypeEnum.OBJECT,
        //   properties: new Map(),
        // });

        this._typeModel.addTypeScore(relationId, TypeEnum.BOOLEAN);

        break;
      }
      case RelationType.Less: // must be numeric
      case RelationType.Greater: // must be numeric
      case RelationType.LessOrEqual: // must be numeric
      case RelationType.GreaterOrEqual: {
        const [leftId, rightId] = involved;

        // most likely numerical
        this._typeModel.addTypeScore(leftId, TypeEnum.NUMERIC);
        this._typeModel.addTypeScore(rightId, TypeEnum.NUMERIC);

        this._typeModel.addTypeScore(relationId, TypeEnum.BOOLEAN);

        break;
      }

      case RelationType.Equality: // could be multiple things
      case RelationType.InEquality: // could be multiple things
      case RelationType.StrictEquality: // could be multiple things
      case RelationType.StrictInequality: {
        const [leftId, rightId] = involved;

        // both sides are likely the same type
        this._typeModel.addRelationScore(leftId, rightId);

        this._typeModel.addTypeScore(relationId, TypeEnum.BOOLEAN);

        break;
      }

      case RelationType.BitwiseLeftShift: // must be numeric
      case RelationType.BitwiseRightShift: // must be numeric
      case RelationType.BitwiseUnsignedRightShift: // must be numeric

      case RelationType.BitwiseAnd: // must be numeric
      case RelationType.BitwiseOr: // must be numeric
      case RelationType.BitwiseXor: {
        const [leftId, rightId] = involved;

        // most likely numerical
        this._typeModel.addTypeScore(leftId, TypeEnum.NUMERIC);
        this._typeModel.addTypeScore(rightId, TypeEnum.NUMERIC);

        this._typeModel.addTypeScore(relationId, TypeEnum.NUMERIC);

        break;
      }

      case RelationType.LogicalAnd: {
        const [leftId, rightId] = involved;

        // most likely both boolean
        this._typeModel.addTypeScore(leftId, TypeEnum.BOOLEAN);
        this._typeModel.addTypeScore(rightId, TypeEnum.BOOLEAN);

        //can be the boolean or the type of the second one depending on if the first and second are not false/null/undefined
        this._typeModel.addRelationScore(relationId, leftId);
        this._typeModel.addRelationScore(relationId, rightId);
        this._typeModel.addTypeScore(relationId, TypeEnum.BOOLEAN);
        // TODO can we say that the leftId and rightId are the same type?

        break;
      }

      case RelationType.LogicalOr: {
        const [leftId, rightId] = involved;

        // most likely both boolean
        this._typeModel.addTypeScore(leftId, TypeEnum.BOOLEAN);
        this._typeModel.addTypeScore(rightId, TypeEnum.BOOLEAN);

        // can be the type of the first or second one depending on if the first is not false/null/undefined
        this._typeModel.addRelationScore(relationId, leftId);
        this._typeModel.addRelationScore(relationId, rightId);
        this._typeModel.addTypeScore(relationId, TypeEnum.BOOLEAN);

        // TODO can we say that the leftId and rightId are the same type?

        break;
      }
      case RelationType.NullishCoalescing: {
        const [leftId, rightId] = involved;

        // left side could be nullish
        this._typeModel.addTypeScore(leftId, TypeEnum.NULL);
        this._typeModel.addTypeScore(leftId, TypeEnum.UNDEFINED);

        // returns the rightId if leftId is nullish
        this._typeModel.addRelationScore(relationId, leftId);
        this._typeModel.addRelationScore(relationId, rightId);
        // TODO can we say that the leftId and rightId are the same type?

        break;
      }

      // ternary
      case RelationType.Conditional: {
        const [conditionId, leftId, rightId] = involved;
        this._typeModel.addTypeScore(conditionId, TypeEnum.BOOLEAN);

        // returns the leftId if conditionId is true
        // returns the rightId if conditionId is false
        this._typeModel.addRelationScore(relationId, leftId);
        this._typeModel.addRelationScore(relationId, rightId);

        // TODO can we say that the leftId and rightId are the same type?

        break;
      }

      case RelationType.Assignment: {
        // should always have two involved
        if (involved.length !== 2) {
          throw new Error(
            `Assignment relation should have two involved, but has ${involved.length}. ${relation.id}`
          );
        }
        const [leftId, rightId] = involved;

        this._typeModel.addRelationScore(leftId, rightId);
        // TODO This is not the way to do this
        // for now it is neccessary because variable declarations such as in lodash/at.js
        // do not have the correct ids causing the relation to have the wrong
        this._typeModel.addRelationScore(relationId, rightId);
        this._typeModel.addRelationScore(leftId, relationId);

        // undefined should be the actual result
        // this._typeModel.addTypeScore(relationId, TypeEnum.UNDEFINED);

        break;
      }
      case RelationType.MultiplicationAssignment: // must be numeric
      case RelationType.ExponentiationAssignment: // must be numeric
      case RelationType.DivisionAssignment: // must be numeric
      case RelationType.RemainderAssigment: // must be numeric
      case RelationType.SubtractionAssignment: // must be numeric
      case RelationType.LeftShiftAssignment: // must be numeric
      case RelationType.RightShiftAssignment: // must be numeric
      case RelationType.UnSignedRightShiftAssignment: // must be numeric
      case RelationType.BitwiseAndAssignment: // must be numeric
      case RelationType.BitwiseXorAssignment: // must be numeric
      case RelationType.BitwiseOrAssignment: {
        if (involved.length !== 2) {
          throw new Error(
            `Assignment relation should have two involved, but has ${involved.length}`
          );
        }
        const [leftId, rightId] = involved;

        this._typeModel.addRelationScore(leftId, rightId);
        // likely numeric
        this._typeModel.addTypeScore(leftId, TypeEnum.NUMERIC);
        this._typeModel.addTypeScore(rightId, TypeEnum.NUMERIC);

        this._typeModel.addTypeScore(relationId, TypeEnum.UNDEFINED);

        break;
      }
      case RelationType.AdditionAssignment: {
        if (involved.length !== 2) {
          throw new Error(
            `Assignment relation should have two involved, but has ${involved.length}`
          );
        }
        const [leftId, rightId] = involved;

        this._typeModel.addRelationScore(leftId, rightId);
        // likely numeric or string
        this._typeModel.addTypeScore(leftId, TypeEnum.NUMERIC);
        this._typeModel.addTypeScore(leftId, TypeEnum.STRING);
        this._typeModel.addTypeScore(rightId, TypeEnum.NUMERIC);
        this._typeModel.addTypeScore(rightId, TypeEnum.STRING);

        this._typeModel.addTypeScore(relationId, TypeEnum.UNDEFINED);

        break;
      }

      case RelationType.LogicalAndAssignment: // could be multiple things
      case RelationType.LogicalOrAssignment: // could be multiple things
      case RelationType.LogicalNullishAssignment: {
        if (involved.length !== 2) {
          throw new Error(
            `Assignment relation should have two involved, but has ${involved.length}`
          );
        }
        const [leftId, rightId] = involved;

        this._typeModel.addRelationScore(leftId, rightId);
        // likely boolean
        this._typeModel.addTypeScore(leftId, TypeEnum.BOOLEAN);
        this._typeModel.addTypeScore(rightId, TypeEnum.BOOLEAN);
        this._typeModel.addTypeScore(relationId, TypeEnum.UNDEFINED);

        break;
      }

      case RelationType.Yield:
      case RelationType.YieldStar: {
        // TODO
        break;
      }

      case RelationType.Spread: {
        // TODO
        // const [spreadId] = involved;

        // // is array or object
        // this._typeModel.addArrayTypeScore(spreadId, {
        //   type: TypeEnum.ARRAY,
        //   elements: new Map(),
        // });
        // this._typeModel.addObjectTypeScore(spreadId, {
        //   type: TypeEnum.OBJECT,
        //   properties: new Map(),
        // });

        // TODO results in a sequence of the type of the spread

        break;
      }

      case RelationType.Comma: {
        // TODO
        break;
      }
    }
  }
}
