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

import { defaults } from "@istanbuljs/schema";
import { VisitState } from "./VisitState";
import { createHash } from "crypto";
import { NodePath, template } from "@babel/core";
import * as t from "@babel/types";
import { Scope } from "@babel/traverse";

const name = "syntest";

// increment this version if there are schema changes
// that are not backwards compatible:
const VERSION = "4";

const SHA = "sha1";
const MAGIC_KEY = "_coverageSchema";
const MAGIC_VALUE = createHash(SHA)
  .update(name + "@" + VERSION)
  .digest("hex");

// pattern for istanbul to ignore the whole file
const COMMENT_FILE_RE = /^\s*istanbul\s+ignore\s+(file)(?=\W|$)/;

export class Visitor {
  private types: any;
  private sourceFilePath: string;
  private opts: any;
  private visitState: VisitState;

  constructor(types, sourceFilePath = "unknown.js", opts: VisitorOptions = {}) {
    this.types = types;
    this.sourceFilePath = sourceFilePath;
    this.opts = {
      ...defaults.instrumentVisitor,
      ...opts,
    };
    this.visitState = new VisitState(
      types,
      sourceFilePath,
      opts.inputSourceMap,
      opts.ignoreClassMethods,
      opts.reportLogic
    );
  }

  enter(path) {
    if (shouldIgnoreFile(path.find((p) => p.isProgram()))) {
      return;
    }
    if (alreadyInstrumented(path, this.visitState)) {
      return;
    }
    path.traverse(codeVisitor, this.visitState);
  }

  exit(path) {
    if (alreadyInstrumented(path, this.visitState)) {
      return undefined;
    }
    this.visitState.cov.freeze();
    const coverageData = this.visitState.cov.toJSON();
    if (shouldIgnoreFile(path.find((p) => p.isProgram()))) {
      return {
        fileCoverage: coverageData,
        sourceMappingURL: this.visitState.sourceMappingURL,
      };
    }
    coverageData[MAGIC_KEY] = MAGIC_VALUE;
    const hash = createHash(SHA)
      .update(JSON.stringify(coverageData))
      .digest("hex");
    coverageData.hash = hash;
    const coverageNode = this.types.valueToNode(coverageData);
    delete coverageData[MAGIC_KEY];
    delete coverageData.hash;
    let gvTemplate;
    if (this.opts.coverageGlobalScopeFunc) {
      if (path.scope.getBinding("Function")) {
        gvTemplate = globalTemplateAlteredFunction({
          GLOBAL_COVERAGE_SCOPE: this.types.stringLiteral(
            "return " + this.opts.coverageGlobalScope
          ),
        });
      } else {
        gvTemplate = globalTemplateFunction({
          GLOBAL_COVERAGE_SCOPE: this.types.stringLiteral(
            "return " + this.opts.coverageGlobalScope
          ),
        });
      }
    } else {
      gvTemplate = globalTemplateVariable({
        GLOBAL_COVERAGE_SCOPE: this.opts.coverageGlobalScope,
      });
    }
    const cv = coverageTemplate({
      GLOBAL_COVERAGE_VAR: this.types.stringLiteral(this.opts.coverageVariable),
      GLOBAL_COVERAGE_TEMPLATE: gvTemplate,
      COVERAGE_FUNCTION: this.types.identifier(this.visitState.varName),
      PATH: this.types.stringLiteral(this.sourceFilePath),
      INITIAL: coverageNode,
      HASH: this.types.stringLiteral(hash),
    });

    const meta = metaTemplate({
      GLOBAL_META_VAR: '"__meta__"',
      META_FUNCTION: this.types.identifier(this.visitState.metaVarName),
      PATH: this.types.stringLiteral(this.sourceFilePath),
      HASH: this.types.stringLiteral(hash),
    });

    // explicitly call this.varName to ensure coverage is always initialized
    path.node.body.unshift(
      this.types.expressionStatement(
        this.types.callExpression(
          this.types.identifier(this.visitState.varName),
          []
        )
      )
    );
    path.node.body.unshift(cv);
    path.node.body.unshift(meta);
    return {
      fileCoverage: coverageData,
      sourceMappingURL: this.visitState.sourceMappingURL,
    };
  }
}

