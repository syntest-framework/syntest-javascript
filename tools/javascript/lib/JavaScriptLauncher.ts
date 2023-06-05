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
  TypeModelFactory,
  RandomTypeModelFactory,
  InferenceTypeModelFactory,
  Target,
  AbstractSyntaxTreeFactory,
  TargetFactory,
  RootContext,
  ControlFlowGraphFactory,
  ExportFactory,
  DependencyFactory,
  TypeExtractor,
  isExported,
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
  PropertyName,
} from "@syntest/base-language";
import {
  UserInterface,
  TableObject,
  ItemizationItem,
} from "@syntest/cli-graphics";
import { ModuleManager } from "@syntest/module";
import {
  JavaScriptTestCase,
  JavaScriptDecoder,
  JavaScriptRunner,
  JavaScriptSuiteBuilder,
  JavaScriptSubject,
  JavaScriptRandomSampler,
  JavaScriptTestCaseSampler,
  ExecutionInformationIntegrator,
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
  getSeed,
  initializePseudoRandomNumberGenerator,
} from "@syntest/search";
import { Instrumenter } from "@syntest/instrumentation-javascript";
import { getLogger, Logger } from "@syntest/logging";
import { TargetType } from "@syntest/analysis";
import { MetricManager } from "@syntest/metric";

export type JavaScriptArguments = ArgumentsObject & TestCommandOptions;
export class JavaScriptLauncher extends Launcher {
  private static LOGGER: Logger;

