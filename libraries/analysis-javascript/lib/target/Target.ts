/*
 * Copyright 2020-2021 Delft University of Technology and SynTest contributors
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
import {
  SubTarget as CoreSubTarget,
  Target as CoreTarget,
  TargetType,
} from "@syntest/analysis";
import { Scope } from "@syntest/ast-visitor-javascript";

import { VisibilityType } from "./VisibilityType";

export interface Target extends CoreTarget {
  path: string;
  name: string;
  subTargets: SubTarget[];
}

export interface SubTarget extends CoreSubTarget {
  type: TargetType;
  id: string;
}

export type Exportable = {
  exported: boolean;
  // maybe scope?
  renamedTo?: string;
  module?: boolean;
  default?: boolean;
};

export interface Callable {
  scope: Scope;
  parameters: string[];
  return: string;
}

export interface FunctionTarget extends SubTarget, Exportable, Callable {
  type: TargetType.FUNCTION;
  name: string;
}

export interface ClassTarget extends SubTarget, Exportable {
  type: TargetType.CLASS;
  name: string;
}

export interface MethodTarget extends SubTarget, Callable {
  type: TargetType.METHOD;
  className: string;
  name: string;

  visibility: VisibilityType;

  isConstructor: boolean;
  isStatic: boolean;
  isAsync: boolean;
}

export interface ObjectTarget extends SubTarget, Exportable {
  type: TargetType.OBJECT;
  name: string;
}

export interface ObjectFunctionTarget extends SubTarget, Callable {
  type: TargetType.OBJECT_FUNCTION;
  objectName: string;
  name: string;
}

export interface PathTarget extends SubTarget {
  type: TargetType.PATH;
  ids: string[];
}

export interface BranchTarget extends SubTarget {
  type: TargetType.BRANCH;
}

export interface LineTarget extends SubTarget {
  type: TargetType.LINE;
  line: number;
}
