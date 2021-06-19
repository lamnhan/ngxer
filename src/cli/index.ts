import {red} from 'chalk';
import {Command} from 'commander';
import {Lib as NgxerModule} from '../lib/index';
import {InitCommand} from './commands/init.command';
import {GenerateCommand} from './commands/generate.command';
import {UpdateCommand} from './commands/update.command';
import {RemoveCommand} from './commands/remove.command';
import {ReportCommand} from './commands/report.command';

export class Cli {
  private ngxerModule: NgxerModule;
  initCommand: InitCommand;
  generateCommand: GenerateCommand;
  updateCommand: UpdateCommand;
  removeCommand: RemoveCommand;
  reportCommand: ReportCommand;

  commander = ['ngxer', 'Tool for prerendering Angular apps'];

  /**
   * @param projectPath? - Custom path to the project
   */
  initCommandDef: CommandDef = [
    ['init [projectPath]', 'i'],
    'Add ngxer to a project.',
  ];

  generateCommandDef: CommandDef = [
    ['generate', 'g'],
    'Generate static content.',
  ];

  /**
   * @param paths... - List of paths to be updated
   */
  updateCommandDef: CommandDef = [
    ['update <paths...>', 'u'],
    'Update a static.',
    ['-l, --live', 'Re-rendering with live data.'],
  ];

  /**
   * @param paths... - List of paths to be removed
   */
  removeCommandDef: CommandDef = [
    ['remove <paths...>', 'x'],
    'Remove a generated content.',
    ['-k, --keep-cache', 'Remove HTML file, but keep cache.'],
  ];

  reportCommandDef: CommandDef = [
    ['report', 'r'],
    'Show generated statistics.',
    ['-d, --detail', 'Show detail.'],
  ];

  constructor() {
    this.ngxerModule = new NgxerModule();
    this.initCommand = new InitCommand(
      this.ngxerModule.fileService,
      this.ngxerModule.projectService
    );
    this.generateCommand = new GenerateCommand(
      this.ngxerModule.fileService,
      this.ngxerModule.projectService,
      this.ngxerModule.cacheService,
      this.ngxerModule.htmlService,
      this.ngxerModule.renderService,
      this.ngxerModule.firebaseService,
      this.ngxerModule.reportService,
      this.ngxerModule.sitemapService
    );
    this.updateCommand = new UpdateCommand(
      this.ngxerModule.projectService,
      this.ngxerModule.renderService,
      this.ngxerModule.reportService,
      this.ngxerModule.sitemapService,
      this.generateCommand
    );
    this.removeCommand = new RemoveCommand(
      this.ngxerModule.fileService,
      this.ngxerModule.projectService,
      this.ngxerModule.renderService,
      this.ngxerModule.cacheService,
      this.ngxerModule.reportService,
      this.ngxerModule.sitemapService,
      this.generateCommand
    );
    this.reportCommand = new ReportCommand(
      this.ngxerModule.projectService,
      this.ngxerModule.reportService
    );
  }

  getApp() {
    const commander = new Command();

    // general
    const [command, description] = this.commander;
    commander
      .version(require('../../package.json').version, '-v, --version')
      .name(`${command}`)
      .usage('[options] [command]')
      .description(description);

    // init
    (() => {
      const [[command, ...aliases], description] = this.initCommandDef;
      commander
        .command(command)
        .aliases(aliases)
        .description(description)
        .action(projectPath => this.initCommand.run(projectPath));
    })();

    // generate
    (() => {
      const [[command, ...aliases], description] = this.generateCommandDef;
      commander
        .command(command)
        .aliases(aliases)
        .description(description)
        .action(() => this.generateCommand.run());
    })();

    // update
    (() => {
      const [[command, ...aliases], description, liveOpt] =
        this.updateCommandDef;
      commander
        .command(command)
        .aliases(aliases)
        .description(description)
        .option(...liveOpt)
        .action((paths, options) => this.updateCommand.run(paths, options));
    })();

    // remove
    (() => {
      const [[command, ...aliases], description, keepCacheOpt] =
        this.removeCommandDef;
      commander
        .command(command)
        .aliases(aliases)
        .description(description)
        .option(...keepCacheOpt)
        .action((paths, options) => this.removeCommand.run(paths, options));
    })();

    // report
    (() => {
      const [[command, ...aliases], description, detailOpt] =
        this.reportCommandDef;
      commander
        .command(command)
        .aliases(aliases)
        .description(description)
        .option(...detailOpt)
        .action(options => this.reportCommand.run(options));
    })();

    // help
    commander
      .command('help')
      .description('Display help.')
      .action(() => commander.outputHelp());

    // *
    commander
      .command('*')
      .description('Any other command is not supported.')
      .action(cmd => console.error(red(`Unknown command '${cmd.args[0]}'`)));

    return commander;
  }
}

type CommandDef = [string | string[], string, ...Array<[string, string]>];
