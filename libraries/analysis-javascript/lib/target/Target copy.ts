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
import { TargetType } from "@syntest/analysis";

import { VisibilityType } from "./VisibilityType";

export type Target = {
  path: string;
  name: string;
  subTargets: SubTarget[];
};

export type SubTarget = ClassSubTarget;

export type BaseSubTarget = {
  id: string;
  typeId: string;
  name: string;
};

export type ClassSubTarget = BaseSubTarget & {
  type: TargetType.CLASS;
  exportId: string;
  subTargets: MethodTarget[];
};

export type ObjectSubTarget = SubTarget & {
  type: TargetType.OBJECT;
  exportId: string;
  subTargets: ObjectFunctionTarget[];
};

export type FunctionSubTarget = BaseSubTarget & {
  type: TargetType.FUNCTION;
  exportId: string;
  isAsync: boolean;
  subTargets: SubTarget[];
};

export type MethodTarget = BaseSubTarget & {
  type: TargetType.METHOD;
  isAsync: boolean;
  isStatic: boolean;
  visibility: VisibilityType;
  methodType: "constructor" | "method" | "get" | "set";
  subTargets: SubTarget[];
};

export type ObjectFunctionTarget = BaseSubTarget & {
  type: TargetType.OBJECT_FUNCTION;
  isAsync: boolean;
  subTargets: SubTarget[];
};
