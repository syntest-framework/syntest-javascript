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

export interface ComplexType {
  id: string;
  // name -> id
  properties: Map<string, string>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isComplexType(object: any): object is ComplexType {
  return (
    object !== null &&
    typeof object === "object" &&
    "id" in object &&
    "properties" in object
  );
}
