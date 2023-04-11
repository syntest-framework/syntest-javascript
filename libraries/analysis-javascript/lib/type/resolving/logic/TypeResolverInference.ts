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

import { Relation, RelationType } from "../../discovery/relation/Relation";
import { elementTypeToTypingType, TypeEnum } from "../TypeEnum";
import { TypeProbability } from "../TypeProbability";
import { TypeResolver } from "../TypeResolver";

import { Element, ElementType } from "../../discovery/element/Element";

export class TypeResolverInference extends TypeResolver {
  private _totalElementsMap: Map<string, Element>;
  private _totalRelationsMap: Map<string, Relation>;

  private _idRefersToIdMap: Map<string, string>;

  private _idToTypeMap: Map<string, TypeProbability>;

  // private _complexTypes: ComplexType[];
  // private _idMightBeComplexTypeMap: Map<string, ComplexType>;

  private _processedIds: Set<string>;

  constructor() {
    super();

    this._totalElementsMap = new Map();
    this._totalRelationsMap = new Map();

    this._idRefersToIdMap = new Map();

    this._idToTypeMap = new Map();

    this._processedIds = new Set();
  }

  resolveTypes(
    elementMap: Map<string, Element>,
    relationMap: Map<string, Relation>
  ) {
    this._totalElementsMap = new Map([
      ...this._totalElementsMap,
      ...elementMap,
    ]);
    this._totalRelationsMap = new Map([
      ...this._totalRelationsMap,
      ...relationMap,
    ]);

    this.createLiteralTypeMaps(elementMap);
    this.createIdentifierTypeMaps(elementMap);
    this.createRelationTypeMaps(relationMap);

    // this.create objects

    this.inferRelationReturnTypes(relationMap);
    this.inferRelationArgumentTypes(relationMap);
  }

  createLiteralTypeMaps(elementMap: Map<string, Element>) {
    for (const element of elementMap.values()) {
      if (element.type === ElementType.Identifier) {
        continue;
      }

      const typeProbability = new TypeProbability();
      typeProbability.addType(elementTypeToTypingType(element.type), 1);
      this._idToTypeMap.set(element.id, typeProbability);
    }
  }

  createIdentifierTypeMaps(elementMap: Map<string, Element>) {
    for (const element of elementMap.values()) {
      if (element.type !== ElementType.Identifier) {
        continue;
      }

      this._idRefersToIdMap.set(element.id, element.bindingId);
      if (this._idToTypeMap.has(element.bindingId)) {
        continue;
      }

      const typeProbability = new TypeProbability();
      this._idToTypeMap.set(element.bindingId, typeProbability);
    }
  }

  createRelationTypeMaps(relationMap: Map<string, Relation>) {
    for (const relation of relationMap.values()) {
      const typeProbability = new TypeProbability();
      this._idToTypeMap.set(relation.id, typeProbability);
    }
  }

  // findComplexTypes(relationMap: Map<string, Relation>) {
  //   const complexTypes = new Map<string, ComplexType>();

  //   for (const relation of relationMap.values()) {
  //     if (relation.type === RelationType.PropertyAccessor || relation.type === RelationType.OptionalPropertyAccessor) {
  //       let objectId = relation.involved[0]
  //       objectId = this._idRefersToIdMap.has(objectId) ? this._idRefersToIdMap.get(objectId) : objectId

  //       const propertyId = relation.involved[1]

  //       const object = this._totalElementsMap.has(objectId) ? this._totalElementsMap.get(objectId) : this._totalRelationsMap.get(objectId);
  //       const property = this._totalElementsMap.has(propertyId) ? this._totalElementsMap.get(propertyId) : this._totalRelationsMap.get(propertyId);

  //       if (object === undefined || property === undefined) {
  //         throw new Error(`Object or property not found object: ${object}, property: ${property}`);
  //       }

  //       if (!complexTypes.has(objectId)) {
  //         complexTypes.set(objectId, {
  //           id: objectId,
  //           properties: new Map()
  //         });
  //       }

