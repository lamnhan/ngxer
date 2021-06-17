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
   * @param inputs... - List of inputs to be updated
   */
  updateCommandDef: CommandDef = [
    ['update <inputs...>', 'u'],
    'Update a static.',
  ];

  /**
   * @param inputs... - List of inputs to be removed
   */
  removeCommandDef: CommandDef = [
    ['remove <inputs...>', 'r'],
    'Remove a generated content',
  ];

  reportCommandDef: CommandDef = [
    ['report', 's'],
    'Show generated statistics.',
    ['-c, --clear', 'Remove the report (when re-build app)'],
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
      this.ngxerModule.reportService
    );
    this.updateCommand = new UpdateCommand();
    this.removeCommand = new RemoveCommand(
      this.ngxerModule.fileService,
      this.ngxerModule.projectService,
      this.ngxerModule.cacheService
    );
    this.reportCommand = new ReportCommand(this.ngxerModule.reportService);
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
      const [[command, ...aliases], description] = this.updateCommandDef;
      commander
        .command(command)
        .aliases(aliases)
        .description(description)
        .action(inputs => this.updateCommand.run(inputs));
    })();

    // remove
    (() => {
      const [[command, ...aliases], description] = this.removeCommandDef;
      commander
        .command(command)
        .aliases(aliases)
        .description(description)
        .action(inputs => this.removeCommand.run(inputs));
    })();

    // report
    (() => {
      const [[command, ...aliases], description, clearOpt] =
        this.reportCommandDef;
      commander
        .command(command)
        .aliases(aliases)
        .description(description)
        .option(...clearOpt)
        .action(() => this.reportCommand.run());
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