// generic function that takes a set of visitor methods and
// returns a visitor object with `enter` and `exit` properties,
// such that:
//
// * standard entry processing is done
// * the supplied visitors are called only when ignore is not in effect
//   This relieves them from worrying about ignore states and generated nodes.
// * standard exit processing is done
//
function entries(...enter) {
  // the enter function
  const wrappedEntry = function (path, node) {
    this.onEnter(path);
    if (this.shouldIgnore(path)) {
      return;
    }
    enter.forEach((e) => {
      e.call(this, path, node);
    });
  };
  const exit = function (path, node) {
    this.onExit(path, node);
  };
  return {
    enter: wrappedEntry,
    exit,
  };
}

function coverStatement(path) {
  this.insertStatementCounter(path);
}

/* istanbul ignore next: no node.js support */
function coverAssignmentPattern(path) {
  const n = path.node;
  const b = this.cov.newBranch("default-arg", n.loc);
  this.insertBranchCounter(path, path.get("right"), b);
}

function coverFunction(path) {
  this.insertFunctionCounter(path);
}

function coverVariableDeclarator(path) {
  this.insertStatementCounter(path.get("init"));
}

function coverClassPropDeclarator(path) {
  this.insertStatementCounter(path.get("value"));
}

function makeBlock(path) {
  const T = this.types;
  if (!path.node) {
    path.replaceWith(T.blockStatement([]));
  }
  if (!path.isBlockStatement()) {
    path.replaceWith(T.blockStatement([path.node]));
    path.node.loc = path.node.body[0].loc;
    path.node.body[0].leadingComments = path.node.leadingComments;
    path.node.leadingComments = undefined;
  }
}

function blockProp(prop) {
  return function (path) {
    makeBlock.call(this, path.get(prop));
  };
}

function makeParenthesizedExpressionForNonIdentifier(path) {
  const T = this.types;
  if (path.node && !path.isIdentifier()) {
    path.replaceWith(T.parenthesizedExpression(path.node));
  }
}

function parenthesizedExpressionProp(prop) {
  return function (path) {
    makeParenthesizedExpressionForNonIdentifier.call(this, path.get(prop));
  };
}

function convertArrowExpression(path) {
  const n = path.node;
  const T = this.types;
  if (!T.isBlockStatement(n.body)) {
    const bloc = n.body.loc;
    if (n.expression === true) {
      n.expression = false;
    }
    n.body = T.blockStatement([T.returnStatement(n.body)]);
    // restore body location
    n.body.loc = bloc;
    // set up the location for the return statement so it gets
    // instrumented
    n.body.body[0].loc = bloc;
  }
}

function extractAndReplaceVariablesFromTest(
  scope: Scope,
  test: NodePath<t.Expression>
) {
  const variables = [];
  // the next line is a hack to ensure the test is traversed from the actual test instead of the inner stuff
  // essentially the wrapper sequence expression is skipped instead of the outer test expression
  test.replaceWith(t.sequenceExpression([test.node]));
  test.traverse(
    {
      Identifier: {
        enter: (p: NodePath<t.Identifier>) => {
          // const newIdentifier = test.scope.generateUidIdentifier('meta')
          if (
            ["eval", "arguments", "undefined", "NaN", "Infinity"].includes(
              p.node.name
            )
          ) {
            return;
          }
          variables.push([p.node.name, p.node.name]);

          // p.replaceWith(t.sequenceExpression([t.assignmentExpression("=", newIdentifier, p.node), newIdentifier]))
        },
      },
      CallExpression: {
        enter: (p) => {
          const newIdentifier = scope.generateUidIdentifier("meta");

          variables.push([p.getSource(), newIdentifier.name]);
          p.replaceWith(
            t.sequenceExpression([
              t.assignmentExpression("=", newIdentifier, p.node),
              newIdentifier,
            ])
          );

          p.skip();
        },
      },
      MemberExpression: {
        enter: (p) => {
          const newIdentifier = scope.generateUidIdentifier("meta");

          variables.push([p.getSource(), newIdentifier.name]);
          p.replaceWith(
            t.sequenceExpression([
              t.assignmentExpression("=", newIdentifier, p.node),
              newIdentifier,
            ])
          );

          p.skip();
        },
      },
      // calls and such are possible but are problamatic because they could have side effects changing the behaviour
    },
    test
  );

  return variables;
}

