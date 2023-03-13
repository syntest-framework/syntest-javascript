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

import {
  Archive,
  BudgetManager,
  CoverageWriter,
  EvaluationBudget,
  IterationBudget,
  RuntimeVariable,
  SearchTimeBudget,
  StatisticsCollector,
  StatisticsSearchListener,
  SummaryWriter,
  TotalTimeBudget,
  TerminationManager,
} from "@syntest/core";

import {
  ActionType,
  Export,
  ExportGenerator,
  ImportGenerator,
  JavaScriptDecoder,
  JavaScriptRandomSampler,
  JavaScriptRunner,
  JavaScriptSubject,
  JavaScriptSuiteBuilder,
  JavaScriptTargetMetaData,
  JavaScriptTargetPool,
  JavaScriptTestCase,
  TargetMapGenerator,
  TypeResolver,
  TypeResolverInference,
  TypeResolverUnknown,
} from "@syntest/core-javascript";

import {
  ArgumentsObject,
  clearDirectory,
  CONFIG,
  createDirectoryStructure,
  createTempDirectoryStructure,
  deleteTempDirectories,
  Launcher,
  SearchAlgorithmPlugin,
  PluginType,
  TerminationPlugin,
  CrossoverPlugin,
} from "@syntest/base-testing-tool";

import { AbstractSyntaxTreeGenerator } from "@syntest/ast-javascript";
import * as path from "path";

import { ControlFlowGraphGenerator } from "@syntest/cfg-javascript";

import { existsSync } from "fs";
import { TableObject, UserInterface } from "@syntest/cli-graphics";
import {
  collectCoverageData,
  collectInitialVariables,
  collectStatistics,
} from "./collection";
import { ModuleManager } from "@syntest/module";
import { TestCommandOptions } from "./commands/test";

export interface JavaScriptArguments extends ArgumentsObject {
  incorporateExecutionInformation: boolean;
  typeInferenceMode: string;
  randomTypeProbability: number;
}

export class JavaScriptLauncher extends Launcher {
  private userInterface: UserInterface;

  private targetPool: JavaScriptTargetPool;
  private archive: Archive<JavaScriptTestCase>;

  private exports: Export[];
  private dependencyMap: Map<string, Export[]>;

  private coveredInPath = new Map<string, Archive<JavaScriptTestCase>>();

  constructor(userInterface: UserInterface) {
    super();
    this.userInterface = userInterface;
  }

  async initialize(): Promise<void> {
    if (existsSync(".syntest")) {
      await deleteTempDirectories();
    }

    await createDirectoryStructure();
    await createTempDirectoryStructure();

    const abstractSyntaxTreeGenerator = new AbstractSyntaxTreeGenerator();
    const targetMapGenerator = new TargetMapGenerator();

    let typeResolver: TypeResolver;

    if ((<JavaScriptArguments>CONFIG).typeInferenceMode === "none") {
      typeResolver = new TypeResolverUnknown();
    } else {
      typeResolver = new TypeResolverInference();
    }

    const controlFlowGraphGenerator = new ControlFlowGraphGenerator();
    const importGenerator = new ImportGenerator();
    const exportGenerator = new ExportGenerator();
    this.targetPool = new JavaScriptTargetPool(
      abstractSyntaxTreeGenerator,
      targetMapGenerator,
      controlFlowGraphGenerator,
      importGenerator,
      exportGenerator,
      typeResolver
    );

    this.userInterface.printHeader("GENERAL INFO");
    // TODO ui info messages

    this.userInterface.printHeader("TARGETS");

    // this.userInterface.report("property-set", [
    //   "Target Settings",
    //   <string>(
    //     (<unknown>[["Target Root Directory", CONFIG.targetRootDirectory]])
    //   ),
    // ]);
  }