  //       if (isRelation(property)) { // i.e. property is a function
  //         // check wether the relation is actually a function of some sort
  //         const functionId = property.involved[0]
  //         const functionElement = this._totalElementsMap.get(functionId)
  //         const propertyName = "name" in functionElement ? functionElement.name : functionElement.value

  //         // TODO or function id?
  //         complexTypes.get(objectId).properties.set(propertyName, this.getTyping(property.id))
  //       } else {
  //         const propertyName = "name" in property ? property.name : property.value
  //         complexTypes.get(objectId).properties.set(propertyName, this.getTyping(property.id))
  //       }
  //     } else if (relation.type === RelationType.ObjectPattern) {
  //       const properties = new Map<string, TypeProbability>()

  //       for (const elementId of relation.involved) {
  //         const subRelation = this._totalRelationsMap.get(elementId)

  //         if (subRelation === undefined) {
  //           throw new Error(`Subrelation not found ${elementId}`);
  //         }

  //         if (subRelation.type === RelationType.ObjectProperty) {
  //           const propertyId = subRelation.involved[0]
  //           const property = this._totalElementsMap.get(propertyId)

  //           if (property === undefined) {
  //             throw new Error(`Property not found ${propertyId}`);
  //           }

  //           const propertyName = "name" in property ? property.name : property.value

  //           const valueId = subRelation.involved[1]
  //           properties.set(propertyName, this.getTyping(valueId))
  //         } else if (subRelation.type === RelationType.ObjectMethod) {
  //           const propertyId = subRelation.involved[0]
  //           const property = this._totalElementsMap.get(propertyId)

  //           if (property === undefined) {
  //             throw new Error(`Property not found ${propertyId}`);
  //           }

  //           const propertyName = "name" in property ? property.name : property.value

  //           properties.set(propertyName, this.getTyping(propertyId))
  //         }
  //       }

  //       complexTypes.set(relation.id, {
  //         id: relation.id,
  //         properties: properties
  //       });
  //     } else if (relation.type === RelationType.ClassDefinition) {

  //     }

  //   }
  // }

  inferRelationReturnTypes(relationMap: Map<string, Relation>) {
    for (const relation of relationMap.values()) {
      const involved: TypeProbability[] = relation.involved.map((elementId) =>
        this.getTyping(elementId)
      );

      this.resolveRelation(relation, involved);
    }
  }

  inferRelationArgumentTypes(relationMap: Map<string, Relation>) {
    for (const relation of relationMap.values()) {
      this.resolveRelationElements(relation);
    }
  }

  getTyping(id: string): TypeProbability {
    return this._idToTypeMap.get(this._idRefersToIdMap.get(id));
  }

  getElement(id: string): Element {
    return this._totalElementsMap.get(id);
  }

  getRelation(id: string): Relation {
    return this._totalRelationsMap.get(id);
  }

  addType(
    id: string,
    type: TypeEnum | TypeProbability | (TypeEnum | TypeProbability)[]
  ): boolean {
    if (this._processedIds.has(id)) {
      return false;
    }

    this._processedIds.add(id);

    if (this._totalElementsMap.has(id)) {
      const element = this._totalElementsMap.get(id);

      if (element.type === ElementType.Identifier) {
        id = element.bindingId;
      }
    }

    const typeProbability = this.getTyping(id);

    if (typeProbability === undefined) {
      throw new Error(`Type probability not found for ${id}`);
    }

    if (Array.isArray(type)) {
      for (const t of type) {
        typeProbability.addType(t, 1);
      }
    } else {
      typeProbability.addType(type, 1);
    }

    return true;
  }

