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

import { existsSync } from "node:fs";
import * as path from "node:path";

import {
  collectCoverageData,
  collectInitialVariables,
  collectStatistics,
} from "./collection";
import { TestCommandOptions } from "./commands/test";
import {
  Export,
  TypeResolver,
  TypeResolverUnknown,
  TypeResolverInference,
  Target,
  AbstractSyntaxTreeFactory,
  TargetFactory,
  RootContext,
  ControlFlowGraphFactory,
  ExportFactory,
  DependencyFactory,
} from "@syntest/analysis-javascript";
import {
  ArgumentsObject,
  Launcher,
  createDirectoryStructure,
  CONFIG,
  clearDirectory,
  ObjectiveManagerPlugin,
  CrossoverPlugin,
  SearchAlgorithmPlugin,
  createTemporaryDirectoryStructure,
  deleteTemporaryDirectories,
  TargetSelector,
  PluginType,
  SecondaryObjectivePlugin,
  ProcreationPlugin,
  TerminationTriggerPlugin,
} from "@syntest/base-testing-tool";
import { UserInterface, TableObject } from "@syntest/cli-graphics";
import { ModuleManager } from "@syntest/module";
import {
  JavaScriptTestCase,
  JavaScriptDecoder,
  JavaScriptRunner,
  JavaScriptSuiteBuilder,
  JavaScriptSubject,
  JavaScriptRandomSampler,
  JavaScriptTestCaseSampler,
} from "@syntest/search-javascript";
import {
  Archive,
  BudgetManager,
  BudgetType,
  EncodingSampler,
  EvaluationBudget,
  IterationBudget,
  SearchTimeBudget,
  TerminationManager,
  TotalTimeBudget,
} from "@syntest/core";
import { Instrumenter } from "@syntest/instrumentation-javascript";

export type JavaScriptArguments = ArgumentsObject & TestCommandOptions;
export class JavaScriptLauncher extends Launcher {
  private moduleManager: ModuleManager;
  private userInterface: UserInterface;

  private targets: Target[];

  private rootContext: RootContext;
  private archive: Archive<JavaScriptTestCase>;

  private exports: Export[];
  private dependencyMap: Map<string, string[]>;

  private coveredInPath = new Map<string, Archive<JavaScriptTestCase>>();

  constructor(moduleManager: ModuleManager, userInterface: UserInterface) {
    super();
    this.moduleManager = moduleManager;
    this.userInterface = userInterface;
  }

