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
  clearDirectory,
  ObjectiveManagerPlugin,
  CrossoverPlugin,
  SearchAlgorithmPlugin,
  TargetSelector,
  PluginType,
  SecondaryObjectivePlugin,
  ProcreationPlugin,
  TerminationTriggerPlugin,
  deleteDirectories,
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
  initializePseudoRandomNumberGenerator,
} from "@syntest/core";
import { Instrumenter } from "@syntest/instrumentation-javascript";

export type JavaScriptArguments = ArgumentsObject & TestCommandOptions;
export class JavaScriptLauncher extends Launcher {
  private arguments_: JavaScriptArguments;
  private moduleManager: ModuleManager;
  private userInterface: UserInterface;

  private targets: Target[];

  private rootContext: RootContext;
  private archive: Archive<JavaScriptTestCase>;

  private exports: Export[];
  private dependencyMap: Map<string, string[]>;

  private coveredInPath = new Map<string, Archive<JavaScriptTestCase>>();

  constructor(
    arguments_: JavaScriptArguments,
    moduleManager: ModuleManager,
    userInterface: UserInterface
  ) {
    super();
    this.arguments_ = arguments_;
    this.moduleManager = moduleManager;
    this.userInterface = userInterface;
  }

  async initialize(): Promise<void> {
    initializePseudoRandomNumberGenerator(this.arguments_.randomSeed);
    if (existsSync(".syntest")) {
      deleteDirectories([
        this.arguments_.tempTestDirectory,
        this.arguments_.tempLogDirectory,
        this.arguments_.tempInstrumentedDirectory,
        this.arguments_.tempSyntestDirectory,
      ]);
    }

    createDirectoryStructure([
      this.arguments_.statisticsDirectory,
      this.arguments_.logDirectory,
      this.arguments_.testDirectory,
    ]);
    createDirectoryStructure([
      this.arguments_.tempTestDirectory,
      this.arguments_.tempLogDirectory,
      this.arguments_.tempInstrumentedDirectory,
      this.arguments_.tempSyntestDirectory,
    ]);

    const abstractSyntaxTreeFactory = new AbstractSyntaxTreeFactory();
    const targetFactory = new TargetFactory();

    const typeResolver: TypeResolver =
      this.arguments_.typeInferenceMode === "none"
        ? new TypeResolverUnknown()
        : new TypeResolverInference();

    const controlFlowGraphFactory = new ControlFlowGraphFactory();
    const dependencyFactory = new DependencyFactory();
    const exportFactory = new ExportFactory();
    this.rootContext = new RootContext(
      this.arguments_.targetRootDirectory,
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
    //     (<unknown>[["Target Root Directory", this.arguments_.targetRootDirectory]])
    //   ),
    // ]);
  }

  async preprocess(): Promise<void> {
    const targetSelector = new TargetSelector(this.rootContext);
    this.targets = targetSelector.loadTargets(
      this.arguments_.include,
      this.arguments_.exclude
    );

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

    // this.userInterface.report("header", ["this.arguments_URATION"]);

    // this.userInterface.report("single-property", ["Seed", getSeed()]);
    // this.userInterface.report("property-set", ["Budgets", <string>(<unknown>[
    //     ["Iteration Budget", `${this.arguments_.iterationBudget} iterations`],
    //     ["Evaluation Budget", `${this.arguments_.evaluationBudget} evaluations`],
    //     ["Search Time Budget", `${this.arguments_.searchTimeBudget} seconds`],
    //     ["Total Time Budget", `${this.arguments_.totalTimeBudget} seconds`],
    //   ])]);
    // this.userInterface.report("property-set", ["Algorithm", <string>(<unknown>[
    //     ["Algorithm", this.arguments_.algorithm],
    //     ["Population Size", this.arguments_.populationSize],
    //   ])]);
    // this.userInterface.report("property-set", [
    //   "Variation Probabilities",
    //   <string>(<unknown>[
    //     ["Resampling", this.arguments_.resampleGeneProbability],
    //     ["Delta mutation", this.arguments_.deltaMutationProbability],
    //     ["Re-sampling from chromosome", this.arguments_.sampleExistingValueProbability],
    //     ["Crossover", this.arguments_.crossoverProbability],
    //   ]),
    // ]);

    // this.userInterface.report("property-set", ["Sampling", <string>(<unknown>[
    //     ["Max Depth", this.arguments_.maxDepth],
    //     ["Explore Illegal Values", this.arguments_.exploreIllegalValues],
    //     [
    //       "Sample FUNCTION Result as Argument",
    //       this.arguments_.sampleFunctionOutputAsArgument,
    //     ],
    //     ["Crossover", this.arguments_.crossoverProbability],
    //   ])]);

    // this.userInterface.report("property-set", ["Type Inference", <string>(<
    //     unknown
    //   >[
    //     [
    //       "Incorporate Execution Information",
    //       this.arguments_.incorporateExecutionInformation,
    //     ],
    //     [
    //       "Type Inference Mode",
    //       this.arguments_.typeInferenceMode,
    //     ],
    //     [
    //       "Random Type Probability",
    //       this.arguments_.randomTypeProbability,
    //     ],
    //   ])]);

    const instrumented = new Instrumenter();
    instrumented.instrumentAll(
      this.rootContext,
      this.targets,
      this.arguments_.tempInstrumentedDirectory
    );

    // TODO types
    // await this.rootContext.scanTargetRootDirectory(this.arguments_.targetRootDirectory);
  }

  async process(): Promise<void> {
    this.archive = new Archive<JavaScriptTestCase>();
    this.exports = [];
    this.dependencyMap = new Map();

    for (const target of this.targets) {
      const archive = await this.testTarget(this.rootContext, target);

      const dependencies = this.rootContext.getDependencies(target.path);
      this.archive.merge(archive);

      this.dependencyMap.set(target.name, dependencies);
      this.exports.push(...this.rootContext.getExports(target.path));
    }
  }

  async postprocess(): Promise<void> {
    const testDirectory = path.join(
      this.arguments_.syntestDirectory,
      this.arguments_.testDirectory
    );
    const temporaryTestDirectory = path.join(
      this.arguments_.tempSyntestDirectory,
      this.arguments_.tempTestDirectory
    );
    const temporaryLogDirectory = path.join(
      this.arguments_.tempSyntestDirectory,
      this.arguments_.tempLogDirectory
    );

    clearDirectory(testDirectory);

    const decoder = new JavaScriptDecoder(
      this.exports,
      this.arguments_.targetRootDirectory,
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
      this.arguments_.tempTestDirectory,
      true,
      false
    );
    await suiteBuilder.runSuite(paths);

    // reset states
    suiteBuilder.clearDirectory(this.arguments_.tempTestDirectory);

    // run with assertions and report results
    for (const key of reducedArchive.keys()) {
      suiteBuilder.gatherAssertions(reducedArchive.get(key));
    }

    paths = suiteBuilder.createSuite(
      reducedArchive,
      "../instrumented",
      this.arguments_.tempTestDirectory,
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
      .join(
        "../../",
        path.relative(process.cwd(), this.arguments_.targetRootDirectory)
      )
      .replace(path.basename(this.arguments_.targetRootDirectory), "");

    this.userInterface.printTable("Coverage", table);

    // create final suite
    suiteBuilder.createSuite(
      reducedArchive,
      originalSourceDirectory,
      this.arguments_.testDirectory,
      false,
      true
    );
  }

  private async testTarget(
    rootContext: RootContext,
    target: Target
  ): Promise<Archive<JavaScriptTestCase>> {
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
      this.arguments_.tempSyntestDirectory,
      this.arguments_.tempTestDirectory
    );
    const temporaryLogDirectory = path.join(
      this.arguments_.tempSyntestDirectory,
      this.arguments_.tempLogDirectory
    );

    const decoder = new JavaScriptDecoder(
      exports,
      this.arguments_.targetRootDirectory,
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
      this.arguments_.typeInferenceMode,
      this.arguments_.randomTypeProbability,
      this.arguments_.incorporateExecutionInformation,
      this.arguments_.maxActionStatements,
      this.arguments_.stringAlphabet,
      this.arguments_.stringMaxLength,
      this.arguments_.resampleGeneProbability,
      this.arguments_.deltaMutationProbability,
      this.arguments_.exploreIllegalValues
    );

    sampler.rootContext = rootContext;

    const secondaryObjectives = new Set(
      this.arguments_.secondaryObjectives.map((secondaryObjective) => {
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
        this.arguments_.objectiveManager
      )
    )).createObjectiveManager({
      runner: runner,
      secondaryObjectives: secondaryObjectives,
    });

    const crossover = (<CrossoverPlugin<JavaScriptTestCase>>(
      this.moduleManager.getPlugin(
        PluginType.Crossover,
        this.arguments_.crossover
      )
    )).createCrossoverOperator({
      crossoverEncodingProbability: this.arguments_.crossoverProbability,
      crossoverStatementProbability:
        this.arguments_.multiPointCrossoverProbability,
    });

    const procreation = (<ProcreationPlugin<JavaScriptTestCase>>(
      this.moduleManager.getPlugin(
        PluginType.Procreation,
        this.arguments_.procreation
      )
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
        this.arguments_.searchAlgorithm
      )
    )).createSearchAlgorithm({
      objectiveManager: objectiveManager,
      encodingSampler: sampler,
      procreation: procreation,
      populationSize: this.arguments_.populationSize,
    });

    suiteBuilder.clearDirectory(this.arguments_.tempTestDirectory);

    // allocate budget manager
    const iterationBudget = new IterationBudget(this.arguments_.iterations);
    const evaluationBudget = new EvaluationBudget(this.arguments_.evaluations);
    const searchBudget = new SearchTimeBudget(this.arguments_.searchTime);
    const totalTimeBudget = new TotalTimeBudget(this.arguments_.totalTime);
    const budgetManager = new BudgetManager();
    budgetManager.addBudget(BudgetType.ITERATION, iterationBudget);
    budgetManager.addBudget(BudgetType.EVALUATION, evaluationBudget);
    budgetManager.addBudget(BudgetType.SEARCH_TIME, searchBudget);
    budgetManager.addBudget(BudgetType.TOTAL_TIME, totalTimeBudget);

    // Termination
    const terminationManager = new TerminationManager();

    for (const trigger of this.arguments_.terminationTriggers) {
      terminationManager.addTrigger(
        (<TerminationTriggerPlugin>(
          this.moduleManager.getPlugin(PluginType.TerminationTrigger, trigger)
        )).createTerminationTrigger({
          objectiveManager: objectiveManager,
          encodingSampler: sampler,
          runner: runner,
          crossover: crossover,
          populationSize: this.arguments_.populationSize,
        })
      );
    }

    // This searches for a covering population
    const archive = algorithm.search(
      currentSubject,
      budgetManager,
      terminationManager
    );

    if (this.coveredInPath.has(target.path)) {
      archive.merge(this.coveredInPath.get(target.path));
      this.coveredInPath.set(target.path, archive);
    } else {
      this.coveredInPath.set(target.path, archive);
    }

    clearDirectory(this.arguments_.tempTestDirectory);
    clearDirectory(this.arguments_.tempLogDirectory);

    return archive;
  }

  async exit(): Promise<void> {
    // TODO should be cleanup step in tool
    // Finish
    deleteDirectories([
      this.arguments_.tempTestDirectory,
      this.arguments_.tempLogDirectory,
      this.arguments_.tempInstrumentedDirectory,
      this.arguments_.tempSyntestDirectory,
    ]);
  }
}
