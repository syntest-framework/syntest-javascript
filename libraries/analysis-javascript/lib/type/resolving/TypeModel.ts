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

import { prng } from "@syntest/search";
import { TypeEnum } from "./TypeEnum";
import { DiscoveredObjectType } from "../discovery/object/DiscoveredType";

export class TypeModel {
  private _elements: Set<string>;
  // element1 -> element2 -> score
  private _relationScoreMap: Map<string, Map<string, number>>;
  // element -> type enum / type id -> score
  private _elementTypeScoreMap: Map<string, Map<string, number>>;
  // element -> type enum / type id -> score
  private _typeExecutionScoreMap: Map<string, Map<string, number>>;

  // element -> type enum / type id -> probability
  private _elementTypeProbabilityMap: Map<string, Map<string, number>>;

  // element -> scoreHasChanged
  private _scoreHasChangedMap: Map<string, boolean>;

  private _discoveredTypes: Map<string, DiscoveredObjectType>;

  constructor(discoveredTypes: Map<string, DiscoveredObjectType>) {
    this._discoveredTypes = discoveredTypes;
    this._elements = new Set();

    this._relationScoreMap = new Map();
    this._elementTypeScoreMap = new Map();
    this._typeExecutionScoreMap = new Map();

    this._elementTypeProbabilityMap = new Map();

    this._scoreHasChangedMap = new Map();
  }

  getDiscoveredObjectType(id: string): DiscoveredObjectType {
    if (!this._discoveredTypes.has(id)) {
      throw new Error(`Can't find discovered type for id: ${id}`);
    }
    return this._discoveredTypes.get(id);
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

    this.addTypeScore(id, TypeEnum.NUMERIC, 0.1);
    this.addTypeScore(id, TypeEnum.STRING, 0.1);
    this.addTypeScore(id, TypeEnum.BOOLEAN, 0.1);
    this.addTypeScore(id, TypeEnum.NULL, 0.1);
    this.addTypeScore(id, TypeEnum.UNDEFINED, 0.1);
    this.addTypeScore(id, TypeEnum.REGEX, 0.1);
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

  addTypeScore(id: string, type: TypeEnum | string, score = 1) {
    if (!this._elementTypeScoreMap.has(id)) {
      throw new Error(`Element ${id} does not exist`);
    }
    if (!this._elementTypeScoreMap.get(id).has(type)) {
      this._elementTypeScoreMap.get(id).set(type, 0);
    }

    const currentScore = this._elementTypeScoreMap.get(id).get(type);

    this._elementTypeScoreMap.get(id).set(type, currentScore + score);

    this._scoreHasChangedMap.set(id, true);
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

  private _sum(iterable: Iterable<number>) {
    return [...iterable].reduce((total, currentValue) => total + currentValue);
  }

  /**
   *
   * @param incorporateExecutionScore wether the execution score should be weighted in
   * @param id the id we want to get a random type for
   * @param matchType (optional) the type enum you want to get (there can be multiple object/function/array types)
   * @returns
   */
  getRandomType(
    incorporateExecutionScore: boolean,
    id: string,
    matchType?: TypeEnum
  ): TypeEnum | string {
    const probabilities = this.calculateProbabilitiesForElement(
      incorporateExecutionScore,
      id
    );

    console.log(id);
    console.log(probabilities);

    // const probabilities = this._elementTypeProbabilityMap.get(element);
    let matchingTypes = [...probabilities.entries()];
    let totalProbability = 1;

    if (matchType) {
      matchingTypes = matchingTypes.filter(([type]) =>
        type.endsWith(matchType)
      );
      totalProbability = this._sum(
        matchingTypes.map(([, probability]) => probability)
      );
    }

    const choice = prng.nextDouble(0, totalProbability);
    let index = 0;

    let chosenType: string;
    let probability: number;
    for ([chosenType, probability] of matchingTypes) {
      if (choice <= index + probability) {
        if (chosenType.includes("<>")) {
          const [, type] = chosenType.split("<>");
          return type;
        }

        return chosenType;
      }

      index += probability;
    }

    if (chosenType.includes("<>")) {
      const [, type] = chosenType.split("<>");
      return type;
    }
    return chosenType;
  }

  getHighestProbabilityType(
    incorporateExecutionScore: boolean,
    element: string
  ): TypeEnum | string {
    this.calculateProbabilitiesForElement(incorporateExecutionScore, element);

    // TODO
    const probabilities = this._elementTypeProbabilityMap.get(element);

    let best: string = probabilities.keys().next().value;

    for (const [type, probability] of probabilities.entries()) {
      if (probability > probabilities.get(best)) {
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

    const typeScoreMap = this._elementTypeScoreMap.get(id);
    const relationMap = this._relationScoreMap.get(id);

    if (!relationPairsVisited) {
      relationPairsVisited = new Map();
      // this._scoreHasChangedMap.set(element, false);
      // this._elementTypeProbabilityMap.set(element, probabilityMap);
    }

    let totalScore = this._sum(typeScoreMap.values());

    const usableRelations = new Set<string>();

    for (const [relation, score] of relationMap.entries()) {
      if (!relationPairsVisited.has(id)) {
        relationPairsVisited.set(id, new Set());
      }

      if (relationPairsVisited.get(id).has(relation)) {
        // we have already visited this relation pair
        // this means that we have a cycle in the graph
        // we can safely ignore this relation
        continue;
      }
      usableRelations.add(relation);
      totalScore += score;
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

      const probabilityOfRelation = score / totalScore;

      const probabilityMapOfRelation = this.calculateProbabilitiesForElement(
        incorporateExecutionScore,
        relation,
        relationPairsVisited
      );

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
    const totalProbability = this._sum(probabilityMap.values());

    if (Math.abs(totalProbability - 1) > 0.0001) {
      throw new Error(
        `Total probability should be 1, but is ${totalProbability}`
      );
    }

    // incorporate execution scores
    const executionScoreMap = this._typeExecutionScoreMap.get(id);

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

    return probabilityMap;
  }
}