  async preprocess(): Promise<void> {
    this.targetPool.loadTargets(CONFIG.include, CONFIG.exclude);

    if (!this.targetPool.targets.length) {
      // Shut server down
      this.userInterface.printError(
        `No targets where selected! Try changing the 'include' parameter`
      );
      await this.exit();
    }

    const names: string[] = [];

    this.targetPool.targets.forEach((target) =>
      names.push(
        `${path.basename(target.canonicalPath)} -> ${target.targetName}`
      )
    );
    // this.userInterface.report("targets", names);

    // this.userInterface.report("header", ["CONFIGURATION"]);

    // this.userInterface.report("single-property", ["Seed", getSeed()]);
    // this.userInterface.report("property-set", ["Budgets", <string>(<unknown>[
    //     ["Iteration Budget", `${CONFIG.iterationBudget} iterations`],
    //     ["Evaluation Budget", `${CONFIG.evaluationBudget} evaluations`],
    //     ["Search Time Budget", `${CONFIG.searchTimeBudget} seconds`],
    //     ["Total Time Budget", `${CONFIG.totalTimeBudget} seconds`],
    //   ])]);
    // this.userInterface.report("property-set", ["Algorithm", <string>(<unknown>[
    //     ["Algorithm", CONFIG.algorithm],
    //     ["Population Size", CONFIG.populationSize],
    //   ])]);
    // this.userInterface.report("property-set", [
    //   "Variation Probabilities",
    //   <string>(<unknown>[
    //     ["Resampling", CONFIG.resampleGeneProbability],
    //     ["Delta mutation", CONFIG.deltaMutationProbability],
    //     ["Re-sampling from chromosome", CONFIG.sampleExistingValueProbability],
    //     ["Crossover", CONFIG.crossoverProbability],
    //   ]),
    // ]);

    // this.userInterface.report("property-set", ["Sampling", <string>(<unknown>[
    //     ["Max Depth", CONFIG.maxDepth],
    //     ["Explore Illegal Values", CONFIG.exploreIllegalValues],
    //     [
    //       "Sample FUNCTION Result as Argument",
    //       CONFIG.sampleFunctionOutputAsArgument,
    //     ],
    //     ["Crossover", CONFIG.crossoverProbability],
    //   ])]);

    // this.userInterface.report("property-set", ["Type Inference", <string>(<
    //     unknown
    //   >[
    //     [
    //       "Incorporate Execution Information",
    //       (<JavaScriptArguments>CONFIG).incorporateExecutionInformation,
    //     ],
    //     [
    //       "Type Inference Mode",
    //       (<JavaScriptArguments>CONFIG).typeInferenceMode,
    //     ],
    //     [
    //       "Random Type Probability",
    //       (<JavaScriptArguments>CONFIG).randomTypeProbability,
    //     ],
    //   ])]);

    await (<JavaScriptTargetPool>this.targetPool).prepareAndInstrument(
      CONFIG.targetRootDirectory,
      CONFIG.tempInstrumentedDirectory
    );
    await (<JavaScriptTargetPool>this.targetPool).scanTargetRootDirectory(
      CONFIG.targetRootDirectory
    );
  }

  async process(): Promise<void> {
    this.archive = new Archive<JavaScriptTestCase>();
    this.exports = [];
    this.dependencyMap = new Map();

    for (const target of this.targetPool.targets) {
      const archive = await this.testTarget(
        <JavaScriptTargetPool>this.targetPool,
        target.canonicalPath,
        (<JavaScriptTargetPool>this.targetPool)
          .getTargetMap(target.canonicalPath)
          .get(target.targetName)
      );

      const dependencies = (<JavaScriptTargetPool>(
        this.targetPool
      )).getDependencies(target.canonicalPath);
      this.archive.merge(archive);

      this.dependencyMap.set(target.targetName, dependencies);
      this.exports.push(
        ...(<JavaScriptTargetPool>this.targetPool).getExports(
          target.canonicalPath
        )
      );
    }
  }

