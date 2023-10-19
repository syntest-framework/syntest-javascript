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

import { NodePath, traverse } from "@babel/core";
import * as t from "@babel/types";

import { Action, ActionType } from "./Action";

export type ExecuteMessage = {
  message: "execute";
  filePath: string;
  source: string;
  ast: t.Node;
};

export type ResultMessage = {
  message: "result";
  actions: {[key: string]: Action};
};

// eslint-disable-next-line @typescript-eslint/no-misused-promises
process.on("message", async (data: ExecuteMessage) => {
  if (typeof data !== "object") {
    throw new TypeError("Invalid data received from child process");
  }
  if (data.message === "execute") {
    await gatherIntel(data.filePath, data.source, data.ast);
  }
});

function getLineAndColumn(text: string, index: number) {
  let line = 1;
  let column = 0;
  for (let index_ = 0; index_ < index; index_++) {
    column++;
    if (text[index_] === "\n") {
      column = 0;
      line++;
    }
    if (text[index_] === "\r") {
      // A line feed after a carriage return counts as part of the same newline
      if (text[index_ + 1] === "\n") {
        index_++;
      }
      column = 0;
      line++;
    }
  }
  return { line, column };
}

function isClass(object: any) {
  if (object == undefined || object === undefined) {
    return false;
  }

  const isCtorClass =
    object.constructor && object.constructor.toString().slice(0, 5) === "class";
  const isNativeCtorClass= object.constructor &&
                            object.constructor.name != "Function" &&
                            object.constructor.name in global;

                            if (object.prototype === undefined) {
    return isCtorClass || isNativeCtorClass
  }
  const isPrototypeCtorClass =
    object.prototype.constructor &&
    object.prototype.constructor.toString &&
    object.prototype.constructor.toString().slice(0, 5) === "class";

  const isNativePrototypeCtorClass =
    object.prototype.constructor.name in global &&
    ((<any>global)[object.prototype.constructor.name] == object.constructor ||
      (<any>global)[object.prototype.constructor.name] == object);

  const hasPrototypes =
    object.prototype && Object.keys(object.prototype).length > 0;
  return (
    isCtorClass ||
    isNativeCtorClass ||
    isPrototypeCtorClass ||
    isNativePrototypeCtorClass ||
    hasPrototypes
  );
}

// function getAllFuncs(toCheck: any) {
//   const properties: string[] = [];
//   let object = toCheck;
//   do {
//       properties.push(...Object.getOwnPropertyNames(object));
//   } while (((object = Object.getPrototypeOf(object)) && object != Object.prototype));

//   return properties.sort().filter((e, index, array) => {
//     if (Object.prototype.hasOwnProperty(e)) {
//       return false
//     }
//      if (e!=array[index+1] && typeof toCheck[e] == 'function') return true;
//      return false
//   });
// }

function isConstructable(object: any) {
  if (object == undefined || object === undefined) {
    return false;
  }

  const handler={construct(){return handler}} //Must return ANY object, so reuse one

  // try{
  //     return !!(new (new Proxy(object, handler))())
  // }catch{
  //     return false
  // }

  try {
    Reflect.construct(String, [], object);
  } catch {
    return false;
  }
  return true;
  // const properties: Set<string | symbol> = getAllMethodNames(
  //   object.prototype
  // );
  // return object.hasOwnProperty('prototype') && (Object.keys(object).length > 0 || properties.size > 0)
  // return !!object.constructor
}

function getAllMethodNames(object: any) {
  const methods = new Set<string | symbol>();

  if (!(object instanceof Object)) {
    return methods;
  }

  do {
    const keys = Reflect.ownKeys(object);
    for (const k of keys) methods.add(k);
  } while (
    (object = Reflect.getPrototypeOf(object)) &&
    object != Object.prototype
  );
  return methods;
}

