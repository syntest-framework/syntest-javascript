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

import { Element, Scope } from "@syntest/ast-visitor-javascript";

import { ComplexObject } from "../../discovery/object/ComplexObject";
import { Relation, RelationType } from "../../discovery/Relation";
import { elementTypeToTypingType, TypeEnum } from "../TypeEnum";
import { TypeProbability } from "../TypeProbability";
import { TypeResolver } from "../TypeResolver";

import { createAnonObject } from "./ObjectMatcher";

export class TypeResolverInference extends TypeResolver {
  /**
   * This function resolves constant elements such as numerical constants or other primitives
   * @param elements the elements to resolve
   */
  resolvePrimitiveElements(elements: Element[]): boolean {
    let somethingSolved = false;
    for (const element of elements) {
      const typingsType = elementTypeToTypingType(element.type);

      if (typingsType) {
        this._setElementType(element, typingsType, 1);
        somethingSolved = true;
      }
    }
    return somethingSolved;
  }

  resolveRelations(elements: Element[], relations: Relation[]): boolean {
    let somethingSolved = false;
    for (const relation of relations) {
      if (this.relationFullyResolved.has(relation)) {
        continue;
      }

      this.resolveRelationElements(relation);

      const involved: TypeProbability[] = relation.involved.map((element) =>
        this.getElementType(element)
      );

      const relationResolved = this.resolveRelation(relation, involved);

      if (relationResolved) {
        somethingSolved = true;
        this.relationFullyResolved.add(relation);
      }
    }
    return somethingSolved;
  }

