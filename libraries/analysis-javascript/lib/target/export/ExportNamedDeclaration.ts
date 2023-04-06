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
import { NodePath } from "@babel/core";
import { Scope as BabelScope } from "@babel/traverse";
import * as t from "@babel/types";

import { Export } from "./Export";

function extractFromIdentifier(
  filePath: string,
  scope: BabelScope,
  node: t.Identifier,
  init?: t.Node
): Export {
  return init && init.type === "Identifier"
    ? {
        scope: scope,
        filePath,
        name: init.name,
        renamedTo: node.name,
        default: false,
        module: false,
      }
    : {
        scope: scope,
        filePath,
        name: node.name,
        renamedTo: node.name,
        default: false,
        module: false,
      };
}

function extractFromObjectPattern(
  filePath: string,
  scope: BabelScope,
  node: t.ObjectPattern,
  init: t.Node
): Export[] {
  const exports: Export[] = [];

  if (init.type !== "ObjectExpression") {
    // unsupported
    // e.g. export const {a} = o
    throw new Error("Property init is not an object expression");
  }

  if (node.properties.length !== init.properties.length) {
    // unsupported
    // e.g. export const {a, b} = {a: 1}
    // the number of properties in the object pattern should be the same as the number of properties in the object expression
    throw new Error(
      "Number of properties in object pattern and object expression do not match"
    );
  }

  for (const property of node.properties) {
    if (property.type === "RestElement") {
      // unsupported
      // e.g. export const {a, ...b} = objectA
      // if we have a rest element, we bassically export all the properties of the rest element so it is not possible to know what is exported
      throw new Error("RestElement is not supported");
    }

    if (property.key.type !== "Identifier") {
      // unsupported
      // not possible i think
      throw new Error("Property key is not an identifier");
    }

    const propertyName = property.key.name;

    // find the property in the object expression that has the same name as the property in the object pattern
    const match = init.properties.find((_property) => {
      if (_property.type === "SpreadElement") {
        // unsupported
        // e.g. export const {a, b} = {a, ...o}
        // if we have a sperad element, we bassically export all the properties of the spread element so it is not possible to know what is exported
        throw new Error("SpreadElement is not supported");
      }

      if (_property.key.type !== "Identifier") {
        // unsupported
        // not possible i think
        throw new Error("Property key is not an identifier");
      }

      // so we want to find the property that has the same name as the property in the object pattern
      // e.g. export const {a} = {a: 1}
      return _property.key.name === propertyName;
    });

    if (!match) {
      throw new Error("Property not found");
    }

    // stupid hack to make typescript happy (is already checked above)
    if (match.type === "SpreadElement") {
      // unsupported
      // should never happen
      // if we have a sperad element, we bassically export all the properties of the spread element so it is not possible to know what is exported
      throw new Error("SpreadElement is not supported");
    }

    if (match.type === "ObjectMethod") {
      // unsupported
      // no idea what this is
      throw new Error("ObjectMethod is not supported");
    }

    if (match.key.type !== "Identifier") {
      // unsupported
      // should never happen
      throw new Error("Property key is not an identifier");
    }

    if (match.value.type === "Identifier") {
      // if the value assigned is an identifier we rename the identifier
      // e.g. export const {a} = {a: b}
      // in the above example we rename b to a (as the export)
      exports.push({
        scope: scope,
        filePath,
        name: match.value.name,
        renamedTo: property.key.name,
        default: false,
        module: false,
      });
    } else {
      // no rename, probably a literal
      // e.g. export const {a} = {a: 1}
      exports.push({
        scope: scope,
        filePath,
        name: property.key.name,
        renamedTo: property.key.name,
        default: false,
        module: false,
      });
    }
  }
  return exports;
}

function extractFromArrayPattern(
  filePath: string,
  scope: BabelScope,
  node: t.ArrayPattern,
  init: t.Node
): Export[] {
  const exports: Export[] = [];

  if (init.type !== "ArrayExpression") {
    // unsupported
    // e.g. export const [a] = o
    throw new Error("Property init is not an object expression");
  }

  if (node.elements.length !== init.elements.length) {
    // unsupported
    // e.g. export const [a, b] = [1]
    throw new Error("Array length does not match");
  }

  for (let index = 0; index < node.elements.length; index++) {
    const element = node.elements[index];
    const initElement = init.elements[index];

    if (element.type !== "Identifier") {
      // unsupported
      throw new Error("Array element is not an identifier");
    }

    if (initElement.type === "Identifier") {
      // if the value assigned is an identifier we rename the identifier
      // e.g. export const [a] = [b]
      // in the above example we rename b to a (as the export)
      exports.push({
        scope: scope,
        filePath,
        name: initElement.name,
        renamedTo: element.name,
        default: false,
        module: false,
      });
    } else {
      // no rename, probably a literal
      // e.g. export const [a] = [1]
      exports.push({
        scope: scope,
        filePath,
        name: element.name,
        renamedTo: element.name,
        default: false,
        module: false,
      });
    }
  }

  return exports;
}

export function extractExportsFromExportNamedDeclaration(
  filePath: string,
  path: NodePath<t.ExportNamedDeclaration>
): Export[] {
  const exports: Export[] = [];

  if (path.node.declaration) {
    if (
      path.node.declaration.type === "FunctionDeclaration" ||
      path.node.declaration.type === "ClassDeclaration"
    ) {
      exports.push({
        scope: path.scope,
        filePath,
        name: path.node.declaration.id.name,
        renamedTo: path.node.declaration.id.name,
        default: false,
        module: false,
      });
    } else if (path.node.declaration.type === "VariableDeclaration") {
      for (const declaration of path.node.declaration.declarations) {
        switch (declaration.id.type) {
          case "Identifier": {
            exports.push(
              extractFromIdentifier(
                filePath,
                path.scope,
                declaration.id,
                declaration.init
              )
            );

            break;
          }
          case "ObjectPattern": {
            exports.push(
              ...extractFromObjectPattern(
                filePath,
                path.scope,
                declaration.id,
                declaration.init
              )
            );

            break;
          }
          case "ArrayPattern": {
            exports.push(
              ...extractFromArrayPattern(
                filePath,
                path.scope,
                declaration.id,
                declaration.init
              )
            );

            break;
          }
          default: {
            throw new Error("Unsupported declaration type");
          }
        }
      }
    } else {
      // unsupported
      throw new Error("Unsupported declaration type");
    }
  } else if (path.node.specifiers) {
    for (const specifier of path.node.specifiers) {
      if (specifier.type === "ExportSpecifier") {
        // e.g. export {a as b}
        // e.g. export {a as "b"}
        // e.g. export {a}
        exports.push({
          scope: path.scope,
          filePath,
          name: specifier.local.name,
          renamedTo:
            specifier.exported.type === "Identifier"
              ? specifier.exported.name
              : specifier.exported.value,
          default: false,
          module: false,
        });
      } else {
        // unsupported
        throw new Error("Unsupported specifier type");
      }
    }
  } else {
    // unsupported
    throw new Error("Export has no specifiers nor declarations");
  }

  return exports;
}
