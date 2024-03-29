/*
 * Copyright 2020-2023 SynTest contributors
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
import { CrossoverOptions, CrossoverPlugin } from "@syntest/base-language";
import { JavaScriptTestCase, TreeCrossover } from "@syntest/search-javascript";

/**
 * Plugin for Tree Crossover
 */
export class TreeCrossoverPlugin extends CrossoverPlugin<JavaScriptTestCase> {
  constructor() {
    super("javascript-tree", "A JavaScript tree crossover plugin");
  }

  createCrossoverOperator(options: CrossoverOptions): TreeCrossover {
    return new TreeCrossover(
      options.crossoverEncodingProbability,
      options.crossoverStatementProbability
    );
  }

  override getOptions() {
    return new Map();
  }
}