  resolveComplexElements(
    elements: Element[],
    relations: Relation[],
    wrapperElementIsRelation: Map<string, Relation>,
    objects: ComplexObject[]
  ): boolean {
    let somethingSolved = false;

    // filter relations by property accessors
    // we cannot do anything with computed propertyAccessors since we don't know the computed value
    const propertyAccessors = relations.filter(
      (r) => r.relation === RelationType.PropertyAccessor && !r.computed
    );

    for (const element of elements) {
      const isRelation =
        element.type === "relation" &&
        wrapperElementIsRelation.has(element.value);
      if (isRelation) {
        const relation = wrapperElementIsRelation.get(element.value);

        if (relation.relation !== RelationType.PropertyAccessor) {
          continue;
        }
      } else if (element.type !== "identifier" || element.value === "this") {
        continue;
      }

      let properties_ = propertyAccessors.filter(
        (r) => r.involved[0].scope.filePath === element.scope.filePath
      );

      properties_ = properties_.filter(
        (r) => r.involved[0].scope.uid === element.scope.uid
      );

      properties_ = properties_.filter((r) => {
        if (
          isRelation &&
          r.involved[0].type === "relation" &&
          wrapperElementIsRelation.has(r.involved[0].value)
        ) {
          const elementRelation = wrapperElementIsRelation.get(element.value);
          const propertyRelation = wrapperElementIsRelation.get(
            r.involved[0].value
          );
          if (propertyRelation.relation === RelationType.PropertyAccessor) {
            return (
              propertyRelation.involved[0].value ===
                elementRelation.involved[0].value &&
              propertyRelation.involved[1].value ===
                elementRelation.involved[1].value
            );
          }
        }
        return r.involved[0].value === element.value;
      });

      const properties = properties_
        .map((r) => r.involved[1])

        // remove duplicates
        // eslint-disable-next-line unicorn/no-array-reduce
        .reduce((unique: Element[], item) => {
          const found = unique.find((uniqueItem: Element) => {
            return (
              uniqueItem.value === item.value &&
              uniqueItem.scope.uid === item.scope.uid
            );

            // && uniqueItem.scope.type === item.scope.type
          });
          return found ? unique : [...unique, item];
        }, []);

      if (properties.length === 0) {
        continue;
      }

      // TODO find out wether function property or regular property

      // TODO can be improved by comparing property types

      const objects_ = [
        createAnonObject(
          properties,
          wrapperElementIsRelation,
          this.elementTyping
        ),
        ...objects,
      ];

      // find matching objects
      for (const object of objects_) {
        let score = 0;
        for (const property of properties) {
          if (
            object.properties.has(property.value) ||
            object.functions.has(property.value)
          ) {
            score += 1;
          }
        }

        // atleast score of one
        if (score > 0) {
          let type: string;

          switch (object.name) {
            case "function": {
              type = TypeEnum.FUNCTION;

              break;
            }
            case "string": {
              type = TypeEnum.STRING;

              break;
            }
            case "array": {
              type = TypeEnum.ARRAY;

              break;
            }
            default: {
              type =
                object.name === "anon" || !object.name
                  ? TypeEnum.OBJECT
                  : object.name;
            }
          }

          const propertyTypings: Map<string, TypeProbability> = new Map();

          for (const function_ of object.functions) {
            const typeMap = new TypeProbability([
              [TypeEnum.FUNCTION, 1, undefined],
            ]);

            propertyTypings.set(function_, typeMap);
          }

          for (const property of object.properties) {
            if (object.propertyType && object.propertyType.has(property)) {
              const typeMap = new TypeProbability([
                [object.propertyType.get(property), 1, undefined],
              ]);
              propertyTypings.set(property, typeMap);
              continue;
            }

            // TODO scope?
            const element = properties.find((p) => p.value === property);

            if (element) {
              propertyTypings.set(element.value, this.getElementType(element));
              continue;
            }

            // get type info from the object definition
            const relevantRelations = relations
              .filter((r) => r.relation === RelationType.PropertyAccessor)
              .filter(
                (r) => r.involved[1].scope.filePath === object.export?.filePath
              )
              .filter((r) =>
                r.involved[1].scope.uid.split("-").includes(object.name)
              )
              .filter((r) => r.involved[0].value === "this")
              .filter((r) => r.involved[1].value === property)
              .filter((r) => r.involved[1].type === "identifier");

            elements = relevantRelations.map((r) => r.involved[1]);

            if (elements.length > 2) {
              const element1 = elements[0];

              for (const element2 of elements) {
                if (element1 !== element2) {
                  throw new Error(
                    `Elements are not equal! \n${JSON.stringify(
                      element1
                    )} \n${JSON.stringify(element2)}`
                  );
                }
              }
            }

            if (elements.length > 0) {
              propertyTypings.set(
                elements[0].value,
                this.getElementType(elements[0])
              );
              continue;
            }
          }

          // properties.forEach((p) => {
          //   if (this.elementTyping.has(p)) {
          //     found += 1
          //     propertyTypings.set(p.value, this.elementTyping.get(p))
          //   } else {
          //     const typeMap = new TypeProbabilityMap()
          //     // standard types
          //     if (object.functions.has(p.value)) {
          //       found += 1
          //       typeMap.addType({
          //         type: TypeEnum.FUNCTION
          //       })
          //     } else if (object.propertyType && object.propertyType.has(p.value)) {
          //       found += 1
          //       typeMap.addType(object.propertyType.get(p.value))
          //     }
          //
          //     propertyTypings.set(p.value, typeMap)
          //   }
          // })

          this._setElementType(element, type, score, object, propertyTypings);

          somethingSolved = true; // TODO should be here right?
        }
      }
    }

    return somethingSolved;
  }

  resolveTypes(
    elements: Element[],
    relations: Relation[],
    wrapperElementIsRelation: Map<string, Relation>,
    objects: ComplexObject[]
  ) {
    this.wrapperElementIsRelation = wrapperElementIsRelation;

    this.resolvePrimitiveElements(elements);
    this.resolveRelations(elements, relations);
    this.resolveComplexElements(
      elements,
      relations,
      wrapperElementIsRelation,
      objects
    );
  }

  getTyping(scope: Scope, variableName: string): TypeProbability {
    const elements = this.elements.filter((element) => !!element.scope);

    const correctFile = elements.filter(
      (element) => element.scope.filePath === scope.filePath
    );

    const correctVariable = correctFile.filter(
      (element) => element.value === variableName
    );

    const correctScope = correctVariable.find(
      (element) => `${element.scope.uid}` === `${scope.uid}`
    );

    const element = correctScope;

    if (!element) {
      // throw new Error("Invalid!")
      return new TypeProbability();
    }

    return this.getElementType(element);
  }

