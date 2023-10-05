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

import { Action, ActionType } from "./Action";


export type ExecuteMessage = {
    message: 'execute',
    filePath: string
    source: string
}

export type ResultMessage = {
    message: 'result',
    actions: Action[]
}

// eslint-disable-next-line @typescript-eslint/no-misused-promises
process.on("message", async (data: ExecuteMessage) => {
    if (typeof data !== "object") {
      throw new TypeError("Invalid data received from child process");
    }
    if (data.message === "execute") {
      await gatherIntel(data.filePath, data.source);
    }
  });

  function getLineNumber(text: string, index: number) {
    let line = 1;
    let column = 1;
    for (let index_ = 0; index_ < index; index_++) {
        column++
      if (text[index_] === '\n') {
        column = 1
        line++;
      }
      if (text[index_] === '\r') {
        // A line feed after a carriage return counts as part of the same newline
        if (text[index_ + 1] === '\n') {
          index_++;
        }
        column = 1
        line++;
      }
    }
    return {line, column};
  }

function isClass(object: any) {
  if (object == undefined || object === undefined) { return false; }

    const isCtorClass = object.constructor
        && object.constructor.toString().slice(0, 5) === 'class'
    // const isNativeCtorClass= object.constructor && 
    //                           object.constructor.name != "Function" && 
    //                           object.constructor.name in global;
    // console.log(isCtorClass, isNativeCtorClass)
    if (object.prototype === undefined) {
        return isCtorClass// || isNativeCtorClass
    }
    const isPrototypeCtorClass = object.prototype.constructor
        && object.prototype.constructor.toString
        && object.prototype.constructor.toString().slice(0, 5) === 'class'

    const isNativePrototypeCtorClass = object.prototype.constructor.name in global && (
            (<any>global)[object.prototype.constructor.name] == object.constructor || 
            (<any>global)[object.prototype.constructor.name] == object
        );

  const hasPrototypes = object.prototype && Object.keys(object.prototype).length > 0
  return isCtorClass || isPrototypeCtorClass || isNativePrototypeCtorClass || hasPrototypes
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

function getAllMethodNames(object: any) {
  const methods = new Set<string | symbol>();

  if (!(object instanceof Object)) {
    return methods
  }

  do {
    const keys = Reflect.ownKeys(object)
    for (const k of keys) methods.add(k);
  } while (((object = Reflect.getPrototypeOf(object)) && object != Object.prototype))
  return methods;
}
  
async function gatherIntel(filePath: string, source: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const import_ = await import(filePath)

    let rootAction: Action

    // queue of [parent, key, child]
    const queue: [Action, string, unknown][] = [[undefined, undefined, import_]]

    while (queue.length > 0) {
      const [parent, key, child] = queue.shift()

      if (!(child instanceof Object)) {
        continue
      }

      console.log(child)
      const text: string = child.toString()
      const startIndex = source.indexOf(text)      

      let id: string
      let type: ActionType
      if (startIndex === -1) {
        // its actually an object or class
        console.log('no index')
        console.log(child.constructor)
        console.log()
        id = isClass(child) ? 'class' : 'object'
        type = isClass(child) ? 'class' : 'object'
      } else {
        const endIndex = startIndex + text.length
        const {line: startLine, column: startColumn} = getLineNumber(source, startIndex)
        const {line: endLine, column: endColumn} = getLineNumber(source, endIndex)
        id = `${filePath}:${startLine}:${startColumn}:::${endLine}:${endColumn}:::${startIndex}:${endIndex}`
        type = isClass(child) ? 'class' : 'function'
      }

      const childAction: Action = {
        id: id,
        type: type,
        children: {}
      }

      if (!rootAction) {
        rootAction = childAction
      }
      
      if (parent) {
        parent.children[key] = childAction
      }

      console.log('== keys')
      console.log(Object.keys(child))
      for (const key of Object.keys(child)) {
        if (key === 'prototype') {
          continue
        }
        queue.push([childAction, key, (<never>child)[key]])
      }

      // console.log('== prototypes')
      // for (const key in (<any>child).prototype) {
      //   console.log(key)
      //   queue.push([childAction, key, (<any>child).prototype[key]])
      // }
      console.log('== properties')

      const properties: Set<string | symbol> = getAllMethodNames((<any>child).prototype)
      // const defaultProperties = Object.getOwnPropertyNames(Object.getPrototypeOf(Object))
      console.log(properties)
      for (const key of properties) {      
        if ((<any>child).prototype[key] === child) {
          continue
        }  
        queue.push([childAction, key.toString(), (<any>child).prototype[key]])
      }
      console.log('== end')
      // for (const key of Object.keys(child)) {
      //   queue.push([childAction, (<never>child)[key]])
      // }

      // if (isClass(child)) {
      //   // Object.
      //   for (const key of Object.getOwnPropertyNames((<any>child).prototype)) {
      //     queue.push([childAction, (<any>child).prototype[key]])
      //   }

      // }
    }

    // console.log(import_)
    // for (const x of Object.keys(import_)) {
    //     if (typeof import_[x] !== 'function') {
    //       return
    //     }
    //     let type: ActionType
    //     console.log(x)
    //     console.log(import_[x])
    //     console.log(Object.keys(import_[x].prototype))
    //     if (import_[x].constructor) {
    //       console.log(import_[x].constructor)
    //       type = 'class'
    //     } else {
    //         type = 'function'
    //     }

    //     const text: string = <string>import_[x].toString()
    //         const startIndex = source.indexOf(text)
    //         const endIndex = startIndex + text.length
    //         const {line: startLine, column: startColumn} = getLineNumber(source, startIndex)
    //         const {line: endLine, column: endColumn} = getLineNumber(source, endIndex)
    //         const id = `${filePath}:${startLine}:${startColumn}:::${endLine}:${endColumn}:::${startIndex}:${endIndex}`

    //         actions.push({
    //             id: id,
    //             type: type,
    //             children: []
    //         })
    // }
    console.log(rootAction)
    console.log(JSON.stringify(rootAction, undefined, 2))

    const resultMessage: ResultMessage = {
        message: 'result',
        actions: [rootAction]
    }
    process.send(resultMessage)
}
