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
export * from "./lib/ast/AbstractSyntaxTreeFactory";
export * from "./lib/ast/defaultBabelConfig";

export * from "./lib/cfg/ControlFlowGraphFactory";
export * from "./lib/cfg/ControlFlowGraphVisitor";

export * from "./lib/target/export/Export";
export * from "./lib/target/export/ExportDefaultDeclaration";
export * from "./lib/target/export/ExportNamedDeclaration";
export * from "./lib/target/export/ExportVisitor";
export * from "./lib/target/export/ExpressionStatement";

export * from "./lib/target/ActionDescription";
export * from "./lib/target/ActionType";
export * from "./lib/target/IdentifierDescription";
export * from "./lib/target/Target";
export * from "./lib/target/TargetFactory";
export * from "./lib/target/TargetVisitor";
export * from "./lib/target/VisibilityType";

export * from "./lib/type/discovery/object/ComplexObject";
export * from "./lib/type/discovery/object/ObjectGenerator";
export * from "./lib/type/discovery/object/ObjectVisitor";

export * from "./lib/type/discovery/ElementTypeMap";
export * from "./lib/type/discovery/Relation";
export * from "./lib/type/discovery/VariableGenerator";
export * from "./lib/type/discovery/VariableVisitor";

export * from "./lib/type/resolving/logic/ObjectMatcher";
export * from "./lib/type/resolving/logic/TypeResolverInference";

export * from "./lib/type/resolving/TypeEnum";
export * from "./lib/type/resolving/TypeProbability";
export * from "./lib/type/resolving/TypeResolver";
export * from "./lib/type/resolving/TypeResolverUnknown";

export * from "./lib/utils/fileSystem";

export * from "./lib/RootContext";
