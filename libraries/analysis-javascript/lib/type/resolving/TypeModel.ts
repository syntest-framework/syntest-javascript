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

import { prng } from "@syntest/prng";
import {
  ObjectType,
  arrayProperties,
  functionProperties,
  stringProperties,
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

  // element -> scoreHasChanged
  private _scoreHasChangedMap: Map<string, boolean>;

  // element -> object type
  private _objectTypeDescription: Map<string, ObjectType>;

  constructor() {
    this._elements = new Set();

    this._relationScoreMap = new Map();
    this._elementTypeScoreMap = new Map();
    this._typeExecutionScoreMap = new Map();

    this._elementTypeProbabilityMap = new Map();

    this._scoreHasChangedMap = new Map();

    this._objectTypeDescription = new Map();

    this.addId("anon"); // should be removed at some point
  }

  get relationScoreMap() {
    return this._relationScoreMap;
  }

  get elementTypeScoreMap() {
    return this._elementTypeScoreMap;
  }

  get typeExecutionScoreMap() {
    return this._typeExecutionScoreMap;
  }

  getObjectDescription(element: string): ObjectType {
    if (!this._objectTypeDescription.has(element)) {
      throw new Error(`Element ${element} does not have an object description`);
    }

    return this._objectTypeDescription.get(element);
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
    this._scoreHasChangedMap.set(id, true);

    this._objectTypeDescription.set(id, {
      properties: new Map(),
      elements: new Set(),
      parameters: new Map(),
      parameterNames: new Map(),
      return: new Set(),
    });
  }

  setEqual(id1: string, id2: string) {
    //TODO maybe merge
    for (const [key, value] of this._relationScoreMap.get(id2).entries())
      this._relationScoreMap.get(id1).has(key)
        ? this._relationScoreMap.get(id1).set(key, value)
        : this._relationScoreMap
            .get(id1)
            .set(key, this._relationScoreMap.get(id1).get(key) + value);
    for (const [key, value] of this._elementTypeScoreMap.get(id2).entries())
      this._elementTypeScoreMap.get(id1).has(key)
        ? this._elementTypeScoreMap.get(id1).set(key, value)
        : this._elementTypeScoreMap
            .get(id1)
            .set(key, this._elementTypeScoreMap.get(id1).get(key) + value);
    for (const [key, value] of this._elementTypeProbabilityMap
      .get(id2)
      .entries())
      this._elementTypeProbabilityMap.get(id1).has(key)
        ? this._elementTypeProbabilityMap.get(id1).set(key, value)
        : this._elementTypeProbabilityMap
            .get(id1)
            .set(
              key,
              this._elementTypeProbabilityMap.get(id1).get(key) + value
            );
    for (const [key, value] of this._typeExecutionScoreMap.get(id2).entries())
      this._typeExecutionScoreMap.get(id1).has(key)
        ? this._typeExecutionScoreMap.get(id1).set(key, value)
        : this._typeExecutionScoreMap
            .get(id1)
            .set(key, this._typeExecutionScoreMap.get(id1).get(key) + value);

    this._relationScoreMap.set(id2, this._relationScoreMap.get(id1));
    this._elementTypeScoreMap.set(id2, this._elementTypeScoreMap.get(id1));
    this._elementTypeProbabilityMap.set(
      id2,
      this._elementTypeProbabilityMap.get(id1)
    );
    this._typeExecutionScoreMap.set(id2, this._typeExecutionScoreMap.get(id1));
    this._scoreHasChangedMap.set(id2, this._scoreHasChangedMap.get(id1));
    // TODO maybe this should be merged too?
    // or should we keep them separate?
    this._objectTypeDescription.set(id2, this._objectTypeDescription.get(id1));
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

  addWeakRelation(id1: string, id2: string) {
    this.addRelationScore(id1, id2, 1);
  }

  addStrongRelation(id1: string, id2: string) {
    this.addRelationScore(id1, id2, 10);
  }

  addRelationScore(id1: string, id2: string, score: number) {
    if (id1 === id2) {
      // no self loops
      return;
      // throw new Error(`ids should not be equal to add a relation id: ${id1}`);
    }
    this._addRelationScore(id1, id2, score);
    this._addRelationScore(id2, id1, score);
  }

  addTypeScore(id: string, type: TypeEnum, score = 1) {
    if (!this._elementTypeScoreMap.has(id)) {
      throw new Error(`Element ${id} does not exist`);
    }
    if (!this._elementTypeScoreMap.get(id).has(type)) {
      this._elementTypeScoreMap.get(id).set(type, 0);
    }
    if (!this._typeExecutionScoreMap.get(id).has(type)) {
      this._typeExecutionScoreMap.get(id).set(type, 0);
    }

    const currentScore = this._elementTypeScoreMap.get(id).get(type);

    this._elementTypeScoreMap.get(id).set(type, currentScore + score);
    this._scoreHasChangedMap.set(id, true);

    if (type === TypeEnum.NUMERIC) {
      this.addTypeScore(id, TypeEnum.INTEGER, score);
    }
  }

  addPropertyType(element: string, property: string, id: string) {
    // check if the property is from a string/array/function

    if (functionProperties.has(property)) {
      this.addTypeScore(element, TypeEnum.FUNCTION);
    }

    if (arrayProperties.has(property)) {
      this.addTypeScore(element, TypeEnum.ARRAY);
    }

    if (stringProperties.has(property)) {
      this.addTypeScore(element, TypeEnum.STRING);
    }

    this.addTypeScore(element, TypeEnum.OBJECT);

    this.getObjectDescription(element).properties.set(property, id);
  }

  addParameterType(element: string, index: number, id: string, name: string) {
    this.addTypeScore(element, TypeEnum.FUNCTION);
    this.getObjectDescription(element).parameters.set(index, id);
    this.getObjectDescription(element).parameterNames.set(index, name);
  }

  addReturnType(element: string, returnId: string) {
    this.addTypeScore(element, TypeEnum.FUNCTION);
    this.getObjectDescription(element).return.add(returnId);
  }

  addElementType(element: string, id: string) {
    this.addTypeScore(element, TypeEnum.ARRAY);
    this.getObjectDescription(element).elements.add(id);
  }

  // TODO should also add scores to  the relations when relevant
  addExecutionScore(
    id: string,
    typeId: string,
    typeEnum: TypeEnum,
    score = -1
  ) {
    if (!this._typeExecutionScoreMap.has(id)) {
      throw new Error(`Element ${id} does not exist`);
    }

    let type: string = typeEnum;

    if (id !== typeId) {
      type = `${typeId}<>${typeEnum}`;
    }

    if (!this._typeExecutionScoreMap.get(id).has(type)) {
      this._typeExecutionScoreMap.get(id).set(type, 0);
    }

    if (!this._elementTypeScoreMap.get(id).has(type)) {
      this._elementTypeScoreMap.get(id).set(type, 0);
    }

    const currentScore = this._typeExecutionScoreMap.get(id).get(type);
    this._typeExecutionScoreMap.get(id).set(type, currentScore + score);
    this._scoreHasChangedMap.set(id, true);
  }

  private _sum(iterable: Iterable<number>) {
    return [...iterable].reduce(
      (total, currentValue) => total + currentValue,
      0
    );
  }

  /**
   *
   * @param incorporateExecutionScore wether the execution score should be weighted in
   * @param id the id we want to get a random type for
   * @param matchType (optional) the type enum you want to get (there can be multiple object/function/array types)
   * @returns a string describing the type
   */
  getRandomType(
    incorporateExecutionScore: boolean,
    randomTypeProbability: number,
    id: string
  ): string {
    const probabilities = this.calculateProbabilitiesForElement(
      incorporateExecutionScore,
      id
    );

    // const x = new Map()
    // for (const [type, probability] of probabilities.entries()) {
    //   const typeEnum = type.includes('<>') ? type.split('<>')[1] : type

    //   if (!x.has(typeEnum)) {
    //     x.set(typeEnum, 0)
    //   }

    //   x.set(typeEnum, x.get(typeEnum) + probability)
    // }
    // console.log(id)
    // console.log(x)

    const genericTypes = [
      TypeEnum.ARRAY,
      TypeEnum.BOOLEAN,
      TypeEnum.FUNCTION,
      TypeEnum.NULL,
      TypeEnum.NUMERIC,
      TypeEnum.INTEGER,
      TypeEnum.OBJECT,
      TypeEnum.REGEX,
      TypeEnum.STRING,
      TypeEnum.UNDEFINED,
    ];

    if (probabilities.size === 0) {
      return prng.pickOne(genericTypes);
    }

    if (
      this._sum(probabilities.values()) === 0 ||
      prng.nextBoolean(randomTypeProbability)
    ) {
      return prng.pickOne([
        ...new Set([...probabilities.keys(), ...genericTypes]),
      ]);
    }

    const matchingTypes = [...probabilities.entries()];
    const totalProbability = 1;

    const choice = prng.nextDouble(0, totalProbability);
    let index = 0;

    let chosenType: string;
    let probability: number;
    for ([chosenType, probability] of matchingTypes) {
      if (choice <= index + probability) {
        return chosenType;
      }

      index += probability;
    }

    return chosenType;
  }

  getHighestProbabilityType(
    incorporateExecutionScore: boolean,
    randomTypeProbability: number,
    id: string
  ): string {
    const probabilities = this.calculateProbabilitiesForElement(
      incorporateExecutionScore,
      id
    );

    const genericTypes = [
      TypeEnum.ARRAY,
      TypeEnum.BOOLEAN,
      TypeEnum.FUNCTION,
      TypeEnum.NULL,
      TypeEnum.NUMERIC,
      TypeEnum.INTEGER,
      TypeEnum.OBJECT,
      TypeEnum.REGEX,
      TypeEnum.STRING,
      TypeEnum.UNDEFINED,
    ];

    if (probabilities.size === 0) {
      return prng.pickOne(genericTypes);
    }

    if (prng.nextBoolean(randomTypeProbability)) {
      return prng.pickOne([
        ...new Set([...probabilities.keys(), ...genericTypes]),
      ]);
    }

    const matchingTypes = probabilities;

    let best: string = matchingTypes.keys().next().value;

    for (const [type, probability] of matchingTypes.entries()) {
      if (probability > matchingTypes.get(best)) {
        best = type;
      }
    }

    return best;
  }

  calculateProbabilitiesForFile(
    incorporateExecutionScore: boolean,
    filepath: string
  ): Map<string, Map<string, number>> {
    const map = new Map();
    for (const id of this._elements) {
      if (!id.startsWith(filepath)) {
        continue;
      }
      map.set(
        id,
        this.calculateProbabilitiesForElement(incorporateExecutionScore, id)
      );
    }

    return map;
  }

  calculateProbabilitiesForElement(
    incorporateExecutionScore: boolean,
    id: string,
    relationPairsVisited?: Map<string, Set<string>>
  ): Map<string, number> {
    // if (!this._scoreHasChangedMap.has(element)) {
    //     throw new Error(`Element ${element} does not exist`);
    // }
    // if (this._scoreHasChangedMap.get(element) === false) {
    //     // prevent recalculation of probabilities without score changes
    //     return this._elementTypeProbabilityMap.get(element);
    // }

    // this._scoreHasChangedMap.set(element, false);

    const probabilityMap = new Map<string, number>();

    if (id === "anon") {
      return probabilityMap;
    }

    const typeScoreMap = this._elementTypeScoreMap.get(id);
    const relationMap = this._relationScoreMap.get(id);

    if (typeScoreMap === undefined) {
      throw new Error(`Cannot get typescoreMap of ${id}`);
    }

    if (!relationPairsVisited) {
      relationPairsVisited = new Map();
      // this._scoreHasChangedMap.set(element, false);
      // this._elementTypeProbabilityMap.set(element, probabilityMap);
    }

    let totalScore = this._sum(typeScoreMap.values());

    const usableRelations = new Set<string>();

    for (const [relation, score] of relationMap.entries()) {
      if (relation === id) {
        // ignore self references
        continue;
      }
      if (!relationPairsVisited.has(id)) {
        relationPairsVisited.set(id, new Set());
      }
      if (!relationPairsVisited.has(relation)) {
        relationPairsVisited.set(relation, new Set());
      }

      if (
        relationPairsVisited.get(id).has(relation) ||
        relationPairsVisited.get(relation).has(id)
      ) {
        // we have already visited this relation pair
        // this means that we have a cycle in the graph
        // we can safely ignore this relation
        continue;
      }
      usableRelations.add(relation);
      totalScore += score;
    }

    if (totalScore === 0) {
      totalScore = 1;
    }

    for (const [type, score] of typeScoreMap.entries()) {
      probabilityMap.set(type, score / totalScore);
    }

    for (const [relation, score] of relationMap.entries()) {
      if (!usableRelations.has(relation)) {
        // we have already visited this relation pair
        // this means that we have a cycle in the graph
        // we can safely ignore this relation
        continue;
      }

      relationPairsVisited.get(id).add(relation);
      relationPairsVisited.get(relation).add(id);

      const probabilityOfRelation = score / totalScore;

      const probabilityMapOfRelation = this.calculateProbabilitiesForElement(
        incorporateExecutionScore,
        relation,
        relationPairsVisited
      );

      for (const [type, probability] of probabilityMapOfRelation.entries()) {
        let finalType = type;

        if (!type.includes("<>")) {
          // maybe should check for includes (or the inverse by checking for primitive types)
          // this will only add only the final relation id
          // the other method will add all relation id from the element to the final relation
          finalType = `${relation}<>${type}`;
        }

        if (finalType.includes("<>") && finalType.split("<>")[0] === id) {
          // skip this is a self loop
          continue;
        }

        if (!probabilityMap.has(finalType)) {
          probabilityMap.set(finalType, 0);
        }

        probabilityMap.set(
          finalType,
          probabilityMap.get(finalType) + probability * probabilityOfRelation
        );
      }
    }

    // incorporate execution scores
    const executionScoreMap = this._typeExecutionScoreMap.get(id);

    if (incorporateExecutionScore && executionScoreMap.size > 1) {
      let minValue = 0;
      for (const score of executionScoreMap.values()) {
        minValue = Math.min(minValue, score);
      }

      let totalScore = 0;
      for (const type of probabilityMap.keys()) {
        let score = executionScoreMap.get(type) ?? 0;
        score -= minValue;
        score += 1;
        totalScore += score;
      }

      if (totalScore < 0) {
        throw new Error("Total score should be positive");
      }

      if (totalScore === 0) {
        throw new Error("Total score should be positive");
      }

      if (Number.isNaN(totalScore)) {
        throw new TypeError("Total score should be positive");
      }

      // incorporate execution score
      for (const type of probabilityMap.keys()) {
        let score = executionScoreMap.has(type)
          ? executionScoreMap.get(type)
          : 0;
        score -= minValue;
        score += 1;

        const executionScoreDiscount = score / totalScore;
        const probability = probabilityMap.get(type);
        const newProbability = executionScoreDiscount * probability;

        probabilityMap.set(type, newProbability);
      }
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

    return probabilityMap;
  }
}
