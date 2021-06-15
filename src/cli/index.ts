import {red} from 'chalk';
import {Command} from 'commander';
import {Lib as NgxerModule} from '../lib/index';
import {InitCommand} from './commands/init.command';
import {GenerateCommand} from './commands/generate.command';
import {RemoveCommand} from './commands/remove.command';

export class Cli {
  private ngxerModule: NgxerModule;
  initCommand: InitCommand;
  generateCommand: GenerateCommand;
  removeCommand: RemoveCommand;

  commander = ['ngxer', 'Tool for prerendering Angular apps'];

  /**
   * @param path? - Custom path to the project
   */
  initCommandDef: CommandDef = [
    ['init [path]', 'i'],
    'Add ngxer to a project.',
  ];

  /**
   * @param paths...? - List of path rendering
   */
  generateCommandDef: CommandDef = [
    ['generate [paths...]', 'g'],
    'Generate static content.',
  ];

  /**
   * @param path - Path to be removed
   */
  removeCommandDef: CommandDef = [
    ['remove <path>', 'r'],
    'Remove a generated content',
  ];

  constructor() {
    this.ngxerModule = new NgxerModule();
    this.initCommand = new InitCommand(
      this.ngxerModule.fileService,
      this.ngxerModule.projectService
    );
    this.generateCommand = new GenerateCommand(
      this.ngxerModule.helperService,
      this.ngxerModule.fileService,
      this.ngxerModule.projectService,
      this.ngxerModule.renderService
    );
    this.removeCommand = new RemoveCommand(
      this.ngxerModule.fileService,
      this.ngxerModule.projectService
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
        .action(path => this.initCommand.run(path));
    })();

    // generate
    (() => {
      const [[command, ...aliases], description] = this.generateCommandDef;
      commander
        .command(command)
        .aliases(aliases)
        .description(description)
        .action(paths => this.generateCommand.run(paths));
    })();

    // remove
    (() => {
      const [[command, ...aliases], description] = this.removeCommandDef;
      commander
        .command(command)
        .aliases(aliases)
        .description(description)
        .action(path => this.removeCommand.run(path));
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