  private arguments_: JavaScriptArguments;
  private moduleManager: ModuleManager;
  private metricManager: MetricManager;
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
    metricManager: MetricManager,
    userInterface: UserInterface
  ) {
    super();
    JavaScriptLauncher.LOGGER = getLogger("JavaScriptLauncher");
    this.arguments_ = arguments_;
    this.moduleManager = moduleManager;
    this.metricManager = metricManager;
    this.userInterface = userInterface;
  }

  async initialize(): Promise<void> {
    JavaScriptLauncher.LOGGER.info("Initialization started");
    initializePseudoRandomNumberGenerator(this.arguments_.randomSeed);
    if (existsSync(this.arguments_.tempSyntestDirectory)) {
      JavaScriptLauncher.LOGGER.info("Cleaning up old directories");
      deleteDirectories([
        path.join(
          this.arguments_.tempSyntestDirectory,
          this.arguments_.tempTestDirectory
        ),
        path.join(
          this.arguments_.tempSyntestDirectory,
          this.arguments_.tempLogDirectory
        ),
        path.join(
          this.arguments_.tempSyntestDirectory,
          this.arguments_.tempInstrumentedDirectory
        ),
        this.arguments_.tempSyntestDirectory,
      ]);
    }

    JavaScriptLauncher.LOGGER.info("Creating directories");
    createDirectoryStructure([
      path.join(
        this.arguments_.syntestDirectory,
        this.arguments_.statisticsDirectory
      ),
      path.join(this.arguments_.syntestDirectory, this.arguments_.logDirectory),
      path.join(
        this.arguments_.syntestDirectory,
        this.arguments_.testDirectory
      ),
    ]);
    JavaScriptLauncher.LOGGER.info("Creating temp directories");
    createDirectoryStructure([
      path.join(
        this.arguments_.tempSyntestDirectory,
        this.arguments_.tempTestDirectory
      ),
      path.join(
        this.arguments_.tempSyntestDirectory,
        this.arguments_.tempLogDirectory
      ),
      path.join(
        this.arguments_.tempSyntestDirectory,
        this.arguments_.tempInstrumentedDirectory
      ),
    ]);

    const abstractSyntaxTreeFactory = new AbstractSyntaxTreeFactory();
    const targetFactory = new TargetFactory();
    const controlFlowGraphFactory = new ControlFlowGraphFactory();
    const dependencyFactory = new DependencyFactory();
    const exportFactory = new ExportFactory();
    const typeExtractor = new TypeExtractor();
    const typeResolver: TypeModelFactory =
      this.arguments_.typeInferenceMode === "none"
        ? new RandomTypeModelFactory()
        : new InferenceTypeModelFactory();

    this.rootContext = new RootContext(
      this.arguments_.targetRootDirectory,
      abstractSyntaxTreeFactory,
      controlFlowGraphFactory,
      targetFactory,
      dependencyFactory,
      exportFactory,
      typeExtractor,
      typeResolver
    );

    this.userInterface.printHeader("GENERAL INFO");

    // TODO ui info messages

    // this.userInterface.report("property-set", [
    //   "Target Settings",
    //   <string>(
    //     (<unknown>[["Target Root Directory", this.arguments_.targetRootDirectory]])
    //   ),
    // ]);
    this.metricManager.recordProperty(
      PropertyName.RANDOM_SEED,
      `${this.arguments_.randomSeed}`
    );
    this.metricManager.recordProperty(
      PropertyName.TARGET,
      `${this.arguments_.targetRootDirectory}`
    );
    this.metricManager.recordProperty(
      PropertyName.SEARCH_ALGORITHM,
      `${this.arguments_.searchAlgorithm}`
    );
    this.metricManager.recordProperty(
      PropertyName.SEARCH_EVALUATIONS,
      `${this.arguments_.evaluations}`
    );
    this.metricManager.recordProperty(
      PropertyName.SEARCH_ITERATIONS,
      `${this.arguments_.iterations}`
    );
    this.metricManager.recordProperty(
      PropertyName.CONSTANT_POOL_ENABLED,
      `${this.arguments_.constantPool}`
    );

    this.metricManager.recordProperty(
      PropertyName.SEARCH_TIME,
      `${this.arguments_.searchTime}`
    );
    this.metricManager.recordProperty(
      PropertyName.TOTAL_TIME,
      `${this.arguments_.totalTime}`
    );
    // this.metricManager.recordProperty(PropertyName.INITIALIZATION_TIME, `${this.arguments_.}`)

    JavaScriptLauncher.LOGGER.info("Initialization done");
  }

  async preprocess(): Promise<void> {
    JavaScriptLauncher.LOGGER.info("Preprocessing started");
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

    const itemization: ItemizationItem[] = [];

    for (const target of this.targets) {
      itemization.push({
        text: `${target.path}: ${target.name} #${target.subTargets.length}`,
        subItems: target.subTargets.map((subtarget) => {
          return {
            text: `${subtarget.type} ${subtarget.id}`,
          };
        }),
      });
    }

    this.userInterface.printItemization("TARGETS", itemization);

    const settings: TableObject = {
      headers: ["Setting", "Value"],
      rows: [
        ["Preset", this.arguments_.preset],
        ["Search Algorithm", this.arguments_.searchAlgorithm],
        ["Population Size", `${this.arguments_.populationSize}`],
        ["Objective Manager", `${this.arguments_.objectiveManager}`],
        ["Secondary Objectives", `${this.arguments_.secondaryObjectives}`],
        ["Procreation Operator", `${this.arguments_.procreation}`],
        ["Crossover Operator", `${this.arguments_.crossover}`],
        ["Sampling Operator", `${this.arguments_.sampler}`],
        ["Termination Triggers", `${this.arguments_.terminationTriggers}`],
        ["Test Minimization Enabled", `${this.arguments_.testMinimization}`],

        ["Seed", getSeed()],
      ],
      footers: ["", ""],
    };

    this.userInterface.printTable("SETTINGS", settings);

    const budgetSettings: TableObject = {
      headers: ["Setting", "Value"],
      rows: [
        ["Iteration Budget", `${this.arguments_.iterations} iterations`],
        ["Evaluation Budget", `${this.arguments_.evaluations} evaluations`],
        ["Search Time Budget", `${this.arguments_.searchTime} seconds`],
        ["Total Time Budget", `${this.arguments_.totalTime} seconds`],
      ],
      footers: ["", ""],
    };

    this.userInterface.printTable("BUDGET SETTINGS", budgetSettings);

    const mutationSettings: TableObject = {
      headers: ["Setting", "Value"],
      rows: [
        [
          "Resampling Probability",
          `${this.arguments_.resampleGeneProbability}`,
        ],
        [
          "Delta Mutation Probability",
          `${this.arguments_.deltaMutationProbability}`,
        ],
        [
          "Sample Existing Value Probability",
          `${this.arguments_.sampleExistingValueProbability}`,
        ],
        ["Crossover Probability", `${this.arguments_.crossoverProbability}`],
        [
          "Multi-point Crossover Probability",
          `${this.arguments_.multiPointCrossoverProbability}`,
        ],
        // sampling
        ["Max Depth", `${this.arguments_.maxDepth}`],
        ["Max Action Statements", `${this.arguments_.maxActionStatements}`],
        ["Explore Illegal Values", `${this.arguments_.exploreIllegalValues}`],
        [
          "Sample Output Values",
          `${this.arguments_.sampleFunctionOutputAsArgument}`,
        ],
        ["Use Constant Pool Values", `${this.arguments_.constantPool}`],
        [
          "Use Constant Pool Probability",
          `${this.arguments_.constantPoolProbability}`,
        ],
      ],
      footers: ["", ""],
    };
    this.userInterface.printTable("MUTATION SETTINGS", mutationSettings);

    const typeSettings: TableObject = {
      headers: ["Setting", "Value"],
      rows: [
        ["Type Inference Mode", `${this.arguments_.typeInferenceMode}`],
        [
          "Incorporate Execution Information",
          `${this.arguments_.incorporateExecutionInformation}`,
        ],
        ["Random Type Probability", `${this.arguments_.randomTypeProbability}`],
      ],
      footers: ["", ""],
    };
    this.userInterface.printTable("Type SETTINGS", typeSettings);

    const directorySettings: TableObject = {
      headers: ["Setting", "Value"],
      rows: [
        ["Syntest Directory", `${this.arguments_.syntestDirectory}`],
        ["Temporary Directory", `${this.arguments_.tempSyntestDirectory}`],
        ["Target Root Directory", `${this.arguments_.targetRootDirectory}`],
      ],
      footers: ["", ""],
    };

    this.userInterface.printTable("DIRECTORY SETTINGS", directorySettings);

    JavaScriptLauncher.LOGGER.info("Instrumenting targets");
    const instrumenter = new Instrumenter();
    await instrumenter.instrumentAll(
      this.rootContext,
      this.targets,
      path.join(
        this.arguments_.tempSyntestDirectory,
        this.arguments_.tempInstrumentedDirectory
      )
    );

    // this.metricManager.recordProperty(PropertyName.INSTRUMENTATION_TIME, `${this.arguments_.ins}`)

    JavaScriptLauncher.LOGGER.info("Extracting types");
    this.rootContext.extractTypes();
    JavaScriptLauncher.LOGGER.info("Resolving types");
    this.rootContext.resolveTypes();
    JavaScriptLauncher.LOGGER.info("Preprocessing done");

    // const maps = this.rootContext.getTypeModel().calculateProbabilitiesForFile(false, '/Users/dimitrist/Documents/git/syntest/syntest-javascript-benchmark/lodash/truncate.js')

    // for (const [id, map] of maps.entries()) {
    //   console.log(id)
    //   console.log(map)
    // }
    // eslint-disable-next-line unicorn/no-process-exit
    // process.exit(0)
  }

  async process(): Promise<void> {
    JavaScriptLauncher.LOGGER.info("Processing started");
    this.archive = new Archive<JavaScriptTestCase>();
    this.exports = [];
    this.dependencyMap = new Map();

    for (const target of this.targets) {
      JavaScriptLauncher.LOGGER.info(`Processing ${target.name}`);
      const archive = await this.testTarget(this.rootContext, target);

      const dependencies = this.rootContext.getDependencies(target.path);
      this.archive.merge(archive);

      this.dependencyMap.set(target.name, dependencies);
      this.exports.push(...this.rootContext.getExports(target.path));
    }
    JavaScriptLauncher.LOGGER.info("Processing done");
  }

  async postprocess(): Promise<void> {
    JavaScriptLauncher.LOGGER.info("Postprocessing started");
    const temporaryTestDirectory = path.join(
      this.arguments_.tempSyntestDirectory,
      this.arguments_.tempTestDirectory
    );
    const temporaryLogDirectory = path.join(
      this.arguments_.tempSyntestDirectory,
      this.arguments_.tempLogDirectory
    );

    const decoder = new JavaScriptDecoder(
      this.exports,
      this.arguments_.targetRootDirectory,
      temporaryLogDirectory
    );

    const executionInformationIntegrator = new ExecutionInformationIntegrator(
      this.rootContext.getTypeModel()
    );

    const runner = new JavaScriptRunner(
      decoder,
      executionInformationIntegrator,
      temporaryTestDirectory
    );

    const suiteBuilder = new JavaScriptSuiteBuilder(
      decoder,
      runner,
      temporaryLogDirectory
    );

    const reducedArchive = suiteBuilder.reduceArchive(this.archive);

    // TODO fix hardcoded paths
    let paths = suiteBuilder.createSuite(
      reducedArchive,
      "../instrumented",
      temporaryTestDirectory,
      true,
      false
    );
    await suiteBuilder.runSuite(paths);

    // reset states
    suiteBuilder.clearDirectory(temporaryTestDirectory);

    // run with assertions and report results
    for (const key of reducedArchive.keys()) {
      suiteBuilder.gatherAssertions(reducedArchive.get(key));
    }

    paths = suiteBuilder.createSuite(
      reducedArchive,
      "../instrumented",
      temporaryTestDirectory,
      false,
      true
    );
    const { stats, instrumentationData } = await suiteBuilder.runSuite(paths);

    if (stats.failures > 0) {
      this.userInterface.printError("Test case has failed!");
    }

    this.userInterface.printHeader("SEARCH RESULTS");

    const table: TableObject = {
      headers: ["Target", "Statement", "Branch", "Function", "File"],
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

    this.metricManager.recordProperty(
      PropertyName.BRANCHES_COVERED,
      `${overall["branch"]}`
    );
    this.metricManager.recordProperty(
      PropertyName.STATEMENTS_COVERED,
      `${overall["statement"]}`
    );
    this.metricManager.recordProperty(
      PropertyName.FUNCTIONS_COVERED,
      `${overall["function"]}`
    );
    this.metricManager.recordProperty(
      PropertyName.BRANCHES_TOTAL,
      `${totalBranches}`
    );
    this.metricManager.recordProperty(
      PropertyName.STATEMENTS_TOTAL,
      `${totalStatements}`
    );
    this.metricManager.recordProperty(
      PropertyName.FUNCTIONS_TOTAL,
      `${totalFunctions}`
    );

    this.metricManager.recordProperty(
      PropertyName.ARCHIVE_SIZE,
      `${this.archive.size}`
    );
    this.metricManager.recordProperty(
      PropertyName.MINIMIZED_ARCHIVE_SIZE,
      `${this.archive.size}`
    );

    overall["statement"] /= totalStatements;
    if (totalStatements === 0) overall["statement"] = 1;

    overall["branch"] /= totalBranches;
    if (totalBranches === 0) overall["branch"] = 1;

    overall["function"] /= totalFunctions;
    if (totalFunctions === 0) overall["function"] = 1;

    table.footers.push(
      overall["statement"] * 100 + " %",
      overall["branch"] * 100 + " %",
      overall["function"] * 100 + " %",
      ""
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
      path.join(
        this.arguments_.syntestDirectory,
        this.arguments_.testDirectory
      ),
      false,
      true
    );
    JavaScriptLauncher.LOGGER.info("Postprocessing done");
  }

  private async testTarget(
    rootContext: RootContext,
    target: Target
  ): Promise<Archive<JavaScriptTestCase>> {
    JavaScriptLauncher.LOGGER.info(
      `Testing target ${target.name} in ${target.path}`
    );
    const currentSubject = new JavaScriptSubject(target, this.rootContext);

    const rootTargets = currentSubject
      .getActionableTargets()
      .filter(
        (target) =>
          target.type === TargetType.FUNCTION ||
          target.type === TargetType.CLASS ||
          target.type === TargetType.OBJECT
      )
      .filter((target) => isExported(target));

    if (rootTargets.length === 0) {
      JavaScriptLauncher.LOGGER.info(
        `No actionable exported root targets found for ${target.name} in ${target.path}`
      );
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
    const executionInformationIntegrator = new ExecutionInformationIntegrator(
      this.rootContext.getTypeModel()
    );
    const runner = new JavaScriptRunner(
      decoder,
      executionInformationIntegrator,
      temporaryTestDirectory
    );

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

    suiteBuilder.clearDirectory(temporaryTestDirectory);

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
    const archive = await algorithm.search(
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

    clearDirectory(temporaryLogDirectory);
    clearDirectory(temporaryTestDirectory);

    JavaScriptLauncher.LOGGER.info(
      `Finished testing target ${target.name} in ${target.path}`
    );
    return archive;
  }

  async exit(): Promise<void> {
    JavaScriptLauncher.LOGGER.info("Exiting");
    // TODO should be cleanup step in tool
    // Finish
    JavaScriptLauncher.LOGGER.info("Deleting temporary directories");
    deleteDirectories([
      path.join(
        this.arguments_.tempSyntestDirectory,
        this.arguments_.tempTestDirectory
      ),
      path.join(
        this.arguments_.tempSyntestDirectory,
        this.arguments_.tempLogDirectory
      ),
      path.join(
        this.arguments_.tempSyntestDirectory,
        this.arguments_.tempInstrumentedDirectory
      ),
      this.arguments_.tempSyntestDirectory,
    ]);
  }
}
