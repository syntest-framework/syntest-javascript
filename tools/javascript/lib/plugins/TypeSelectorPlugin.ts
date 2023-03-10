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

import { Encoding } from "@syntest/core";
import { Plugin } from "@syntest/module";
import { PluginType } from "./PluginType";
import { TypeSelector } from "@syntest/core-javascript";

export type TypeSelectorOptions<T extends Encoding> = unknown;

export abstract class TypeSelectorPlugin<T extends Encoding> extends Plugin {
  constructor(name: string, describe: string) {
    super(PluginType.TypeSelector, name, describe);
  }

  abstract createTypeSelector<O extends TypeSelectorOptions<T>>(
    options: O
  ): TypeSelector;

  getCommandOptionChoices(
    tool: string,
    labels: string[],
    command: string,
    option: string
  ): string[] {
    if (option === "type-selector") {
      return [this.name];
    }

    return [];
  }
}
