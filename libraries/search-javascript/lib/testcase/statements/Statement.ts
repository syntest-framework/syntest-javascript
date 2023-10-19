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

import { TypeEnum } from "@syntest/analysis-javascript";
import { Encoding, EncodingSampler } from "@syntest/search";

import { ContextBuilder } from "../../testbuilding/ContextBuilder";

/**
 * The abstract statement class
 */
export abstract class Statement {
  private _variableIdentifier: string;
  private _typeIdentifier: string;
  private _name: string;
  protected _uniqueId: string;

  public get variableIdentifier(): string {
    return this._variableIdentifier;
  }

  public get typeIdentifier(): string {
    return this._typeIdentifier;
  }

  public get name(): string {
    return this._name;
  }

  public get uniqueId(): string {
    return this._uniqueId;
  }

  /**
   * Constructor
   * @param variableIdentifier the identifier that points to the variable this statement represents
   * @param typeIdentifier the identifier used to choose the type of this statement
   * @param name
   * @param uniqueId the unique id of the statement
   */
  protected constructor(
    variableIdentifier: string,
    typeIdentifier: string,
    name: string,
    uniqueId: string
  ) {
    this._variableIdentifier = variableIdentifier;
    this._typeIdentifier = typeIdentifier;
    this._name = name;
    this._uniqueId = uniqueId;

    if (!name) {
      console.log(name)
      throw new Error("Name must be given!")
    }
  }

  /**
   * Mutates the gene
   * @param sampler   the sampler object that is being used
   * @param depth     the depth of the gene in the gene tree
   * @return          the mutated copy of the gene
   */
  abstract mutate(sampler: EncodingSampler<Encoding>, depth: number): Statement;

  /**
   * Creates an exact copy of the current gene
   * @return  the copy of the gene
   */
  abstract copy(): Statement;

  /**
   * Checks whether the gene has children
   * @return  whether the gene has children
   */
  abstract hasChildren(): boolean;

  /**
   * Gets all children of the gene
   * @return  The set of children of this gene
   */
  abstract getChildren(): Statement[];

  /**
   * Set a new child at a specified position
   *
   * WARNING: This function has side effects
   *
   * @param index the index position of the new child
   * @param newChild the new child
   */
  abstract setChild(index: number, newChild: Statement): void;

  /**
   * Decodes the statement
   * Note: when implementing this function please always decode the children of the statement before making getOrCreateVariableName on the context object.
   */
  abstract decode(context: ContextBuilder): Decoding[];

  /**
   * returns the return type of statement
   */
  abstract get returnType(): string;

  /**
   * returns the type of statement
   */
  abstract get type(): TypeEnum;
}

export interface Decoding {
  variableName: string;
  decoded: string;
  reference: Statement;
}
