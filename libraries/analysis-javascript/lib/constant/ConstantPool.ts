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

export class ConstantPool {
  protected _numericPool: Map<number, number>;
  protected _integerPool: Map<number, number>;
  protected _bigIntPool: Map<bigint, number>;
  protected _stringPool: Map<string, number>;

  constructor() {
    this._numericPool = new Map();
    this._integerPool = new Map();
    this._stringPool = new Map();
  }

  public addNumeric(value: number): void {
    if (this._numericPool.has(value)) {
      this._numericPool.set(value, this._numericPool.get(value) + 1);
    } else {
      this._numericPool.set(value, 1);
    }
  }

  public addInteger(value: number): void {
    if (this._integerPool.has(value)) {
      this._integerPool.set(value, this._integerPool.get(value) + 1);
    } else {
      this._integerPool.set(value, 1);
    }
  }

  public addBigInt(value: bigint): void {
    if (this._bigIntPool.has(value)) {
      this._bigIntPool.set(value, this._bigIntPool.get(value) + 1);
    } else {
      this._bigIntPool.set(value, 1);
    }
  }

  public addString(value: string): void {
    if (this._stringPool.has(value)) {
      this._stringPool.set(value, this._stringPool.get(value) + 1);
    } else {
      this._stringPool.set(value, 1);
    }
  }

  public getRandomNumeric(): number {
    const index = Math.floor(Math.random() * this._numericPool.size);
    return [...this._numericPool.keys()][index];
  }
}
