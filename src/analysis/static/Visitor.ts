import { Scope } from "./types/discovery/Scope";
import { Element, ElementType } from "./types/discovery/Element";

export abstract class Visitor {
  private _filePath: string;
  private _scopeIdOffset: number = undefined

  constructor(filePath: string) {
    this._filePath = filePath
  }

  Program: (path) => void = (path) => {
    // this is required because babel does not reset its uid counter
    if (this._scopeIdOffset === undefined) {
      this._scopeIdOffset = path.scope.uid
    }
  }

  _getScope(path, name): Scope {
    if (path.scope.hasGlobal(name)) {
      return {
        uid: 'global',
        filePath: this.filePath
      }
    }

    if (path.scope.hasBinding(name) && path.scope.getBinding(name)) {
      const variableScope = path.scope.getBinding(name).scope

      return {
        uid: `${variableScope.uid - this.scopeIdOffset}`,
        filePath: this.filePath,
      }
    }

    // if (path.scope.hasOwnBinding(name)) {
    //   const variableScope = path.scope.getOwnBinding(name).scope
    //
    //   return {
    //     uid: variableScope.uid,
    //     filePath: filePath,
    //   }
    // }

    if (path.type === 'MemberExpression') { // TODO we should check if we are the property currently (doesnt work when object === property, car.car)
      if (path.node.property.name === name) {
        const objectIdentifier = this._getOriginalObjectIdentifier(path.node.object)

        const objectScope: Scope = this._getScope(path, objectIdentifier)

        objectScope.uid += '-' + objectIdentifier

        return objectScope
      }
    } else if (path.type === 'ClassMethod') {
      return {
        uid: `${path.scope.uid - this.scopeIdOffset}`,
        filePath: this.filePath,
      }
    }

    if (name === 'this' || name === 'anon') {
      return {
        uid: `${path.scope.uid - this.scopeIdOffset}`,
        filePath: this.filePath,
      }
    }


    throw new Error(`Cannot find scope of element ${name} of type ${path.type} in ${this.filePath}`)
  }

  _getOriginalObjectIdentifier(object): string {
    if (object.type === 'Identifier') {
      return object.name
    }

    if (object.type === 'ThisExpression') {
      return 'this'
    }

    if (object.type === 'CallExpression'
      || object.type === 'NewExpression') {
      return this._getOriginalObjectIdentifier(object.callee)
    } else if (object.type === 'MemberExpression') {
      return this._getOriginalObjectIdentifier(object.object)
    } else {
      // throw new Error(`${object.type}`)

      return 'anon'
    }
  }

  _getElement(path, node): Element {
    const scope: Scope = {
      filePath: this.filePath,
      uid: path.scope.uid
    }

    if (node.type === "NullLiteral") {
      return {
        scope: scope,
        type: ElementType.NullConstant,
        value: null
      }
    } else if (node.type === "StringLiteral"
      || node.type === "TemplateLiteral") {
      return {
        scope: scope,
        type: ElementType.StringConstant,
        value: node.value
      }
    } else if (node.type === "NumericLiteral") {
      return {
        scope: scope,
        type: ElementType.NumericalConstant,
        value: node.value
      }
    } else if (node.type === "BooleanLiteral") {
      return {
        scope: scope,
        type: ElementType.BooleanConstant,
        value: node.value
      }
    } else if (node.type === "RegExpLiteral") {
      return {
        scope: scope,
        type: ElementType.RegexConstant,
        value: node.pattern
      }
    } else if (node.type === "Identifier") {
      return {
        scope: this._getScope(path, node.name),
        type: ElementType.Identifier,
        value: node.name
      }
    } else if (node.type === "ThisExpression") {
      // TODO should be done differently maybe
      return {
        scope: this._getScope(path, 'this'),
        type: ElementType.Identifier,
        value: 'this'
      }
    } else if (node.type === "Super") {
      // TODO should be done differently maybe
      return {
        scope: scope,
        type: ElementType.Identifier,
        value: 'super'
      }
    } else if (node.type === 'UnaryExpression'
      || node.type === 'UpdateExpression'
      || node.type === 'CallExpression'

      || node.type === 'BinaryExpression'
      || node.type === 'LogicalExpression'

      || node.type === 'ConditionalExpression'

      || node.type === 'MemberExpression'

      || node.type === 'ArrowFunctionExpression'
      || node.type === 'FunctionExpression'

      // TODO

      || node.type === 'SpreadElement'
      || node.type === 'NewExpression'
      || node.type === 'SequenceExpression'
      || node.type === 'ObjectPattern'
      || node.type === 'RestElement'

      || node.type === 'ArrayExpression'
      || node.type === 'ObjectExpression'

      || node.type === 'ObjectProperty' // TODO not sure about this one
      || node.type === 'ObjectMethod'// TODO not sure about this one

      || node.type === 'AssignmentExpression'
      || node.type === 'AssignmentPattern'
      || node.type === 'ArrayPattern') {

      // TODO should be default
      return {
        scope: scope,
        type: ElementType.Relation,
        value: `%${node.start}-${node.end}`
      }
    }
    throw new Error(`Cannot get element: "${node.name}" -> ${node.type}`)
  }


  get filePath(): string {
    return this._filePath;
  }

  get scopeIdOffset(): number {
    return this._scopeIdOffset;
  }

  set scopeIdOffset(value: number) {
    this._scopeIdOffset = value;
  }
}