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
export * from "./lib/ast/AbstractSyntaxTreeFactory.js";
export * from "./lib/ast/defaultBabelConfig.js";

export * from "./lib/cfg/ControlFlowGraphFactory.js";
export * from "./lib/cfg/ControlFlowGraphVisitor.js";

export * from "./lib/constant/ConstantPool.js";
export * from "./lib/constant/ConstantPoolFactory.js";
export * from "./lib/constant/ConstantPoolManager.js";
export * from "./lib/constant/ConstantVisitor.js";

export * from "./lib/dependency/DependencyFactory.js";
export * from "./lib/dependency/DependencyVisitor.js";

export * from "./lib/target/export/Export.js";
export * from "./lib/target/export/ExportDefaultDeclaration.js";
export * from "./lib/target/export/ExportFactory.js";
export * from "./lib/target/export/ExportNamedDeclaration.js";
export * from "./lib/target/export/ExportVisitor.js";
export * from "./lib/target/export/ExpressionStatement.js";

export * from "./lib/target/Target.js";
export * from "./lib/target/TargetFactory.js";
export * from "./lib/target/TargetVisitor.js";
export * from "./lib/target/VisibilityType.js";

export * from "./lib/type/discovery/element/Element.js";
export * from "./lib/type/discovery/element/ElementVisitor.js";

export * from "./lib/type/discovery/object/DiscoveredType.js";
export * from "./lib/type/discovery/object/ObjectVisitor.js";

export * from "./lib/type/discovery/relation/Relation.js";
export * from "./lib/type/discovery/relation/RelationVisitor.js";

export * from "./lib/type/discovery/TypeExtractor.js";

export * from "./lib/type/resolving/Type.js";
export * from "./lib/type/resolving/TypeEnum.js";
export * from "./lib/type/resolving/TypeModel.js";
export * from "./lib/type/resolving/TypeModelFactory.js";
export * from "./lib/type/resolving/InferenceTypeModelFactory.js";

export * from "./lib/utils/fileSystem.js";

export * from "./lib/Events.js";
export * from "./lib/RootContext.js";