function getSourceCodeLocationId(filePath: string, source: string, ast: t.Node, parentAction: Action, key: string, object: any): string {
  const text: string = object.toString();

  if (key === 'constructor') {
    let id: string
    traverse(ast, {
      ClassMethod: {
        enter: (path: NodePath<t.ClassMethod>) => {
          if (path.node.kind !== 'constructor') {
              return
          }
          const classParent = path.parentPath.parentPath
          const [start, end] = parentAction.id.split(':::')[2].split(':')
          if (classParent.isClass() && classParent.node.start === Number.parseInt(start) && classParent.node.end === Number.parseInt(end)) {
            id = `${filePath}:${path.node.loc.start.line}:${path.node.loc.start.column}:::${path.node.loc.end.line}:${path.node.loc.end.column}:::${path.node.loc.start.index}:${path.node.loc.end.index}`;
          }
        }
      }
    });


    return id
    // // terrible solution to extract a constructor
    // // TODO this only prevents directly commented code
    // // TODO /* \n\n\n constructor ... */ is also commented but will be picked up by this
    // // TODO this regex also only allows white space between the ) and { at the end of a constructor
    // const regx = /(?<!((\/\/[\S\s]*)|(\/\*[\S\s]*)))constructor[\S\s]*?\([\S\s]*?\)\s*?{/g;
    // const match = regx.exec(text)

    // console.log(match)
    // if (!match) {
    //   return undefined
    // }

    // const startIndex = match.index
    // const value = match[0]
    // console.log(value)
    // let endIndex = startIndex + value.length
    // // find the closing bracket
    // let depth = 1
    // for (;depth > 0;endIndex++) {
    //   if (!source[endIndex]) {
    //     throw new Error("Cannot find closing bracket")
    //   }
    //   if (source[endIndex] === '{') {
    //     depth++
    //   } else if (source[endIndex] === '}') {
    //     depth--
    //   }
    // }

    // const { line: startLine, column: startColumn } = getLineAndColumn(
    //   source,
    //   startIndex
    // );
    // const { line: endLine, column: endColumn } = getLineAndColumn(
    //   source,
    //   endIndex
    // );

    // return `${filePath}:${startLine}:${startColumn}:::${endLine}:${endColumn}:::${startIndex}:${endIndex}`;
  } else {
    const startIndex = source.indexOf(text);

    if (source.lastIndexOf(text) !== startIndex) {
      console.warn("Multiple occurences of the same function/object found in export! We do not support this! (Additionally, duplicate code is not something you want!)")
    }

    let id: string
    if (startIndex === -1) {
      console.log('could not find the following:')
      console.log(object.toString())
      // its actually an object or class
      id = isClass(object) ? "object" : "function";
    } else {
      const endIndex = startIndex + text.length;
      const { line: startLine, column: startColumn } = getLineAndColumn(
        source,
        startIndex
      );
      const { line: endLine, column: endColumn } = getLineAndColumn(
        source,
        endIndex
      );
      id = `${filePath}:${startLine}:${startColumn}:::${endLine}:${endColumn}:::${startIndex}:${endIndex}`;
    }
    return id
  }
}

async function gatherIntel(filePath: string, source: string, ast: t.Node) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const import_ = await import(filePath);

  let rootAction: Action;
  const actions: {[key: string]: Action} = {}

  // queue of [parent, key, child]
  const queue: [Action, string, unknown][] = [[undefined, "__root__", import_]];

  while (queue.length > 0) {
    const [parentAction, key, child] = queue.shift();

    // console.log(child)
    if (!(child instanceof Object)) {
      // TODO could be an constant!
      continue;
    }

    const id: string = getSourceCodeLocationId(filePath, source, ast, parentAction, key, child)

    if (!id) {
      // probably non-defined constructor
      continue
    }

    if (actions[id]) {
      // no repeats
      continue
    }

    const type: ActionType = typeof child === 'function' ? 'function' : 'object'//typeof child === 'object' ? 'object' : 'constant'

    const childAction: Action = {
      type: type,

      id: id,
      filePath: filePath,

      children: {},
      parentId: parentAction ? parentAction.id : undefined,

      constructable: isConstructable(child) && key !== 'constructor',
      name: key
    };

    actions[id] = childAction
    if (!rootAction) {
      rootAction = childAction;
    }

    if (parentAction) {
      parentAction.children[key] = childAction;
    }

    if (isConstructable(child) && key !== 'constructor') {
      queue.push([childAction, 'constructor', (<any>child).prototype['constructor']])
    }

    if (key === 'constructor') {
      continue
    }

    for (const key of Object.keys(child)) {
      if (key === "prototype") {
        continue;
      }
      if ((<any>child)[key] === child) {
        continue
      }
      queue.push([childAction, key, (<never>child)[key]]);
    }

    const properties: Set<string | symbol> = getAllMethodNames(
      (<any>child).prototype
    );
    for (const key of properties) {
      if ((<any>child).prototype[key] === child) {
        continue;
      }
      queue.push([childAction, key.toString(), (<any>child).prototype[key]]);
    }
  }

  // console.log(rootAction);
  // console.log(JSON.stringify(rootAction, undefined, 2));

  const resultMessage: ResultMessage = {
    message: "result",
    actions: actions,
  };
  // console.log(resultMessage)
  // console.log(JSON.stringify(resultMessage, undefined, 2));

  process.send(resultMessage);
}