function coverIfBranches(path) {
  const n = path.node;
  const hint = this.hintFor(n);
  const ignoreIf = hint === "if";
  const ignoreElse = hint === "else";
  const branch = this.cov.newBranch("if", n.loc);

  if (ignoreIf) {
    this.setAttr(n.consequent, "skip-all", true);
  } else {
    if (path.get("consequent").isBlockStatement()) {
      if (path.get("consequent").has("body")) {
        this.insertBranchCounter(
          path,
          path.get("consequent").get("body")[0],
          branch
        );
      } else {
        this.insertBranchCounter(path, path.get("consequent"), branch, true);
      }
    } else {
      this.insertBranchCounter(path, path.get("consequent"), branch);
    }
  }
  if (ignoreElse) {
    this.setAttr(n.alternate, "skip-all", true);
  } else {
    if (path.get("alternate").isBlockStatement()) {
      if (path.get("alternate").has("body")) {
        this.insertBranchCounter(
          path,
          path.get("alternate").get("body")[0],
          branch
        );
      } else {
        this.insertBranchCounter(path, path.get("alternate"), branch, true);
      }
    } else {
      this.insertBranchCounter(path, path.get("alternate"), branch);
    }
  }

  const test = path.get("test");

  const index = this.cov.newStatement(test.node.loc);
  const increment = this.increase("s", index, null);
  const testAsString = `${test.toString()}`;
  const variables = extractAndReplaceVariablesFromTest(path.scope, test);
  const metaTracker = this.getBranchMetaTracker(
    branch,
    testAsString,
    variables
  );

  const identifier = path.scope.generateUidIdentifier("test");

  path.insertBefore(
    t.variableDeclaration("let", [
      ...variables
        .filter(([source, identifier]) => {
          const binding = path.scope.getBinding(identifier);
          // all identifiers with a binding should be skipped
          return !binding;
        })
        .map(([source, identifier]) => {
          return t.variableDeclarator(t.identifier(identifier));
        }),
      t.variableDeclarator(identifier),
    ])
  );

  test.replaceWith(
    t.sequenceExpression([
      increment,
      t.assignmentExpression("=", identifier, test.node),
      metaTracker,
      identifier,
    ])
  );
}

function coverLoopBranch(path: NodePath<t.Loop>) {
  const n = path.node;
  const branch = this.cov.newBranch("loop", n.loc);

  if (path.get("body").isBlockStatement()) {
    if (path.get("body").has("body")) {
      this.insertBranchCounter(path, path.get("body").get("body")[0], branch);
    } else {
      this.insertBranchCounter(path, path.get("body"), branch, true);
    }
  } else {
    this.insertBranchCounter(path, path.get("body"), branch);
  }

  const T = this.types;

  const increment = this.getBranchIncrement(path, branch, undefined);
  const index = this.cov.newStatement(path.node.loc, true, true);
  const secondIncrement = this.increase("s", index, null);
  path.insertAfter(T.expressionStatement(secondIncrement));
  path.insertAfter(T.expressionStatement(increment));

  // TODO we should actually print what the just defined variable is set to
  const justDefinedVariables = [];

  if (path.has("init")) {
    (<NodePath<t.ForStatement>>path).get("init").traverse({
      VariableDeclarator: {
        enter: (p) => {
          const id = p.get("id");
          if (id.isIdentifier()) {
            justDefinedVariables.push(id.node.name);
          }
        },
      },
    });
  }

  if (path.has("test")) {
    const test = (<
      NodePath<t.ForStatement | t.WhileStatement | t.DoWhileStatement>
    >path).get("test");

    const index = this.cov.newStatement(test.node.loc);
    const testIncrement = this.increase("s", index, null);
    const variables = extractAndReplaceVariablesFromTest(path.scope, test);
    const testAsString = `${test.toString()}`;
    const metaTracker = this.getBranchMetaTracker(
      branch,
      testAsString,
      variables
    );

    const identifier = path.scope.generateUidIdentifier("test");

    path.insertBefore(
      t.variableDeclaration("let", [
        ...variables
          .filter(([source, identifier]) => {
            const binding = path.scope.getBinding(identifier);
            // all identifiers with a binding should be skipped
            return !binding;
          })
          .map(([source, identifier]) => {
            return t.variableDeclarator(t.identifier(identifier));
          }),
        t.variableDeclarator(identifier),
      ])
    );

    test.replaceWith(
      t.sequenceExpression([
        testIncrement,
        t.assignmentExpression("=", identifier, test.node),
        metaTracker,
        identifier,
      ])
    );
  }
}

function createSwitchBranch(path: NodePath<t.SwitchStatement>) {
  // const b = this.cov.newBranch("switch", path.node.loc);
  // this.setAttr(path.node, "branchName", b);
}

