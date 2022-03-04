/*
 * Copyright 2020-2022 Delft University of Technology and SynTest contributors
 *
 * This file is part of SynTest JavaScript.
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
import { TypeResolver } from "./TypeResolver";
import { Element } from "../discovery/Element";
import { Scope, ScopeType } from "../discovery/Scope";
import { Relation } from "../discovery/Relation";
import { TypeProbabilityMap } from "./TypeProbabilityMap";

export class TypeResolverUnknown extends TypeResolver{

  getTyping(scopeName: string, scopeType: ScopeType, variableName: string): TypeProbabilityMap {
    return new TypeProbabilityMap()
  }

  resolveTypes(scopes: Scope[], elements: Element[], relations: Relation[], wrapperElementIsRelation: Map<string, Relation>) {
  }
}
