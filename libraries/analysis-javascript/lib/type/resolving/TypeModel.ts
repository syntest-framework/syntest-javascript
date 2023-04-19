/*
 * Copyright 2020-2023 Delft University of Technology and SynTest contributors
 *
 * This file is part of SynTest Framework - SynTest JavaScript.
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

import { prng } from "@syntest/core";
import {
  ArrayType,
  FunctionType,
  ObjectType,
  PrimitiveType,
  Type,
  isPrimitiveType,
} from "./Type";
import { TypeEnum } from "./TypeEnum";

export class TypeModel {
  private _elements: Set<string>;
  // element1 -> element2 -> score
  private _relationScoreMap: Map<string, Map<string, number>>;
  // element -> type enum -> score
  private _elementTypeScoreMap: Map<string, Map<string, number>>;
  // element -> type enum -> score
  private _typeExecutionScoreMap: Map<string, Map<string, number>>;

  // element -> type enum -> probability
  private _elementTypeProbabilityMap: Map<string, Map<string, number>>;

  // element -> type enum -> type
  private _typeIdToTypeMap: Map<string, Map<string, Type>>;

  // element -> type enum -> type
  private _finalTypeIdToTypeMap: Map<string, Map<string, Type>>;

  // element -> scoreHasChanged
  private _scoreHasChangedMap: Map<string, boolean>;

  constructor() {
    this._elements = new Set();

    this._relationScoreMap = new Map();
    this._elementTypeScoreMap = new Map();
    this._typeExecutionScoreMap = new Map();

    this._elementTypeProbabilityMap = new Map();

    this._typeIdToTypeMap = new Map();
    this._finalTypeIdToTypeMap = new Map();

    this._scoreHasChangedMap = new Map();
  }

  getType(element: string, type: TypeEnum): Type {
    if (this._finalTypeIdToTypeMap.size === 0) {
      return this._typeIdToTypeMap.get(element).get(type);
    }
    return this._finalTypeIdToTypeMap.get(element).get(type);
  }

  addId(id: string) {
    if (this._elements.has(id)) {
      return;
    }

    this._elements.add(id);
    this._relationScoreMap.set(id, new Map());
    this._elementTypeScoreMap.set(id, new Map());
    this._elementTypeProbabilityMap.set(id, new Map());
    this._typeExecutionScoreMap.set(id, new Map());
    this._typeIdToTypeMap.set(id, new Map());
    this._scoreHasChangedMap.set(id, true);

    this._addTypeScore(id, { type: TypeEnum.NUMERIC }, 0.1);
    this._addTypeScore(id, { type: TypeEnum.STRING }, 0.1);
    this._addTypeScore(id, { type: TypeEnum.BOOLEAN }, 0.1);
    this._addTypeScore(id, { type: TypeEnum.NULL }, 0.1);
    this._addTypeScore(id, { type: TypeEnum.UNDEFINED }, 0.1);
    this._addTypeScore(id, { type: TypeEnum.REGEX }, 0.1);
    this._addTypeScore(id, { type: TypeEnum.ARRAY, elements: new Map() }, 0.1);
    this._addTypeScore(
      id,
      { type: TypeEnum.OBJECT, properties: new Map() },
      0.1
    );
    this._addTypeScore(
      id,
      { type: TypeEnum.FUNCTION, parameters: new Map(), return: new Set() },
      0.1
    );
  }

  private _addRelationScore(id1: string, id2: string, score: number) {
    if (!this._relationScoreMap.has(id1)) {
      throw new Error(`Element ${id1} does not exist`);
    }
    if (!this._relationScoreMap.get(id1).has(id2)) {
      this._relationScoreMap.get(id1).set(id2, 0);
    }

    const currentScore1 = this._relationScoreMap.get(id1).get(id2);

    this._relationScoreMap.get(id1).set(id2, currentScore1 + score);

    this._scoreHasChangedMap.set(id1, true);
  }

  addRelationScore(id1: string, id2: string, score = 1) {
    this._addRelationScore(id1, id2, score);
    this._addRelationScore(id2, id1, score);
  }

  private _addTypeScore(id: string, type: Type, score: number) {
    if (!this._elementTypeScoreMap.has(id)) {
      throw new Error(`Element ${id} does not exist`);
    }
    if (!this._elementTypeScoreMap.get(id).has(type.type)) {
      this._elementTypeScoreMap.get(id).set(type.type, 0);
    }

    const currentScore = this._elementTypeScoreMap.get(id).get(type.type);

    this._elementTypeScoreMap.get(id).set(type.type, currentScore + score);

    this._scoreHasChangedMap.set(id, true);

    if (!this._typeIdToTypeMap.get(id).has(type.type)) {
      this._typeIdToTypeMap.get(id).set(type.type, type);
    }
  }

  addPrimitiveTypeScore(id: string, type: PrimitiveType, score = 1) {
    this._addTypeScore(id, type, score);
  }

  addFunctionTypeScore(element: string, type: FunctionType, score = 1) {
    this._addTypeScore(element, type, score);
    const currentType = <FunctionType>(
      this._typeIdToTypeMap.get(element).get(type.type)
    );

    if (currentType === type) {
      // just added so we ignore
      return;
    }

    // merge the new type with the existing one
    for (const [index, id] of type.parameters.entries()) {
      currentType.parameters.set(index, id);
    }

    currentType.return = new Set([...type.return, ...currentType.return]);
  }

  addArrayTypeScore(id: string, type: ArrayType, score = 1) {
    this._addTypeScore(id, type, score);
    const currentType = <ArrayType>this._typeIdToTypeMap.get(id).get(type.type);

    if (currentType === type) {
      // just added so we ignore
      return;
    }

    // merge the new type with the existing one
    for (const [index, id] of type.elements.entries()) {
      currentType.elements.set(index, id);
    }
  }

  addObjectTypeScore(id: string, type: ObjectType, score = 1) {
    this._addTypeScore(id, type, score);
    const currentType = <ObjectType>(
      this._typeIdToTypeMap.get(id).get(type.type)
    );

    if (currentType === type) {
      // just added so we ignore
      return;
    }

    // merge the new type with the existing one
    for (const [name, id] of type.properties.entries()) {
      currentType.properties.set(name, id);
    }
  }

  // TODO type should be TypeEnum?
  addExecutionScore(id: string, type: string, score: number) {
    if (!this._typeExecutionScoreMap.has(id)) {
      throw new Error(`Element ${id} does not exist`);
    }

    if (!this._typeExecutionScoreMap.get(id).has(type)) {
      this._typeExecutionScoreMap.get(id).set(type, 0);
    }

    const currentScore = this._typeExecutionScoreMap.get(id).get(type);

    this._typeExecutionScoreMap.get(id).set(type, currentScore + score);

    this._scoreHasChangedMap.set(id, true);
  }

  getRandomType(incorporateExecutionScore: boolean, element: string): Type {
    this.calculateProbabilitiesForElement(incorporateExecutionScore, element);

    const probabilities = this._elementTypeProbabilityMap.get(element);

    const choice = prng.nextDouble(0, 1);
    let index = 0;

    let type: string;
    let probability: number;
    for ([type, probability] of probabilities.entries()) {
      if (choice <= index + probability) {
        return this._typeIdToTypeMap.get(element).get(type);
      }

      index += probability;
    }

    return this._typeIdToTypeMap.get(element).get(type);
  }

  getHighestProbabilityType(
    incorporateExecutionScore: boolean,
    element: string
  ): Type {
    this.calculateProbabilitiesForElement(incorporateExecutionScore, element);

    const probabilities = this._elementTypeProbabilityMap.get(element);

    let best: string = probabilities.keys().next().value;

    for (const [type, probability] of probabilities.entries()) {
      if (probability > probabilities.get(best)) {
        best = type;
      }
    }

    return this._typeIdToTypeMap.get(element).get(best);
  }

  private copyType(type: Type): Type {
    if (isPrimitiveType(type)) {
      return {
        type: type.type,
      };
    } else
      switch (type.type) {
        case TypeEnum.FUNCTION: {
          return {
            type: type.type,
            parameters: new Map(type.parameters),
            return: new Set(type.return),
          };
        }
        case TypeEnum.ARRAY: {
          return {
            type: type.type,
            elements: new Map(type.elements),
          };
        }
        case TypeEnum.OBJECT: {
          return {
            type: type.type,
            properties: new Map(type.properties),
          };
        }
        default: {
          throw new Error(`Unknown type ${type}`);
        }
      }
  }

  private mergeType(type1: Type, type2: Type): Type {
    if (type1.type !== type2.type) {
      throw new Error(`Cannot merge types ${type1.type} and ${type2.type}`);
    }

    if (isPrimitiveType(type1)) {
      return {
        type: type1.type,
      };
    } else if (
      type1.type === TypeEnum.FUNCTION &&
      type2.type === TypeEnum.FUNCTION
    ) {
      return {
        type: type1.type,
        parameters: new Map([...type1.parameters, ...type2.parameters]),
        return: new Set([...type1.return, ...type2.return]),
      };
    } else if (type1.type === TypeEnum.ARRAY && type2.type === TypeEnum.ARRAY) {
      return {
        type: type1.type,
        elements: new Map([...type1.elements, ...type2.elements]),
      };
    } else if (
      type1.type === TypeEnum.OBJECT &&
      type2.type === TypeEnum.OBJECT
    ) {
      return {
        type: type1.type,
        properties: new Map([...type1.properties, ...type2.properties]),
      };
    } else {
      throw new Error(`Unknown type ${type1.type} ${type2.type}`);
    }
  }

  calculateProbabilitiesForElement(
    incorporateExecutionScore: boolean,
    element: string,
    relationPairsVisited?: Map<string, Set<string>>
  ) {
    // if (!this._scoreHasChangedMap.has(element)) {
    //     throw new Error(`Element ${element} does not exist`);
    // }
    // if (this._scoreHasChangedMap.get(element) === false) {
    //     console.log(`Element ${element} has not changed`)
    //     // prevent recalculation of probabilities without score changes
    //     return;
    // }

    // this._scoreHasChangedMap.set(element, false);

    if (!relationPairsVisited) {
      relationPairsVisited = new Map();
    }

    const typeScoreMap = this._elementTypeScoreMap.get(element);
    const relationMap = this._relationScoreMap.get(element);

    const probabilityMap = new Map<string, number>();

    let totalScore = 0;
    for (const score of typeScoreMap.values()) {
      totalScore += score;
    }

    for (const [relation, score] of relationMap.entries()) {
      if (!relationPairsVisited.has(element)) {
        relationPairsVisited.set(element, new Set());
      }

      if (relationPairsVisited.get(element).has(relation)) {
        // we have already visited this relation pair
        // this means that we have a cycle in the graph
        // we can safely ignore this relation
        continue;
      }

      totalScore += score;
    }

    for (const [type, score] of typeScoreMap.entries()) {
      probabilityMap.set(type, score / totalScore);
    }

    for (const [relation, score] of relationMap.entries()) {
      if (relationPairsVisited.get(element).has(relation)) {
        // we have already visited this relation pair
        // this means that we have a cycle in the graph
        // we can safely ignore this relation
        continue;
      }

      relationPairsVisited.get(element).add(relation);

      const probabilityOfRelation = score / totalScore;

      this.calculateProbabilitiesForElement(
        incorporateExecutionScore,
        relation,
        relationPairsVisited
      );
      const probabilityMapOfRelation =
        this._elementTypeProbabilityMap.get(relation);

      if (probabilityMapOfRelation.size === 0) {
        throw new Error(`No probabilities for relation ${relation}`);
      }
      for (const [type, probability] of probabilityMapOfRelation.entries()) {
        if (!probabilityMap.has(type)) {
          probabilityMap.set(type, 0);
        }

        probabilityMap.set(
          type,
          probabilityMap.get(type) + probability * probabilityOfRelation
        );
      }
    }

    // sanity check
    let totalProbability = 0;
    for (const probability of probabilityMap.values()) {
      totalProbability += probability;
    }

    if (Math.abs(totalProbability - 1) > 0.0001) {
      throw new Error(
        `Total probability should be 1, but is ${totalProbability}`
      );
    }

    // incorporate execution scores
    const executionScoreMap = this._typeExecutionScoreMap.get(element);

    if (incorporateExecutionScore && executionScoreMap.size > 0) {
      let minValue = 0;
      for (const score of executionScoreMap.values()) {
        minValue = Math.min(minValue, score);
      }

      let totalScore = 0;
      for (const type of typeScoreMap.keys()) {
        let score = executionScoreMap.has(type)
          ? executionScoreMap.get(type)
          : 0;
        score -= minValue;
        totalScore += score;
      }

      if (totalScore < 0) {
        throw new Error("Total score should be positive");
      }

      if (totalScore === 0) {
        throw new Error("Total score should be positive");
      }

      // incorporate execution score
      for (const type of typeScoreMap.keys()) {
        let score = executionScoreMap.has(type)
          ? executionScoreMap.get(type)
          : 0;
        score -= minValue;

        const executionScoreDiscount = score / totalScore;
        const probability = probabilityMap.get(type);
        const newProbability = executionScoreDiscount * probability;

        probabilityMap.set(type, newProbability);
      }

      // normalize to 1
      let totalProbability = 0;
      for (const probability of probabilityMap.values()) {
        totalProbability += probability;
      }

      if (totalProbability !== 0) {
        for (const [type, probability] of probabilityMap.entries()) {
          probabilityMap.set(type, probability / totalProbability);
        }
      }
    }

    this._elementTypeProbabilityMap.set(element, probabilityMap);
  }
}
