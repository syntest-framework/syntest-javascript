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

import { Scope } from "@syntest/ast-visitor-javascript";

export interface Element {
  id: string;
  scope: Scope;
  type: ElementType;
  value: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isInstanceOfElement(object: any): object is Element {
  return "scope" in object && "type" in object && "value" in object;
}

export enum ElementType {
  StringLiteral = "stringLiteral",
  NumericalLiteral = "numericalLiteral",
  NullLiteral = "nullLiteral",
  BooleanLiteral = "booleanLiteral",
  RegExpLiteral = "regExpLiteral",
  TemplateLiteral = "templateLiteral",
  BigIntLiteral = "bigIntLiteral",
  DecimalLiteral = "decimalLiteral",

  Undefined = "undefined",

  Identifier = "identifier",
}

export function getElementId(element: Element): string {
  if (!element.scope) {
    return `scope=null,type=${element.type},value=${element.value}`;
  }
  return `scope=(id=${element.scope.uid},filePath=${element.scope.filePath}),type=${element.type},value=${element.value}`;
}