  async initialize(): Promise<void> {
    if (existsSync(".syntest")) {
      deleteTemporaryDirectories();
    }

    createDirectoryStructure();
    createTemporaryDirectoryStructure();

    const abstractSyntaxTreeFactory = new AbstractSyntaxTreeFactory();
    const targetFactory = new TargetFactory();

    const typeResolver: TypeResolver =
      (<JavaScriptArguments>CONFIG).typeInferenceMode === "none"
        ? new TypeResolverUnknown()
        : new TypeResolverInference();

    const controlFlowGraphFactory = new ControlFlowGraphFactory();
    const dependencyFactory = new DependencyFactory();
    const exportFactory = new ExportFactory();
    this.rootContext = new RootContext(
      (<JavaScriptArguments>CONFIG).targetRootDirectory,
      abstractSyntaxTreeFactory,
      controlFlowGraphFactory,
      targetFactory,
      dependencyFactory,
      exportFactory,
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
    const targetSelector = new TargetSelector(this.rootContext);
    this.targets = targetSelector.loadTargets(CONFIG.include, CONFIG.exclude);

    if (this.targets.length === 0) {
      // Shut server down
      this.userInterface.printError(
        `No targets where selected! Try changing the 'include' parameter`
      );
      await this.exit();
    }

    const names: string[] = [];

    for (const target of this.targets) {
      names.push(`${path.basename(target.path)} -> ${target.name}`);
    }

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

    const instrumented = new Instrumenter();
    instrumented.instrumentAll(
      this.rootContext,
      CONFIG.tempInstrumentedDirectory
    );

    // TODO types
    // await this.rootContext.scanTargetRootDirectory(CONFIG.targetRootDirectory);
  }

  async process(): Promise<void> {
    this.archive = new Archive<JavaScriptTestCase>();
    this.exports = [];
    this.dependencyMap = new Map();

    for (const target of this.targets) {
      const archive = await this.testTarget(this.rootContext, target.path);

      const dependencies = this.rootContext.getDependencies(target.path);
      this.archive.merge(archive);

      this.dependencyMap.set(target.name, dependencies);
      this.exports.push(...this.rootContext.getExports(target.path));
    }
  }

  async postprocess(): Promise<void> {
    const testDirectory = path.join(
      CONFIG.syntestDirectory,
      CONFIG.testDirectory
    );
    const temporaryTestDirectory = path.join(
      CONFIG.tempSyntestDirectory,
      CONFIG.tempTestDirectory
    );
    const temporaryLogDirectory = path.join(
      CONFIG.tempSyntestDirectory,
      CONFIG.tempLogDirectory
    );

    clearDirectory(testDirectory);

    const decoder = new JavaScriptDecoder(
      this.exports,
      CONFIG.targetRootDirectory,
      temporaryLogDirectory
    );
    const runner = new JavaScriptRunner(decoder, temporaryTestDirectory);

    const suiteBuilder = new JavaScriptSuiteBuilder(
      decoder,
      runner,
      temporaryLogDirectory
    );

    // TODO fix hardcoded paths

    const reducedArchive = suiteBuilder.reduceArchive(this.archive);

    let paths = suiteBuilder.createSuite(
      reducedArchive,
      "../instrumented",
      CONFIG.tempTestDirectory,
      true,
      false
    );
    await suiteBuilder.runSuite(paths);

    // reset states
    suiteBuilder.clearDirectory(CONFIG.tempTestDirectory);

    // run with assertions and report results
    for (const key of reducedArchive.keys()) {
      suiteBuilder.gatherAssertions(reducedArchive.get(key));
    }

    paths = suiteBuilder.createSuite(
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
      const target = this.targets.find(
        (target: Target) => target.path === file
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
        `${path.basename(target.path)}: ${target.name}`,
        summary["statement"] + " / " + Object.keys(data.s).length,
        summary["branch"] + " / " + Object.keys(data.b).length * 2,
        summary["function"] + " / " + Object.keys(data.f).length,
        target.path,
      ]);
    }

    overall["statement"] /= totalStatements;
    overall["branch"] /= totalBranches;
    overall["function"] /= totalFunctions;

    table.footers.push(
      overall["statement"] * 100 + " %",
      overall["branch"] * 100 + " %",
      overall["function"] * 100 + " %"
    );

    const originalSourceDirectory = path
      .join("../../", path.relative(process.cwd(), CONFIG.targetRootDirectory))
      .replace(path.basename(CONFIG.targetRootDirectory), "");

    this.userInterface.printTable("Coverage", table);

    // create final suite
    suiteBuilder.createSuite(
      reducedArchive,
      originalSourceDirectory,
      CONFIG.testDirectory,
      false,
      true
    );
  }

