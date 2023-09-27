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

import { MetricManager } from "@syntest/metric";
import { Module, ModuleManager } from "@syntest/module";
import { StorageManager } from "@syntest/storage";

import package_ from "../package.json" assert { type: "json" };

import { StateStorageEventListenerPlugin } from "./StateStorageEventListenerPlugin.js";

export default class StateStorageModule extends Module {
  constructor() {
    super(package_.name, package_.version);
  }

  register(
    moduleManager: ModuleManager,
    _metricManager: MetricManager,
    storageManager: StorageManager
  ): void {
    moduleManager.registerPlugin(
      this,
      new StateStorageEventListenerPlugin(storageManager)
    );
  }
}