function coverSwitchCase(path: NodePath<t.SwitchCase>) {
  const T = this.types;

  if (!path.has("test")) {
    // ignore default cases
    return;
  }

  const b = this.cov.newBranch("switch", path.node.loc);

  const increment = this.getBranchIncrement(path, b, path.node.loc);
  path.node.consequent.unshift(T.expressionStatement(increment));

  const falseIncrement = this.getBranchIncrement(path, b, undefined);

  const parent = <NodePath<t.SwitchStatement>>path.parentPath;
  let next = false;
  let defaultExists = false;
  for (const case_ of parent.get("cases")) {
    // add it to all next cases
    if (next) {
      case_.node.consequent.unshift(t.expressionStatement(falseIncrement));
    }

    if (case_ === path) {
      next = true;
    }

    if (!case_.has("test")) {
      defaultExists = true;
    }
  }

  if (!defaultExists) {
    parent.insertAfter(t.expressionStatement(falseIncrement));
  }
}

function coverTernary(path: NodePath<t.Conditional>) {
  const n = path.node;
  const branch = this.cov.newBranch("cond-expr", path.node.loc);
  const cHint = this.hintFor(n.consequent);
  const aHint = this.hintFor(n.alternate);

  if (cHint !== "next") {
    this.insertBranchCounter(path, path.get("consequent"), branch);
  }
  if (aHint !== "next") {
    this.insertBranchCounter(path, path.get("alternate"), branch);
  }

  const test = path.get("test");

  const index = this.cov.newStatement(path.node.loc);
  const increment = this.increase("s", index, null);

  const testIndex = this.cov.newStatement(test.node.loc);
  const testIncrement = this.increase("s", testIndex, null);

  const testAsString = `${test.toString()}`;
  const variables = extractAndReplaceVariablesFromTest(path.scope, test);
  const metaTracker = this.getBranchMetaTracker(
    branch,
    testAsString,
    variables
  );
  // path.parentPath.insertBefore(metaTracker)
  // path.replaceWith(T.sequenceExpression([metaTracker, path.node]))

  // this.insertCounter(path, increment);

  const identifier = path.scope.generateUidIdentifier("test");

  path
    .findParent((path) => path.isStatement())
    .insertBefore(
      t.variableDeclaration("let", [
        ...variables
          .filter(([source, identifier]) => {
            const binding = path.scope.getBinding(identifier);
            // all identifiers with a binding should be skipped
            return !binding;
          })
          .map(([source, identifier]) => {
            return t.variableDeclarator(t.identifier(identifier));
          }),
        t.variableDeclarator(identifier),
      ])
    );

  test.replaceWith(
    t.sequenceExpression([
      increment,
      testIncrement,
      t.assignmentExpression("=", identifier, test.node),
      metaTracker,
      identifier,
    ])
  );
}

// TODO not sure how to handle the metatracker for this
// TODO also unhandy since a chain of statements will be seen as a multi-sides branch
function coverLogicalExpression(path) {
  // const T = this.types;
  // if (path.parentPath.node.type === "LogicalExpression") {
  //   return; // already processed
  // }
  //
  // const leaves = [];
  // this.findLeaves(path.node, leaves);
  // const b = this.cov.newBranch("binary-expr", path.node.loc, this.reportLogic);
  // for (let i = 0; i < leaves.length; i += 1) {
  //   const leaf = leaves[i];
  //   const hint = this.hintFor(leaf.node);
  //   if (hint === "next") {
  //     continue;
  //   }
  //
  //   if (this.reportLogic) {
  //     const increment = this.getBranchLogicIncrement(leaf, b, leaf.node.loc);
  //     if (!increment[0]) {
  //       continue;
  //     }
  //     leaf.parent[leaf.property] = T.sequenceExpression([
  //       increment[0],
  //       increment[1],
  //     ]);
  //     continue;
  //   }
  //
  //   const increment = this.getBranchIncrement(b, leaf.node.loc);
  //   if (!increment) {
  //     continue;
  //   }
  //   leaf.parent[leaf.property] = T.sequenceExpression([increment, leaf.node]);
  // }
}