  resolveRelationElements(relation: Relation): boolean {
    const relationType: RelationType = relation.type;
    const involved: string[] = relation.involved;

    switch (relationType) {
      case RelationType.Return: {
        return this.addType(involved[0], TypeEnum.FUNCTION);
      }
      case RelationType.Call: {
        return this.addType(involved[0], TypeEnum.FUNCTION);
      }
      case RelationType.PrivateName: {
        return false;
      }
      case RelationType.ObjectProperty: {
        return false;
      }
      case RelationType.ObjectMethod: {
        return this.addType(involved[0], TypeEnum.FUNCTION);
      }

      case RelationType.ClassProperty: {
        return this.addType(involved[0], TypeEnum.OBJECT);
      }
      case RelationType.StaticClassProperty: {
        return this.addType(involved[0], TypeEnum.OBJECT);
      }
      case RelationType.ClassMethod:
      case RelationType.AsyncClassMethod:
      case RelationType.StaticClassMethod:
      case RelationType.StaticAsyncClassMethod:
      case RelationType.ClassConstructor: {
        return (
          this.addType(involved[0], TypeEnum.OBJECT) ||
          this.addType(involved[0], TypeEnum.FUNCTION)
        );
      }
      case RelationType.ClassGetter: {
        return this.addType(involved[0], TypeEnum.OBJECT);
      }
      case RelationType.ClassSetter: {
        return (
          this.addType(involved[0], TypeEnum.OBJECT) ||
          this.addType(involved[0], TypeEnum.FUNCTION)
        );
      }

      case RelationType.ArrayPattern: {
        return false;
      }
      case RelationType.ObjectPattern: {
        return false;
      }
      case RelationType.RestElement: {
        return this.addType(involved[0], TypeEnum.ARRAY);
      }

      // Primary Expressions
      case RelationType.This: {
        return this.addType(involved[0], TypeEnum.OBJECT);
      }
      case RelationType.ArrayInitializer: {
        return false;
      }
      case RelationType.ObjectInitializer: {
        return false;
      }
      case RelationType.FunctionDefinition: {
        return this.addType(involved[0], TypeEnum.FUNCTION);
      }
      case RelationType.ClassDefinition: {
        return this.addType(involved[0], TypeEnum.OBJECT);
      }
      case RelationType.FunctionStarDefinition:
      case RelationType.AsyncFunctionDefinition:
      case RelationType.AsyncFunctionStarDefinition: {
        return this.addType(involved[0], TypeEnum.FUNCTION);
      }
      case RelationType.TemplateLiteral: {
        return false;
      }
      case RelationType.Sequence: {
        return false;
      }

      // Left-hand-side Expressions
      case RelationType.PropertyAccessor:
      case RelationType.OptionalPropertyAccessor: {
        // could be multiple things
        // although the first has to an object/array
        return this.addType(involved[0], [
          TypeEnum.OBJECT,
          TypeEnum.ARRAY,
          TypeEnum.FUNCTION,
          TypeEnum.STRING,
        ]);
      }

      case RelationType.New: {
        //
        return false;
      }

      case RelationType.PlusPlusPrefix: // must be numerical
      case RelationType.MinusMinusPrefix: // must be numerical
      case RelationType.PlusPlusPostFix: // must be numerical
      case RelationType.MinusMinusPostFix: {
        // must be numerical
        return this.addType(involved[0], TypeEnum.NUMERIC);
      }

      // Unary
      case RelationType.Delete: {
        // could be multiple things
        return false;
      }
      case RelationType.Void: {
        // could be multiple things
        return false;
      }
      case RelationType.TypeOf: {
        // could be multiple things
        return false;
      }
      case RelationType.PlusUnary: {
        // could be multiple things
        return false;
      }
      case RelationType.MinusUnary: {
        // could be multiple things
        return false;
      }
      case RelationType.BitwiseNotUnary: {
        // could be multiple things
        return false;
      }
      case RelationType.LogicalNotUnary: {
        // could be multiple things
        return false;
      }
      case RelationType.Await: {
        // often function?
        return this.addType(involved[0], TypeEnum.FUNCTION);
      }

      // binary
      case RelationType.Addition: {
        return (
          this.addType(involved[0], [TypeEnum.NUMERIC, TypeEnum.STRING]) ||
          this.addType(involved[1], [TypeEnum.NUMERIC, TypeEnum.STRING])
        );
      } // could be multiple things
      case RelationType.Subtraction: // must be numerical
      case RelationType.Division: // must be numerical
      case RelationType.Multiplication: // must be numerical
      case RelationType.Remainder: // must be numerical
      case RelationType.Exponentiation: {
        // must be numerical
        return (
          this.addType(involved[0], TypeEnum.NUMERIC) ||
          this.addType(involved[1], TypeEnum.NUMERIC)
        );
      }

      case RelationType.In: {
        // could be multiple things      /// TODO or array?
        return this.addType(involved[1], [TypeEnum.OBJECT, TypeEnum.ARRAY]);
      }
      case RelationType.InstanceOf: {
        // could be multiple things
        return this.addType(involved[1], TypeEnum.STRING);
      }
      case RelationType.Less: // must be numeric
      case RelationType.Greater: // must be numeric
      case RelationType.LessOrEqual: // must be numeric
      case RelationType.GreaterOrEqual: {
        // must be numeric
        // TODO not actually true this can also be other things
        return (
          this.addType(involved[0], TypeEnum.NUMERIC) ||
          this.addType(involved[1], TypeEnum.NUMERIC)
        );
      }

      case RelationType.Equality: // could be multiple things
      case RelationType.InEquality: // could be multiple things
      case RelationType.StrictEquality: // could be multiple things
      case RelationType.StrictInequality: {
        // could be multiple things

        // get types
        const typeOfInvolved0 = this.getTyping(involved[0]);
        const typeOfInvolved1 = this.getTyping(involved[1]);
        return (
          this.addType(involved[0], typeOfInvolved1) ||
          this.addType(involved[1], typeOfInvolved0)
        );
      }

      case RelationType.BitwiseLeftShift: // must be numeric
      case RelationType.BitwiseRightShift: // must be numeric
      case RelationType.BitwiseUnsignedRightShift: // must be numeric

      case RelationType.BitwiseAnd: // must be numeric
      case RelationType.BitwiseOr: // must be numeric
      case RelationType.BitwiseXor: {
        // must be numeric
        return (
          this.addType(involved[0], TypeEnum.NUMERIC) ||
          this.addType(involved[1], TypeEnum.NUMERIC)
        );
      }

      case RelationType.LogicalAnd: // could be multiple things
      case RelationType.LogicalOr: // could be multiple things
      case RelationType.NullishCoalescing: {
        // Could be multiple things
        // left and right are likely booleans though
        return false;
      }

      // ternary
      case RelationType.Conditional: {
        // could be multiple things
        // C is probably boolean though
        return false;
      }

      case RelationType.Assignment: {
        // must be the same
        // get types
        const typeOfInvolved0 = this.getTyping(involved[0]);
        const typeOfInvolved1 = this.getTyping(involved[1]);
        return (
          this.addType(involved[0], typeOfInvolved1) ||
          this.addType(involved[1], typeOfInvolved0)
        );
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
        // must be numeric
        return (
          this.addType(involved[0], TypeEnum.NUMERIC) ||
          this.addType(involved[1], TypeEnum.NUMERIC)
        );
      }
      case RelationType.AdditionAssignment: {
        // must be numeric or string
        return (
          this.addType(involved[0], [TypeEnum.NUMERIC, TypeEnum.STRING]) ||
          this.addType(involved[1], [TypeEnum.NUMERIC, TypeEnum.STRING])
        );
      }

      case RelationType.LogicalAndAssignment: // could be multiple things
      case RelationType.LogicalOrAssignment: // could be multiple things
      case RelationType.LogicalNullishAssignment: {
        // could be multiple things
        // left is boolean
        // right is probably boolean
        return this.addType(involved[0], TypeEnum.BOOLEAN);
      }

      case RelationType.Yield:
      case RelationType.YieldStar: {
        return false;
      }

      case RelationType.Spread: {
        // should be iterable
        return this.addType(involved[0], [TypeEnum.OBJECT, TypeEnum.ARRAY]);
      }

      case RelationType.Comma: {
        return false;
      }
    }
  }