  async postprocess(): Promise<void> {
    const testDir = path.join(CONFIG.syntestDirectory, CONFIG.testDirectory);
    const tempTestDir = path.join(
      CONFIG.tempSyntestDirectory,
      CONFIG.tempTestDirectory
    );
    const tempLogDir = path.join(
      CONFIG.tempSyntestDirectory,
      CONFIG.tempLogDirectory
    );

    await clearDirectory(testDir);

    const decoder = new JavaScriptDecoder(
      <JavaScriptTargetPool>this.targetPool,
      this.dependencyMap,
      this.exports,
      CONFIG.targetRootDirectory,
      tempLogDir
    );
    const runner = new JavaScriptRunner(decoder, tempTestDir);

    const suiteBuilder = new JavaScriptSuiteBuilder(
      decoder,
      runner,
      tempLogDir
    );

    // TODO fix hardcoded paths

    const reducedArchive = suiteBuilder.reduceArchive(this.archive);

    let paths = await suiteBuilder.createSuite(
      reducedArchive,
      "../instrumented",
      CONFIG.tempTestDirectory,
      true,
      false
    );
    await suiteBuilder.runSuite(paths);

    // reset states
    await suiteBuilder.clearDirectory(CONFIG.tempTestDirectory);

    // run with assertions and report results
    for (const key of reducedArchive.keys()) {
      await suiteBuilder.gatherAssertions(reducedArchive.get(key));
    }
    paths = await suiteBuilder.createSuite(
      reducedArchive,
      "../instrumented",
      CONFIG.tempTestDirectory,
      false,
      true
    );
    const { stats, instrumentationData } = await suiteBuilder.runSuite(paths);

    if (stats.failures > 0) {
      this.userInterface.printError("Test case has failed!");
    }

    this.userInterface.printHeader("SEARCH RESULTS");

    const table: TableObject = {
      headers: ["Target", "Branch", "Statement", "Function", "File"],
      rows: [],
      footers: ["Average"],
    };

    const overall = {
      branch: 0,
      statement: 0,
      function: 0,
    };
    let totalBranches = 0;
    let totalStatements = 0;
    let totalFunctions = 0;
    for (const file of Object.keys(instrumentationData)) {
      const target = this.targetPool.targets.find(
        (t) => t.canonicalPath === file
      );
      if (!target) {
        continue;
      }

      const data = instrumentationData[file];

      const summary = {
        branch: 0,
        statement: 0,
        function: 0,
      };

      for (const statementKey of Object.keys(data.s)) {
        summary["statement"] += data.s[statementKey] ? 1 : 0;
        overall["statement"] += data.s[statementKey] ? 1 : 0;
      }

      for (const branchKey of Object.keys(data.b)) {
        summary["branch"] += data.b[branchKey][0] ? 1 : 0;
        overall["branch"] += data.b[branchKey][0] ? 1 : 0;
        summary["branch"] += data.b[branchKey][1] ? 1 : 0;
        overall["branch"] += data.b[branchKey][1] ? 1 : 0;
      }

      for (const functionKey of Object.keys(data.f)) {
        summary["function"] += data.f[functionKey] ? 1 : 0;
        overall["function"] += data.f[functionKey] ? 1 : 0;
      }

      totalStatements += Object.keys(data.s).length;
      totalBranches += Object.keys(data.b).length * 2;
      totalFunctions += Object.keys(data.f).length;

      table.rows.push([
        `${path.basename(target.canonicalPath)}: ${target.targetName}`,
        summary["statement"] + " / " + Object.keys(data.s).length,
        summary["branch"] + " / " + Object.keys(data.b).length * 2,
        summary["function"] + " / " + Object.keys(data.f).length,
        target.canonicalPath,
      ]);
    }

    overall["statement"] /= totalStatements;
    overall["branch"] /= totalBranches;
    overall["function"] /= totalFunctions;

    table.footers.push(
      ...[
        overall["statement"] * 100 + " %",
        overall["branch"] * 100 + " %",
        overall["function"] * 100 + " %",
      ]
    );

    const originalSourceDir = path
      .join("../../", path.relative(process.cwd(), CONFIG.targetRootDirectory))
      .replace(path.basename(CONFIG.targetRootDirectory), "");

    this.userInterface.printTable("Coverage", table);
    // create final suite
    await suiteBuilder.createSuite(
      reducedArchive,
      originalSourceDir,
      CONFIG.testDirectory,
      false,
      true
    );
  }

