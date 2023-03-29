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

import * as t from "@babel/types";
import {
  ActionDescription,
  ActionType,
  IdentifierDescription,
  JavaScriptTargetMetaData,
} from "@syntest/analysis-javascript";
import { ControlFlowGraph, NodeType } from "@syntest/cfg-core";
import {
  FunctionObjectiveFunction,
  ObjectiveFunction,
  SearchSubject,
} from "@syntest/core";

import { JavaScriptBranchObjectiveFunction } from "../criterion/JavaScriptBranchObjectiveFunction";
import { JavaScriptTestCase } from "../testcase/JavaScriptTestCase";

export enum SubjectType {
  class,
  function,
  object,
}

export interface TypeScore {
  types: string[];
  failed: boolean;
}

export class JavaScriptSubject extends SearchSubject<JavaScriptTestCase> {
  private _functions: ActionDescription[];
  private _type: SubjectType;

  private _typeScores: Map<string, TypeScore[]>;

  reevaluateTypes() {
    // TODO find correlations
    // maybe look at bayesian inference
  }

  get functions(): ActionDescription[] {
    return this._functions;
  }

  constructor(
    path: string,
    targetMeta: JavaScriptTargetMetaData,
    cfg: ControlFlowGraph<t.Node>,
    functions: ActionDescription[]
  ) {
    super(path, targetMeta.name, cfg);

    // TODO SearchSubject should just use the targetMetaData
    this._type = targetMeta.type;
    this._functions = functions;
    this._typeScores = new Map();
  }

  protected _extractObjectives(): void {
    // Branch objectives
    // Find all branch nodes
    const branches = this._cfg.nodes.filter(
      (node) => node.type === NodeType.Branch
    );

    for (const branchNode of branches) {
      for (const edge of this._cfg.edges

        // Find all edges from the branch node
        .filter((edge) => edge.from === branchNode.id)) {
        for (const childNode of this._cfg.nodes

          // Find nodes with incoming edge from branch node
          .filter((node) => node.id === edge.to)) {
          // Add objective function
          this._objectives.set(
            new JavaScriptBranchObjectiveFunction(
              this,
              childNode.id,
              branchNode.lines[0],
              edge.branchType
            ),
            []
          );
        }
      }
    }

    for (const objective of this._objectives.keys()) {
      const childrenObject = this.findChildren(objective);
      this._objectives.get(objective).push(...childrenObject);
    }

    // FUNCTION objectives
    for (const node of this._cfg.nodes

      // Find all root function nodes
      .filter((node) => node.type === NodeType.Root)) {
      // Add objective
      const functionObjective = new FunctionObjectiveFunction(
        this,
        node.id,
        node.lines[0]
      );
      const childrenObject = this.findChildren(functionObjective);
      this._objectives.set(functionObjective, childrenObject);
    }
  }

  findChildren(
    object: ObjectiveFunction<JavaScriptTestCase>
  ): ObjectiveFunction<JavaScriptTestCase>[] {
    let childrenObject = [];

    let edges2Visit = this._cfg.edges.filter(
      (edge) => edge.from === object.getIdentifier()
    );
    const visitedEdges = [];

    while (edges2Visit.length > 0) {
      const edge = edges2Visit.pop();

      if (visitedEdges.includes(edge))
        // this condition is made to avoid infinite loops
        continue;

      visitedEdges.push(edge);

      const found = this.getObjectives().filter(
        (child) => child.getIdentifier() === edge.to
      );
      if (found.length === 0) {
        const additionalEdges = this._cfg.edges.filter(
          (nextEdge) => nextEdge.from === edge.to
        );
        edges2Visit = [...edges2Visit, ...additionalEdges];
      } else {
        childrenObject = [...childrenObject, ...found];
      }
    }

    return childrenObject;
  }

  getPossibleActions(
    type?: ActionType,
    returnType?: IdentifierDescription
  ): ActionDescription[] {
    return this.functions.filter((f) => {
      if (
        returnType && // TODO this will not work (comparing typeprobability maps)
        returnType.typeProbabilityMap !== f.returnParameter.typeProbabilityMap
      ) {
        return false;
      }

      return (
        (type === undefined || f.type === type) &&
        f.visibility === ActionVisibility.PUBLIC &&
        f.name !== "" // fallback function has no name
      );
    });
  }

  get type(): SubjectType {
    return this._type;
  }
}
