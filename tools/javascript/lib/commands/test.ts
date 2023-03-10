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
import { Command } from "@syntest/module";
import Yargs = require("yargs");
import { JavaScriptLauncher } from "../JavaScriptLauncher";
import { UserInterface } from "@syntest/cli-graphics";

export function getTestCommand(
  tool: string,
  userInterface: UserInterface
): Command {
  const options = new Map<string, Yargs.Options>();

  options.set("incorporate-execution-information", {
    alias: [],
    default: true,
    description: "Incorporate execution information.",
    group: "Type Inference Options:",
    hidden: false,
    type: "boolean",
  });

  options.set("static-type-resolver", {
    alias: [],
    choices: [],
    default: "",
    description: "The type inference mode.",
    group: "Type Inference Options:",
    hidden: false,
    type: "string",
  });

  options.set("dynamic-type-resolver", {
    alias: [],
    choices: [],
    default: "",
    description: "The type inference mode.",
    group: "Type Inference Options:",
    hidden: false,
    type: "string",
  });

  options.set("type-selector", {
    alias: [],
    choices: [],
    default: "",
    description: "The type selector mode.",
    group: "Type Inference Options:",
    hidden: false,
    type: "string",
  });

  options.set("random-type-probability", {
    alias: [],
    default: 0.1,
    description:
      "The probability we use a random type regardless of the inferred type.",
    group: "Type Inference Options:",
    hidden: false,
    type: "number",
  });

  return new Command(
    tool,
    "test",
    "Run the test case generation tool on a certain JavaScript project.",
    options,
    async (args: Yargs.ArgumentsCamelCase) => {
      const launcher = new JavaScriptLauncher(userInterface);
      launcher.run();
    }
  );
}

export type TestCommandOptions = {
  staticTypeResolver: string;
  dynamicTypeResolver: string;
  typeSelector: string;
  randomTypeProbability: number;
};
