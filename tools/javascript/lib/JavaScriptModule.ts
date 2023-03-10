/*
 * Copyright 2020-2023 Delft University of Technology and SynTest contributors
 *
 * This file is part of SynTest Framework - SynTest Core.
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

import { Module, Plugin, Tool } from "@syntest/module";
import yargs = require("yargs");
import { getTestCommand } from "./commands/test";
import { ProportionalTypeSelectorPlugin } from "./plugins/type-selectors/ProportionalTypeSelectorPlugin";
import { RankedTypeSelector } from "@syntest/core-javascript";
import { RankedTypeSelectorPlugin } from "./plugins/type-selectors/RankedTypeSelectorPlugin";
import { ProbabilisticTypeResolverPlugin } from "./plugins/static-type-resolvers/ProbabilisticTypeResolverPlugin";
import { RandomTypeResolverPlugin } from "./plugins/static-type-resolvers/RandomTypeResolverPlugin";
import { JavaScriptTreeCrossoverPlugin } from "./plugins/crossover/JavaScriptTreeCrossoverPlugin";
import { SimpleDynamicTypeResolverPlugin } from "./plugins/dynamic-type-resolvers/SimpleDynamicTypeResolverPlugin";

export default class JavaScriptModule extends Module {
  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    super("javascript", require("../package.json").version);
  }

  async getTools(): Promise<Tool[]> {
    const labels = ["javascript", "testing"];
    const commands = [getTestCommand(this.name, this.userInterface)];

    const additionalOptions: Map<string, yargs.Options> = new Map();

    const javascriptTool = new Tool(
      this.name,
      labels,
      "A tool for testing javascript projects.",
      commands,
      additionalOptions
    );

    return [javascriptTool];
  }
  async getPlugins(): Promise<Plugin[]> {
    return [
      // crossover
      new JavaScriptTreeCrossoverPlugin(),

      // dynamic type resolvers
      new SimpleDynamicTypeResolverPlugin(),

      // static type resolvers
      new ProbabilisticTypeResolverPlugin(),
      new RandomTypeResolverPlugin(),

      // type selectors
      new ProportionalTypeSelectorPlugin(),
      new RankedTypeSelectorPlugin(),
    ];
  }
}