  private async testTarget(
    targetPool: JavaScriptTargetPool,
    targetPath: string,
    targetMeta: JavaScriptTargetMetaData
  ): Promise<Archive<JavaScriptTestCase>> {
    const cfg = targetPool.getCFG(targetPath, targetMeta.name);

    const functionMap = targetPool.getFunctionMapSpecific(
      targetPath,
      targetMeta.name
    );

    // couple types to parameters
    // TODO do this type matching already in the target visitor
    for (const func of functionMap.values()) {
      for (const param of func.parameters) {
        if (func.type === ActionType.FUNCTION) {
          param.typeProbabilityMap = targetPool.typeResolver.getTyping(
            func.scope,
            param.name
          );
        } else if (
          func.type === ActionType.METHOD ||
          func.type === ActionType.GET ||
          func.type === ActionType.SET ||
          func.type === ActionType.CONSTRUCTOR
        ) {
          param.typeProbabilityMap = targetPool.typeResolver.getTyping(
            func.scope,
            param.name
          );
        } else {
          throw new Error(
            `Unimplemented action identifierDescription ${func.type}`
          );
        }
      }
      // TODO return types
    }

    const currentSubject = new JavaScriptSubject(
      path.basename(targetPath),
      targetMeta,
      cfg,
      [...functionMap.values()]
    );

    if (!currentSubject.getPossibleActions().length) {
      // report skipped
      return new Archive();
    }

    const dependencies = targetPool.getDependencies(targetPath);
    const dependencyMap = new Map<string, Export[]>();
    dependencyMap.set(targetMeta.name, dependencies);
    const exports = targetPool.getExports(targetPath);

    const tempTestDir = path.join(
      CONFIG.tempSyntestDirectory,
      CONFIG.tempTestDirectory
    );
    const tempLogDir = path.join(
      CONFIG.tempSyntestDirectory,
      CONFIG.tempLogDirectory
    );

    const decoder = new JavaScriptDecoder(
      targetPool,
      dependencyMap,
      exports,
      CONFIG.targetRootDirectory,
      tempLogDir
    );
    const runner = new JavaScriptRunner(decoder, tempTestDir);

    const suiteBuilder = new JavaScriptSuiteBuilder(
      decoder,
      runner,
      tempLogDir
    );

    // TODO constant pool

    const sampler = new JavaScriptRandomSampler(
      currentSubject,
      (<TestCommandOptions>(<unknown>CONFIG)).typeInferenceMode,
      (<TestCommandOptions>(<unknown>CONFIG)).randomTypeProbability,
      (<TestCommandOptions>(<unknown>CONFIG)).incorporateExecutionInformation,
      CONFIG.maxActionStatements,
      CONFIG.stringAlphabet,
      CONFIG.stringMaxLength,
      CONFIG.resampleGeneProbability,
      CONFIG.deltaMutationProbability,
      CONFIG.exploreIllegalValues,
      targetPool
    );

    const objectiveManager = (<ObjectiveManagerPlugin<JavaScriptTestCase>>(
      ModuleManager.instance.getPlugin(
        PluginType.ObjectiveManager,
        CONFIG.objectiveManager
      )
    )).createObjectiveManager({
      runner: runner,
    });
    const crossover = (<CrossoverPlugin<JavaScriptTestCase>>(
      ModuleManager.instance.getPlugin(PluginType.Crossover, CONFIG.crossover)
    )).createCrossoverOperator({
      crossoverProbability: CONFIG.crossoverProbability,
    });

    const algorithm = (<SearchAlgorithmPlugin<JavaScriptTestCase>>(
      ModuleManager.instance.getPlugin(
        PluginType.SearchAlgorithm,
        CONFIG.algorithm
      )
    )).createSearchAlgorithm({
      objectiveManager: objectiveManager,
      encodingSampler: sampler,
      runner: runner,
      crossover: crossover,
      populationSize: CONFIG.populationSize,
    });

    await suiteBuilder.clearDirectory(CONFIG.tempTestDirectory);

    // allocate budget manager
    const iterationBudget = new IterationBudget(CONFIG.iterationBudget);
    const evaluationBudget = new EvaluationBudget();
    const searchBudget = new SearchTimeBudget(CONFIG.searchTimeBudget);
    const totalTimeBudget = new TotalTimeBudget(CONFIG.totalTimeBudget);
    const budgetManager = new BudgetManager();
    budgetManager.addBudget(iterationBudget);
    budgetManager.addBudget(evaluationBudget);
    budgetManager.addBudget(searchBudget);
    budgetManager.addBudget(totalTimeBudget);

    // Termination
    const terminationManager = new TerminationManager();

    CONFIG.terminationTriggers.forEach((trigger) => {
      terminationManager.addTrigger(
        (<TerminationPlugin<JavaScriptTestCase>>(
          ModuleManager.instance.getPlugin(PluginType.Termination, trigger)
        )).createTerminationTrigger({
          objectiveManager: objectiveManager,
          encodingSampler: sampler,
          runner: runner,
          crossover: crossover,
          populationSize: CONFIG.populationSize,
        })
      );
    });

    // Collector
    const collector = new StatisticsCollector(totalTimeBudget);
    collectInitialVariables(collector, currentSubject, targetPath);

    // Statistics listener
    const statisticsSearchListener = new StatisticsSearchListener(collector);
    algorithm.addListener(statisticsSearchListener);

    // This searches for a covering population
    const archive = await algorithm.search(
      currentSubject,
      budgetManager,
      terminationManager
    );

    if (this.coveredInPath.has(targetPath)) {
      archive.merge(this.coveredInPath.get(targetPath));
      this.coveredInPath.set(targetPath, archive);
    } else {
      this.coveredInPath.set(targetPath, archive);
    }

    // Gather statistics after the search
    collectStatistics(
      collector,
      currentSubject,
      archive,
      totalTimeBudget,
      searchBudget,
      iterationBudget,
      evaluationBudget
    );

    collector.recordVariable(RuntimeVariable.INSTRUMENTATION_TIME, `unknown`);

    collector.recordVariable(RuntimeVariable.TYPE_RESOLVING_TIME, `unknown`);

    collectCoverageData(collector, archive, "branch");
    collectCoverageData(collector, archive, "statement");
    collectCoverageData(collector, archive, "function");

    const statisticsDirectory = path.resolve(CONFIG.statisticsDirectory);

    const summaryWriter = new SummaryWriter();
    summaryWriter.write(collector, statisticsDirectory + "/statistics.csv");

    const coverageWriter = new CoverageWriter();
    coverageWriter.write(collector, statisticsDirectory + "/coverage.csv");

    await clearDirectory(CONFIG.tempTestDirectory);
    await clearDirectory(CONFIG.tempLogDirectory);

    return archive;
  }

  async exit(): Promise<void> {
    // Finish
    await deleteTempDirectories();

    process.exit(0);
  }
}