  resolveRelationElements(relation: Relation): boolean {
    const relationType: RelationType = relation.relation;
    const involved: Element[] = relation.involved;

    switch (relationType) {
      case RelationType.Await: {
        // often function?
        this.setElementType(relation, involved[0], TypeEnum.FUNCTION, 1);
        this.setProcessed(relation, involved[0]);
        return true;
      }

      case RelationType.FunctionDefinition: {
        // could be multiple things
        // but we do know that the first involved element is a function
        this.setElementType(relation, involved[0], TypeEnum.FUNCTION, 1);
        this.setProcessed(relation, involved[0]);
        return false;
      }
      case RelationType.ClassDefinition: {
        this.setElementType(relation, involved[0], TypeEnum.OBJECT, 1);
        this.setProcessed(relation, involved[0]);
        return true;
      }

      case RelationType.Object: // could be multiple things
      case RelationType.ObjectProperty: // could be multiple things
      case RelationType.Array: // could be multiple things
      case RelationType.Sequence: {
        // could be multiple things
        return false;
      }

      case RelationType.PropertyAccessor: {
        // could be multiple things
        // although the first has to an object/array
        this.setElementType(relation, involved[0], TypeEnum.OBJECT, 1);
        this.setElementType(relation, involved[0], TypeEnum.ARRAY, 1);
        this.setElementType(relation, involved[0], TypeEnum.FUNCTION, 1);
        this.setElementType(relation, involved[0], TypeEnum.STRING, 1);
        this.setProcessed(relation, involved[0]);
        return false;
      }
      case RelationType.New: {
        //
        return false;
      }
      case RelationType.Spread: {
        // should be iterable
        this.setElementType(relation, involved[0], TypeEnum.OBJECT, 1);
        this.setElementType(relation, involved[0], TypeEnum.ARRAY, 1);
        this.setProcessed(relation, involved[0]);
        return true;
      }

      case RelationType.PlusPlusPrefix: // must be numerical
      case RelationType.MinusMinusPrefix: // must be numerical
      case RelationType.PlusPlusPostFix: // must be numerical
      case RelationType.MinusMinusPostFix: {
        // must be numerical
        this.setElementType(relation, involved[0], TypeEnum.NUMERIC, 1);
        this.setProcessed(relation, involved[0]);
        return true;
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

      // binary
      case RelationType.Addition: {
        this.setElementType(relation, involved[0], TypeEnum.NUMERIC, 1);
        this.setElementType(relation, involved[0], TypeEnum.STRING, 1);
        this.setElementType(relation, involved[1], TypeEnum.NUMERIC, 1);
        this.setElementType(relation, involved[1], TypeEnum.STRING, 1);
        this.setProcessed(relation, involved[0]);
        this.setProcessed(relation, involved[1]);
        return false;
      } // could be multiple things
      case RelationType.Subtraction: // must be numerical
      case RelationType.Division: // must be numerical
      case RelationType.Multiplication: // must be numerical
      case RelationType.Remainder: // must be numerical
      case RelationType.Exponentiation: {
        // must be numerical
        this.setElementType(relation, involved[0], TypeEnum.NUMERIC, 1);
        this.setElementType(relation, involved[1], TypeEnum.NUMERIC, 1);
        this.setProcessed(relation, involved[0]);
        this.setProcessed(relation, involved[1]);
        return true;
      }

      case RelationType.In: {
        // could be multiple things
        this.setElementType(relation, involved[1], TypeEnum.OBJECT, 1);
        this.setProcessed(relation, involved[1]);
        return false;
      }
      case RelationType.InstanceOf: {
        // could be multiple things
        this.setElementType(relation, involved[1], TypeEnum.STRING, 1);
        this.setProcessed(relation, involved[1]);
        return false;
      }
      case RelationType.Less: // must be numeric
      case RelationType.Greater: // must be numeric
      case RelationType.LessOrEqual: // must be numeric
      case RelationType.GreaterOrEqual: {
        // must be numeric
        // TODO not actually true this can also be other things
        this.setElementType(relation, involved[0], TypeEnum.NUMERIC, 1);
        this.setElementType(relation, involved[1], TypeEnum.NUMERIC, 1);
        this.setProcessed(relation, involved[0]);
        this.setProcessed(relation, involved[1]);
        return true;
      }

      case RelationType.Equality: // could be multiple things
      case RelationType.InEquality: // could be multiple things
      case RelationType.StrictEquality: // could be multiple things
      case RelationType.StrictInequality: {
        // could be multiple things
        this.setElementTypeToElement(relation, involved[0], involved[1], 1);
        this.setElementTypeToElement(relation, involved[1], involved[0], 1);
        this.setProcessed(relation, involved[0]);
        this.setProcessed(relation, involved[1]);
        return true;
      }

      case RelationType.BitwiseLeftShift: // must be numeric
      case RelationType.BitwiseRightShift: // must be numeric
      case RelationType.BitwiseUnsignedRightShift: // must be numeric

      case RelationType.BitwiseAnd: // must be numeric
      case RelationType.BitwiseOr: // must be numeric
      case RelationType.BitwiseXor: {
        // must be numeric
        this.setElementType(relation, involved[0], TypeEnum.NUMERIC, 1);
        this.setElementType(relation, involved[1], TypeEnum.NUMERIC, 1);
        this.setProcessed(relation, involved[0]);
        this.setProcessed(relation, involved[1]);
        return true;
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
        this.setElementTypeToElement(relation, involved[0], involved[1], 1);
        this.setElementTypeToElement(relation, involved[1], involved[0], 1);
        this.setProcessed(relation, involved[0]);
        this.setProcessed(relation, involved[1]);
        return true;
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
        this.setElementType(relation, involved[0], TypeEnum.NUMERIC, 1);
        this.setElementType(relation, involved[1], TypeEnum.NUMERIC, 1);
        this.setProcessed(relation, involved[0]);
        this.setProcessed(relation, involved[1]);

        return true;
      }
      case RelationType.AdditionAssignment: {
        // must be numeric or string
        this.setElementType(relation, involved[0], TypeEnum.NUMERIC, 1);
        this.setElementType(relation, involved[1], TypeEnum.NUMERIC, 1);
        this.setElementType(relation, involved[0], TypeEnum.STRING, 1);
        this.setElementType(relation, involved[1], TypeEnum.STRING, 1);
        this.setProcessed(relation, involved[0]);
        this.setProcessed(relation, involved[1]);

        return true;
      }

      case RelationType.LogicalAndAssignment: // could be multiple things
      case RelationType.LogicalOrAssignment: // could be multiple things
      case RelationType.LogicalNullishAssignment: {
        // could be multiple things
        // left is boolean
        // right is probably boolean
        this.setElementType(relation, involved[0], TypeEnum.BOOLEAN, 1);
        this.setProcessed(relation, involved[0]);
        return false;
      }

      case RelationType.Return: // could be multiple things

      // multi
      case RelationType.Call: {
        // could be multiple things
        // but we do know that the first involved element is a function
        this.setElementType(relation, involved[0], TypeEnum.FUNCTION, 1);
        this.setProcessed(relation, involved[0]);
        return false;
      }

      case RelationType.PrivateName: {
        return false;
      }
    }

    throw new Error(`Unimplemented relation type: ${relationType}`);
  }

  resolveRelation(relation: Relation, involved: TypeProbability[]): boolean {
    // TODO

    switch (relation.relation) {
      case RelationType.Await: {
        // It should be equal to the result of the function return type
        return false;
      }
      case RelationType.FunctionDefinition: {
        this.setRelationType(relation, TypeEnum.FUNCTION, 1);
        return true;
      }
      case RelationType.ClassDefinition: {
        this.setRelationType(relation, TypeEnum.OBJECT, 1);
        return true;
      }

      // Unary
      case RelationType.PropertyAccessor: {
        // must be equal to the identifierDescription of the member element
        this.setRelationType(relation, involved[1], 1);
        return true;
      }
      case RelationType.New: {
        // always an object
        this.setRelationType(relation, TypeEnum.OBJECT, 1);
        this.setRelationType(relation, involved[0], 1);
        return true;
      }
      case RelationType.Spread: {
        // must be array i think
        this.setRelationType(relation, TypeEnum.ARRAY, 1);
        return true;
      }

      case RelationType.ObjectProperty: // could be multiple things
      case RelationType.Sequence: {
        // could be multiple things
        return false;
      }

      case RelationType.PlusPlusPostFix: // must be numerical
      case RelationType.MinusMinusPostFix: // must be numerical
      case RelationType.PlusPlusPrefix: // must be numerical
      case RelationType.MinusMinusPrefix: {
        // must be numerical
        this.setRelationType(relation, TypeEnum.NUMERIC, 1);
        return true;
      }

      case RelationType.Delete: {
        // must be void
        this.setRelationType(relation, TypeEnum.UNDEFINED, 1);
        return true;
      }
      case RelationType.Void: {
        // must be void
        this.setRelationType(relation, TypeEnum.UNDEFINED, 1);
        return true;
      }

      case RelationType.TypeOf: {
        // must be string
        this.setRelationType(relation, TypeEnum.STRING, 1);
        return true;
      }
      case RelationType.PlusUnary: // must be numerical
      case RelationType.MinusUnary: {
        // must be numerical
        this.setRelationType(relation, TypeEnum.NUMERIC, 1);
        return true;
      }
      case RelationType.BitwiseNotUnary: {
        // todo
        return false;
      }
      case RelationType.LogicalNotUnary: {
        // must be boolean
        this.setRelationType(relation, TypeEnum.BOOLEAN, 1);
        return true;
      }

      // binary
      case RelationType.Addition: {
        // TODO can be more
        // TODO should be based on what the involved values are
        this.setRelationType(relation, TypeEnum.NUMERIC, 1);
        this.setRelationType(relation, TypeEnum.STRING, 1);
        return true;
      }
      case RelationType.Subtraction: // must be numerical
      case RelationType.Division: // must be numerical
      case RelationType.Multiplication: // must be numerical
      case RelationType.Remainder: // must be numerical
      case RelationType.Exponentiation: {
        // must be numerical
        this.setRelationType(relation, TypeEnum.NUMERIC, 1);
        return true;
      } // todo

      case RelationType.In: // must be boolean
      case RelationType.InstanceOf: // must be boolean
      case RelationType.Less: // must be boolean
      case RelationType.Greater: // must be boolean
      case RelationType.LessOrEqual: // must be boolean
      case RelationType.GreaterOrEqual: {
        // must be boolean
        this.setRelationType(relation, TypeEnum.BOOLEAN, 1);
        return true;
      }

      case RelationType.Equality: // must be boolean
      case RelationType.InEquality: // must be boolean
      case RelationType.StrictEquality: // must be boolean
      case RelationType.StrictInequality: {
        // must be boolean
        this.setRelationType(relation, TypeEnum.BOOLEAN, 1);
        return true;
      }

      case RelationType.BitwiseLeftShift: // must be numeric
      case RelationType.BitwiseRightShift: // must be numeric
      case RelationType.BitwiseUnsignedRightShift: {
        // must be numeric
        this.setRelationType(relation, TypeEnum.NUMERIC, 1);
        return true;
      }

      case RelationType.BitwiseAnd: // must be numeric
      case RelationType.BitwiseOr: // must be numeric
      case RelationType.BitwiseXor: {
        // must be numeric
        this.setRelationType(relation, TypeEnum.NUMERIC, 1);
        return true;
      }

      case RelationType.LogicalOr: {
        // can be the identifierDescription of the first or second one depending on if the first is not false/null/undefined
        this.setRelationType(relation, involved[0], 1);
        this.setRelationType(relation, involved[1], 1);
        return true;
      }

      case RelationType.LogicalAnd: {
        //can be the boolean or the identifierDescription of the second one depending on if the first and second are not false/null/undefined
        this.setRelationType(relation, involved[0], 1);
        this.setRelationType(relation, involved[1], 1);
        return true;
      }
      case RelationType.NullishCoalescing: {
        //??
        return false;
      } // todo

      // ternary
      case RelationType.Conditional: {
        // could be multiple things
        this.setRelationType(relation, involved[0], 1);
        this.setRelationType(relation, involved[1], 1);
        return true;
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
        this.setRelationType(relation, TypeEnum.UNDEFINED, 1);
        return true;
      }

      // TODO

      case RelationType.Return: {
        // must be equal to the identifierDescription of the returned element
        this.setRelationType(relation, involved[1], 1);
        return true;
      }

      case RelationType.Call: {
        // must be the return identifierDescription of the called function
        return false;
      }
      case RelationType.Object: {
        // could be multiple things
        this.setRelationType(relation, TypeEnum.OBJECT, 1);
        return true;
      }
      case RelationType.Array: {
        // could be multiple things
        this.setRelationType(relation, TypeEnum.ARRAY, 1);
        return true;
      }
      case RelationType.PrivateName: {
        return false;
      }
    }

    throw new Error(`Unimplemented relation type: ${relation.relation}`);
  }
}