  resolveRelation(
    relation: Relation,
    involvedTypes: TypeProbability[]
  ): boolean {
    const involved: string[] = relation.involved;

    switch (relation.type) {
      case RelationType.Return: {
        return this.addType(relation.id, involvedTypes[1]);
      }
      case RelationType.Call: {
        // TODO should be the return of the function
        return false; //this.addType(relation.id, involved[0]);
      }
      case RelationType.PrivateName: {
        return false;
      }
      case RelationType.ObjectProperty: {
        // should create a property on an object
        return false;
      }
      case RelationType.ObjectMethod: {
        // should create a property on an object
        return false;
      }

      case RelationType.ClassProperty: {
        // should create a property on an object
        return false;
      }
      case RelationType.StaticClassProperty: {
        // should create a property on an object
        return false;
      }
      case RelationType.ClassMethod:
      case RelationType.AsyncClassMethod:
      case RelationType.StaticClassMethod:
      case RelationType.StaticAsyncClassMethod:
      case RelationType.ClassConstructor: {
        // should create a property on an object
        return false;
      }
      case RelationType.ClassGetter: {
        // should create a property on an object
        return false;
      }
      case RelationType.ClassSetter: {
        // should create a property on an object
        return false;
      }

      case RelationType.ArrayPattern: {
        return false;
      }
      case RelationType.ObjectPattern: {
        return false;
      }
      case RelationType.RestElement: {
        return false;
      }

      // Primary Expressions
      case RelationType.This: {
        return this.addType(relation.id, TypeEnum.OBJECT);
      }
      case RelationType.ArrayInitializer: {
        return this.addType(relation.id, TypeEnum.ARRAY);
      }
      case RelationType.ObjectInitializer: {
        return this.addType(relation.id, TypeEnum.OBJECT);
      }
      case RelationType.FunctionDefinition: {
        return this.addType(relation.id, TypeEnum.FUNCTION);
      }
      case RelationType.ClassDefinition: {
        return this.addType(relation.id, TypeEnum.OBJECT);
      }
      case RelationType.FunctionStarDefinition:
      case RelationType.AsyncFunctionDefinition:
      case RelationType.AsyncFunctionStarDefinition: {
        return this.addType(relation.id, TypeEnum.FUNCTION);
      }
      case RelationType.TemplateLiteral: {
        return this.addType(relation.id, TypeEnum.STRING);
      }
      case RelationType.Sequence: {
        return false;
      }

      // Unary
      case RelationType.PropertyAccessor:
      case RelationType.OptionalPropertyAccessor: {
        // must be equal to the identifierDescription of the property element
        const typeOfRelation = this.getTyping(relation.id);
        const typeOfInvolved = involvedTypes[1];
        return (
          this.addType(relation.id, typeOfInvolved) ||
          this.addType(involved[1], typeOfRelation)
        );
      }
      case RelationType.New: {
        // always an object
        return this.addType(relation.id, [TypeEnum.OBJECT, involvedTypes[0]]);
      }

      case RelationType.PlusPlusPostFix: // must be numerical
      case RelationType.MinusMinusPostFix: // must be numerical
      case RelationType.PlusPlusPrefix: // must be numerical
      case RelationType.MinusMinusPrefix: {
        // must be numerical
        return this.addType(relation.id, TypeEnum.NUMERIC);
      }

      case RelationType.Delete: {
        // must be void
        return this.addType(relation.id, TypeEnum.UNDEFINED);
      }
      case RelationType.Void: {
        // must be void
        return this.addType(relation.id, TypeEnum.UNDEFINED);
      }

      case RelationType.TypeOf: {
        // must be string
        return this.addType(relation.id, TypeEnum.STRING);
      }
      case RelationType.PlusUnary: // must be numerical
      case RelationType.MinusUnary: {
        // must be numerical
        return this.addType(relation.id, TypeEnum.NUMERIC);
      }
      case RelationType.BitwiseNotUnary: {
        // todo
        return false;
      }
      case RelationType.LogicalNotUnary: {
        // must be boolean
        return this.addType(relation.id, TypeEnum.BOOLEAN);
      }
      case RelationType.Await: {
        // TODO It should be equal to the result of the function return type
        return false;
      }

      // binary
      case RelationType.Addition: {
        // TODO can be more
        // TODO should be based on what the involved values are
        return this.addType(relation.id, [TypeEnum.NUMERIC, TypeEnum.STRING]);
      }
      case RelationType.Subtraction: // must be numerical
      case RelationType.Division: // must be numerical
      case RelationType.Multiplication: // must be numerical
      case RelationType.Remainder: // must be numerical
      case RelationType.Exponentiation: {
        // must be numerical
        return this.addType(relation.id, TypeEnum.NUMERIC);
      } // todo

      case RelationType.In: // must be boolean
      case RelationType.InstanceOf: // must be boolean
      case RelationType.Less: // must be boolean
      case RelationType.Greater: // must be boolean
      case RelationType.LessOrEqual: // must be boolean
      case RelationType.GreaterOrEqual: {
        // must be boolean
        return this.addType(relation.id, TypeEnum.BOOLEAN);
      }

      case RelationType.Equality: // must be boolean
      case RelationType.InEquality: // must be boolean
      case RelationType.StrictEquality: // must be boolean
      case RelationType.StrictInequality: {
        // must be boolean
        return this.addType(relation.id, TypeEnum.BOOLEAN);
      }

      case RelationType.BitwiseLeftShift: // must be numeric
      case RelationType.BitwiseRightShift: // must be numeric
      case RelationType.BitwiseUnsignedRightShift: {
        // must be numeric
        return this.addType(relation.id, TypeEnum.NUMERIC);
      }

      case RelationType.BitwiseAnd: // must be numeric
      case RelationType.BitwiseOr: // must be numeric
      case RelationType.BitwiseXor: {
        // must be numeric
        return this.addType(relation.id, TypeEnum.NUMERIC);
      }

      case RelationType.LogicalOr: {
        // can be the identifierDescription of the first or second one depending on if the first is not false/null/undefined
        return this.addType(relation.id, [involvedTypes[0], involvedTypes[1]]);
      }

      case RelationType.LogicalAnd: {
        //can be the boolean or the identifierDescription of the second one depending on if the first and second are not false/null/undefined
        return this.addType(relation.id, [involvedTypes[0], involvedTypes[1]]);
      }
      case RelationType.NullishCoalescing: {
        //??
        return false;
      } // todo

      // ternary
      case RelationType.Conditional: {
        // could be multiple things
        return this.addType(relation.id, [involvedTypes[1], involvedTypes[2]]);
      }

      case RelationType.Assignment: // no relation identifierDescription
      case RelationType.MultiplicationAssignment: // no relation identifierDescription
      case RelationType.ExponentiationAssignment: // no relation identifierDescription
      case RelationType.DivisionAssignment: // no relation identifierDescription
      case RelationType.RemainderAssigment: // no relation identifierDescription
      case RelationType.AdditionAssignment: // no relation identifierDescription
      case RelationType.SubtractionAssignment: // no relation identifierDescription
      case RelationType.LeftShiftAssignment: // no relation identifierDescription
      case RelationType.RightShiftAssignment: // no relation identifierDescription
      case RelationType.UnSignedRightShiftAssignment: // no relation identifierDescription
      case RelationType.BitwiseAndAssignment: // no relation identifierDescription
      case RelationType.BitwiseXorAssignment: // no relation identifierDescription
      case RelationType.BitwiseOrAssignment: // no relation identifierDescription
      case RelationType.LogicalAndAssignment: // no relation identifierDescription
      case RelationType.LogicalOrAssignment: // no relation identifierDescription
      case RelationType.LogicalNullishAssignment: {
        // no relation identifierDescription
        return this.addType(relation.id, TypeEnum.UNDEFINED);
      }

      case RelationType.Yield:
      case RelationType.YieldStar: {
        return false;
      }

      case RelationType.Spread: {
        // results in a sequence of the type of the spread
        return false;
      }

      case RelationType.Comma: {
        return false;
      }
    }
  }
}
