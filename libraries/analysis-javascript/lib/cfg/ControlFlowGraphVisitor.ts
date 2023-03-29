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
import * as t from "@babel/types";
import { AbstractSyntaxTreeVisitor } from "@syntest/ast-visitor-javascript";
import {
  ControlFlowGraph,
  ControlFlowProgram,
  Edge,
  Node,
  NodeType,
} from "@syntest/cfg-core";

export class ControlFlowGraphVisitor extends AbstractSyntaxTreeVisitor {
  private _entry: Node<t.Node>;
  private _successExit: Node<t.Node>;
  private _errorExit: Node<t.Node>;
  private _nodes: Map<string, Node<t.Node>>;
  private _edges: Edge[];

  get cfg(): ControlFlowProgram<t.Node> {
    return {
      graph: new ControlFlowGraph(
        this._entry,
        this._successExit,
        this._errorExit,
        this._nodes,
        this._edges
      ),
      functions: [],
    };
  }

  constructor(filePath: string) {
    super(filePath);
    this._entry = new Node<t.Node>("ENTRY", NodeType.ENTRY, "ENTRY", [], {
      lineNumbers: [],
    });
    this._successExit = new Node<t.Node>(
      "SUCCESS_EXIT",
      NodeType.EXIT,
      "EXIT",
      [],
      { lineNumbers: [] }
    );
    this._errorExit = new Node<t.Node>(
      "ERROR_EXIT",
      NodeType.EXIT,
      "EXIT",
      [],
      { lineNumbers: [] }
    );
    this._nodes = new Map<string, Node<t.Node>>();
    this._edges = [];

    this._nodes.set(this._entry.id, this._entry);
    this._nodes.set(this._successExit.id, this._successExit);
    this._nodes.set(this._errorExit.id, this._errorExit);
  }
}
