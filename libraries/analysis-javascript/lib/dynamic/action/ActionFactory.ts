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

import { ChildProcess, fork } from "node:child_process";
import * as path from "node:path";

import { getLogger, Logger } from "@syntest/logging";

import { Action } from "./Action";
import { ExecuteMessage, ResultMessage } from "./Executor";

export class ActionFactory {
    protected static LOGGER: Logger;

    private executionTimeout: number
    private _process: ChildProcess;

    constructor(executionTimeout: number) {
        ActionFactory.LOGGER = getLogger(ActionFactory.name);

        this.executionTimeout = executionTimeout
        // eslint-disable-next-line unicorn/prefer-module
        this._process = fork(path.join(__dirname, "Executor.js"));
        console.log('created')
    }

    exit() {
        if (this._process) {
            this._process.kill()
        }
    }

    async extract(filePath: string, source: string) {
        // try catch maybe?
        return await this._extract(filePath, source)
    }

    private async _extract(filePath: string, source: string): Promise<Action[]> {
        if (!this._process.connected || this._process.killed) {
            // eslint-disable-next-line unicorn/prefer-module
            this._process = fork(path.join(__dirname, "Executor.js"));
          }
          const childProcess = this._process;

          return await new Promise<Action[]>((resolve, reject) => {
            const timeout = setTimeout(() => {
                ActionFactory.LOGGER.warn(
                `Execution timeout reached killing process, timeout: ${this.executionTimeout}`
              );
              childProcess.removeAllListeners();
              childProcess.kill();
              reject("timeout");
            }, this.executionTimeout);
      
            childProcess.on("message", (message: ResultMessage) => {
              if (typeof message !== "object") {
                return reject(
                  new TypeError("Invalid data received from child process")
                );
              }
      
              if (message.message === "result") {
                childProcess.removeAllListeners();
                clearTimeout(timeout);
                return resolve(message.actions);
              }
            });
      
            childProcess.on("error", (error) => {
              reject(error);
            });
      
            const executeMessage: ExecuteMessage = {
                message: 'execute',
                filePath: filePath,
                source: source
            }

            childProcess.send(executeMessage);
          });
    }
}