  private async testTarget(
    rootContext: RootContext,
    target: Target
  ): Promise<Archive<JavaScriptTestCase>> {
    const cfg = rootContext.getControlFlowProgram(target.path);

    const functionMap = rootContext.getFunctionMapSpecific(
      target.path,
      targetMeta.name
    );

    // couple types to parameters
    // TODO do this type matching already in the target visitor
    for (const function_ of functionMap.values()) {
      for (const parameter of function_.parameters) {
        if (function_.type === ActionType.FUNCTION) {
          parameter.typeProbabilityMap = rootContext.typeResolver.getTyping(
            function_.scope,
            parameter.name
          );
        } else if (
          function_.type === ActionType.METHOD ||
          function_.type === ActionType.GET ||
          function_.type === ActionType.SET ||
          function_.type === ActionType.CONSTRUCTOR
        ) {
          parameter.typeProbabilityMap = rootContext.typeResolver.getTyping(
            function_.scope,
            parameter.name
          );
        } else {
          throw new Error(
            `Unimplemented action identifierDescription ${function_.type}`
          );
        }
      }

      // TODO return types
    }

    const currentSubject = new JavaScriptSubject(target, this.rootContext);

    if (currentSubject.getActionableTargets().length === 0) {
      // report skipped
      return new Archive();
    }

    const dependencies = rootContext.getDependencies(target.path);
    const dependencyMap = new Map<string, string[]>();
    dependencyMap.set(target.name, dependencies);
    const exports = rootContext.getExports(target.path);

    const temporaryTestDirectory = path.join(
      CONFIG.tempSyntestDirectory,
      CONFIG.tempTestDirectory
    );
    const temporaryLogDirectory = path.join(
      CONFIG.tempSyntestDirectory,
      CONFIG.tempLogDirectory
    );

    const decoder = new JavaScriptDecoder(
      exports,
      CONFIG.targetRootDirectory,
      temporaryLogDirectory
    );
    const runner = new JavaScriptRunner(decoder, temporaryTestDirectory);

    const suiteBuilder = new JavaScriptSuiteBuilder(
      decoder,
      runner,
      temporaryLogDirectory
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
      rootContext
    );

    const secondaryObjectives = new Set(
      CONFIG.secondaryObjectives.map((secondaryObjective) => {
        return (<SecondaryObjectivePlugin<JavaScriptTestCase>>(
          this.moduleManager.getPlugin(
            PluginType.SecondaryObjective,
            secondaryObjective
          )
        )).createSecondaryObjective();
      })
    );

    const objectiveManager = (<ObjectiveManagerPlugin<JavaScriptTestCase>>(
      this.moduleManager.getPlugin(
        PluginType.ObjectiveManager,
        CONFIG.objectiveManager
      )
    )).createObjectiveManager({
      runner: runner,
      secondaryObjectives: secondaryObjectives,
    });

    const crossover = (<CrossoverPlugin<JavaScriptTestCase>>(
      this.moduleManager.getPlugin(PluginType.Crossover, CONFIG.crossover)
    )).createCrossoverOperator({
      crossoverEncodingProbability: CONFIG.crossoverProbability,
      crossoverStatementProbability: CONFIG.multiPointCrossoverProbability,
    });

    const procreation = (<ProcreationPlugin<JavaScriptTestCase>>(
      this.moduleManager.getPlugin(PluginType.Crossover, CONFIG.crossover)
    )).createProcreationOperator({
      crossover: crossover,
      mutateFunction: (
        sampler: EncodingSampler<JavaScriptTestCase>,
        encoding: JavaScriptTestCase
      ) => {
        return encoding.mutate(<JavaScriptTestCaseSampler>(<unknown>sampler));
      },
      sampler: sampler,
    });

    const algorithm = (<SearchAlgorithmPlugin<JavaScriptTestCase>>(
      this.moduleManager.getPlugin(
        PluginType.SearchAlgorithm,
        CONFIG.searchAlgorithm
      )
    )).createSearchAlgorithm({
      objectiveManager: objectiveManager,
      encodingSampler: sampler,
      procreation: procreation,
      populationSize: CONFIG.populationSize,
    });

    await suiteBuilder.clearDirectory(CONFIG.tempTestDirectory);

    // allocate budget manager
    const iterationBudget = new IterationBudget(CONFIG.iterations);
    const evaluationBudget = new EvaluationBudget(CONFIG.evaluations);
    const searchBudget = new SearchTimeBudget(CONFIG.searchTime);
    const totalTimeBudget = new TotalTimeBudget(CONFIG.totalTime);
    const budgetManager = new BudgetManager();
    budgetManager.addBudget(BudgetType.ITERATION, iterationBudget);
    budgetManager.addBudget(BudgetType.EVALUATION, evaluationBudget);
    budgetManager.addBudget(BudgetType.SEARCH_TIME, searchBudget);
    budgetManager.addBudget(BudgetType.TOTAL_TIME, totalTimeBudget);

    // Termination
    const terminationManager = new TerminationManager();

    for (const trigger of CONFIG.terminationTriggers) {
      terminationManager.addTrigger(
        (<TerminationTriggerPlugin>(
          this.moduleManager.getPlugin(PluginType.TerminationTrigger, trigger)
        )).createTerminationTrigger({
          objectiveManager: objectiveManager,
          encodingSampler: sampler,
          runner: runner,
          crossover: crossover,
          populationSize: CONFIG.populationSize,
        })
      );
    }

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
    // TODO should be cleanup step in tool
    // Finish
    await deleteTempDirectories();
  }
}
