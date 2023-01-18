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


import { Visitor } from "../Visitor";
import {
  BranchNode,
  CFG,
  Node,
  NodeType,
  Operation,
  PlaceholderNode,
  RootNode,
} from "../../../../../syntest-framework";

type ParentWithChildren = {
  parents: Node[]
  // children: Node[]
}

export class ControlFlowGraphVisitor extends Visitor {

  private _cfg: CFG;

  // private _nodeStack: Node[][]
  //
  // private _level = -1

  private _nodeStack: ParentWithChildren[]

  constructor(filePath: string) {
    super(filePath)
    this._cfg = new CFG();

    this._nodeStack = []
  }

  enter = (path) => {}
  exit = (path) => {

    // everything with a body should connect to its children in a linear way
    if (path.has('body')) {
      let {parent, children} = this._nodeStack.pop()

      console.log(path.type, path.has('body'))
      console.log(parent)
      console.log(children)

      // connect to children
      for (const child of children) {
        this._connectParents([parent], [child])
        parent = child
      }
    }
  }


  IfStatement = {
    enter: (path) => {
      const node = this._getNode(path)

      // create new parent stack for this node
      this._nodeStack.push({
        parents: [node]
      })
    },
    exit: (path) => {
      let {parent, children} = this._nodeStack.pop()

      if (children.length < 2) {
        if (!path.has('alternate')) {
          // false node missing
          const falseNode: Node = this._createPlaceholderNode(
            [path.node.loc.end.line],
            []
          );
    
          children.push(falseNode)
        }
      }
      // connect to children
      this._connectParents([parent], children)
    }
  }


  BlockStatement = {
    enter: (path) => {
      const node = this._getNode(path)
        
      // create new parent stack for this node
      this._nodeStack.push({
        parents: [node]
      })
    },
    exit: (path) => {
      // let {parent, children} = this._nodeStack.pop()

      // // connect to children
      // for (const child of children) {
      //   this._connectParents([parent], [child])
      //   parent = child
      // }
      
    }
  }

  _getNode (path): Node {
    if (['IfStatement', 'WhileStatement', 'ForStatement'].includes(path.node.type)) {
      return this._createBranchNode(
        [path.node.loc.start.line],
        [],
        {
          type: path.node.test.type,
          operator: path.get('test').getSource(),
        }
      );
    } else if (path.node.type === 'SwitchStatement') {
      return this._createBranchNode(
        [path.node.loc.start.line],
        [],
        {
          type: 'Switch',
          operator: '==',
        }
      );
    }

    // TODO

    return this._createNode(
      [path.node.loc.start.line],
      []
    );
  }

  _createRootNode(
    lines: number[],
    statements: string[],
    description?: string
  ): RootNode {
    const node: RootNode = {
      id: `f-${lines[0]}`,
      lines: lines,
      statements: statements,
      type: NodeType.Root,
      description: description
    };

    this._cfg.nodes.push(node);

    return node;
  }

  /**
   * This method creates a new node in the cfg
   * @param lines
   * @param statements
   * @param branch whether this nodes is a branching node (i.e. multiple outgoing edges)
   * @param probe
   * @param condition if it is a branch node this is the condition to branch on
   * @param placeholder
   * @private
   */
  _createNode(lines: number[], statements: string[]): Node {
    const node: Node = {
      type: NodeType.Intermediary,
      id: `s-${lines[0]}`,
      lines: lines,
      statements: statements,
    };

    this._cfg.nodes.push(node);

    return node;
  }


  _createPlaceholderNode(
    lines: number[],
    statements: string[]
  ): PlaceholderNode {
    const node: PlaceholderNode = {
      type: NodeType.Placeholder,
      id: `s-${lines[0]}`,
      lines: lines,
      statements: statements,
    };

    this._cfg.nodes.push(node);

    return node;
  }

  _createBranchNode(
    lines: number[],
    statements: string[],
    condition: Operation
  ): BranchNode {
    const node: BranchNode = {
      condition: condition,
      id: `b-${lines[0]}`,
      lines: lines,
      statements: statements,
      type: NodeType.Branch,
      probe: false,
    };

    this._cfg.nodes.push(node);

    return node;
  }

  _connectParents(parents: Node[], children: Node[]) {
    if (children === undefined) {
      return
    }
    for (const parent of parents) {
      for (const child of children) {
        this._cfg.edges.push({
          from: parent.id,
          to: child.id,
        });
      }
    }
  }

  get cfg(): CFG {
    return this._cfg;
  }
}


