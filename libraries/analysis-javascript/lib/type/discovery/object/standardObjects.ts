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
import {
  ArrayType,
  DiscoveredObjectKind,
  DiscoveredObjectType,
  FunctionType,
} from "./DiscoveredType";

export function createArray(
  id?: string,
  elements?: Map<number, string>
): ArrayType {
  return {
    id: id || "DEFAULT_ARRAY",
    kind: DiscoveredObjectKind.ARRAY,
    // name -> id
    properties: new Map([
      ["length", ""],
      ["at", ""],
      ["concat", ""],
      ["copyWithin", ""],
      ["entries", ""],
      ["fill", ""],
      ["filter", ""],
      ["find", ""],
      ["findIndex", ""],
      ["flat", ""],
      ["flatMap", ""],
      ["includes", ""],
      ["indexOf", ""],
      ["join", ""],
      ["keys", ""],
      ["lastIndexOf", ""],
      ["map", ""],
      ["pop", ""],
      ["push", ""],
      ["reduce", ""],
      ["reduceRight", ""],
      ["reverse", ""],
      ["shift", ""],
      ["slice", ""],
      ["toLocaleString", ""],
      ["toString", ""],
      ["unshift", ""],
      ["values", ""],
    ]),
    // index -> id
    elements: elements || new Map(),
  };
}

export function createString(
  id?: string,
  elements?: Map<number, string>
): ArrayType {
  return {
    id: id || "DEFAULT_STRING",
    kind: DiscoveredObjectKind.ARRAY,
    // name -> id
    properties: new Map([
      ["at", ""],
      ["charAt", ""],
      ["charCodeAt", ""],
      ["codePointAt", ""],
      ["concat", ""],
      ["includes", ""],
      ["endsWith", ""],
      ["indexOf", ""],
      ["lastIndexOf", ""],
      ["localeCompare", ""],
      ["match", ""],
      ["matchAll", ""],
      ["normalize", ""],
      ["padEnd", ""],
      ["padStart", ""],
      ["repeat", ""],
      ["replace", ""],
      ["replaceAll", ""],
      ["search", ""],
      ["slice", ""],
      ["split", ""],
      ["startsWith", ""],
      ["substring", ""],
      ["toLocaleLowerCase", ""],
      ["toLocaleUpperCase", ""],
      ["toLowerCase", ""],
      ["toString", ""],
      ["toUpperCase", ""],
      ["trim", ""],
      ["trimStart", ""],
      ["trimEnd", ""],
      ["valueOf", ""],
    ]),
    // index -> id
    elements: elements || new Map(),
  };
}

export function createFunction(
  id?: string,
  parameters?: Map<number, string>,
  returns?: Set<string>
): FunctionType {
  return {
    id: id || "DEFAULT_FUNCTION",
    kind: DiscoveredObjectKind.FUNCTION,
    // name -> id
    properties: new Map([
      ["arguments", ""],
      ["caller", ""],
      ["displayName", ""],
      ["length", ""],
      ["name", ""],
      ["apply", ""],
      ["bind", ""],
      ["call", ""],
      ["toString", ""],
    ]),
    // index -> id
    parameters: parameters || new Map(),
    // id
    return: returns || new Set(),
  };
}

export function createObject(id?: string): DiscoveredObjectType {
  return {
    id: id || "DEFAULT_OBJECT",
    kind: DiscoveredObjectKind.OBJECT,
    // name -> id
    properties: new Map([
      // TODO
    ]),
  };
}
