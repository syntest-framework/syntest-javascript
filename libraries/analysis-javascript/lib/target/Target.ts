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
import {   SubTarget as CoreSubTarget,
  Target as CoreTarget, TargetType } from "@syntest/analysis";

import { VisibilityType } from "./VisibilityType";

export class TargetGraph implements CoreTarget {
  path: string;
  name: string;
  subTargets: Target[]; // deprecated
  targetMap: Map<string, Target>;
  childTargetMap: Map<string, string[]>
  parentTargetMap: Map<string, string>

  constructor() {
    this.targetMap = new Map()
    this.childTargetMap = new Map()
    this.parentTargetMap = new Map()
  }

  // TODO check for cycles

  hasTarget(targetId: string) {
    return this.targetMap.has(targetId)
  }

  addTarget(target: Target, parent?: Target) {
    if (this.targetMap.has(target.id)) {
      throw new Error('Each target can only exists once!')
    }
    this.targetMap.set(target.id, target)
    this.childTargetMap.set(target.id, [])
    if (parent) {
      if (!this.targetMap.has(parent.id)) {
        throw new Error('parent does not exist! Targets should be added in order')
      }
      this.parentTargetMap.set(target.id, parent.id)
      this.childTargetMap.get(parent.id).push(target.id)
    }
  }

  getParentId(target: Target | string): undefined | string {
    return typeof target === 'string' ? this.parentTargetMap.get(target) : this.parentTargetMap.get(target.id)
  }

  getChildrenIds(target: Target | string): undefined | string[] {
    return typeof target === 'string' ? this.childTargetMap.get(target) : this.childTargetMap.get(target.id)
  }

  getParent(target: Target | string): undefined | Target {
    const parentId = typeof target === 'string' ? this.parentTargetMap.get(target) : this.parentTargetMap.get(target.id)
    return parentId ? this.targetMap.get(parentId) : undefined
  }

  getChildren(target: Target | string): undefined | Target[] {
    const childrenIds = typeof target === 'string' ? this.childTargetMap.get(target) : this.childTargetMap.get(target.id)
    return childrenIds ? childrenIds.map((id) => this.targetMap.get(id)) : undefined
  }
};

export type Target = RootTarget | CoverageTarget
export type RootTarget = ClassTarget | ObjectTarget | FunctionTarget
export type CoverageTarget = LineTarget | BranchTarget | PathTarget

export type BaseTarget = CoreSubTarget & {
  id: string;
  typeId: string;
  exportId: string;
};

export type ClassTarget = BaseTarget & {
  type: TargetType.CLASS;
};

export type ObjectTarget = BaseTarget & {
  type: TargetType.OBJECT;
};

export type FunctionTarget = BaseTarget & {
  type: TargetType.FUNCTION;
  isAsync: boolean;
  isStatic: boolean;
  visibility: VisibilityType;
  methodType: "constructor" | "method" | "get" | "set";
};

export type LineTarget = {
  id: string
  type: TargetType.LINE
}

export type BranchTarget = {
  id: string
  type: TargetType.BRANCH
  
}

export type PathTarget = {
  id: string
  type: TargetType.PATH
}