const codeVisitor = {
  ArrowFunctionExpression: entries(convertArrowExpression, coverFunction),
  AssignmentPattern: entries(coverAssignmentPattern),
  BlockStatement: entries(), // ignore processing only
  ExportDefaultDeclaration: entries(), // ignore processing only
  ExportNamedDeclaration: entries(), // ignore processing only
  ClassMethod: entries(coverFunction),
  ClassDeclaration: entries(parenthesizedExpressionProp("superClass")),
  ClassProperty: entries(coverClassPropDeclarator),
  ClassPrivateProperty: entries(coverClassPropDeclarator),
  ObjectMethod: entries(coverFunction),
  ExpressionStatement: entries(coverStatement),
  BreakStatement: entries(coverStatement),
  ContinueStatement: entries(coverStatement),
  DebuggerStatement: entries(coverStatement),
  ReturnStatement: entries(coverStatement),
  ThrowStatement: entries(coverStatement),
  TryStatement: entries(coverStatement),
  VariableDeclaration: entries(), // ignore processing only
  VariableDeclarator: entries(coverVariableDeclarator),
  IfStatement: entries(
    blockProp("consequent"),
    blockProp("alternate"),
    coverStatement,
    coverIfBranches
  ),
  ForStatement: entries(blockProp("body"), coverStatement, coverLoopBranch),
  ForInStatement: entries(
    blockProp("body"),
    coverStatement
    // coverLoopBranch
  ),
  ForOfStatement: entries(
    blockProp("body"),
    coverStatement
    // coverLoopBranch
  ),
  WhileStatement: entries(blockProp("body"), coverStatement, coverLoopBranch),
  DoWhileStatement: entries(blockProp("body"), coverStatement, coverLoopBranch),
  SwitchStatement: entries(createSwitchBranch, coverStatement),
  SwitchCase: entries(coverSwitchCase),
  WithStatement: entries(blockProp("body"), coverStatement),
  FunctionDeclaration: entries(coverFunction),
  FunctionExpression: entries(coverFunction),
  LabeledStatement: entries(coverStatement),
  ConditionalExpression: entries(coverTernary),
  LogicalExpression: entries(coverLogicalExpression),
};
const globalTemplateAlteredFunction = template(`
        const Function = (function(){}).constructor;
        const global = (new Function(GLOBAL_COVERAGE_SCOPE))();
`);
const globalTemplateFunction = template(`
        const global = (new Function(GLOBAL_COVERAGE_SCOPE))();
`);
const globalTemplateVariable = template(`
        const global = GLOBAL_COVERAGE_SCOPE;
`);
// the template to insert at the top of the program.
const coverageTemplate = template(
  `
    function COVERAGE_FUNCTION () {
        const path = PATH;
        const hash = HASH;
        GLOBAL_COVERAGE_TEMPLATE
        const gcv = GLOBAL_COVERAGE_VAR;
        const coverageData = INITIAL;
        const coverage = global[gcv] || (global[gcv] = {});
        if (!coverage[path] || coverage[path].hash !== hash) {
            coverage[path] = coverageData;
        }
        const actualCoverage = coverage[path];
        {
            // @ts-ignore
            COVERAGE_FUNCTION = function () {
                return actualCoverage;
            }
        }
        return actualCoverage;
    }
`,
  { preserveComments: true }
);

const metaTemplate = template(
  `
    function META_FUNCTION (branch, metaInformation) {
        const path = PATH;
        const hash = HASH;
        const gmv = GLOBAL_META_VAR;
        const meta = global[gmv] || (global[gmv] = {});
                
        if (!meta[path] || meta[path].hash !== hash) {
            meta[path] = {
              hash: hash,
              meta: {}
            };
        }
        
        if (!meta[path].meta[branch]) {
          meta[path].meta[branch] = {}
        }
        
        meta[path].meta[branch] = metaInformation
    }
`,
  { preserveComments: true }
);
// the rewire plugin (and potentially other babel middleware)
// may cause files to be instrumented twice, see:
// https://github.com/istanbuljs/babel-plugin-istanbul/issues/94
// we should only instrument code for coverage the first time
// it's run through istanbul-lib-instrument.
function alreadyInstrumented(path: NodePath<t.Node>, visitState) {
  return path.scope.hasBinding(visitState.varName);
}
function shouldIgnoreFile(programNode) {
  return (
    programNode.parent &&
    programNode.parent.comments.some((c) => COMMENT_FILE_RE.test(c.value))
  );
}

export interface VisitorOptions {
  inputSourceMap?: any;
  ignoreClassMethods?: any;
  reportLogic?: any;
  coverageGlobalScopeFunc?: any;
  coverageGlobalScope?: any;
  coverageVariable?: any;
}
