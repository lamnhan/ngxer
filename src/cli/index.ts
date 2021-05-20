import {red} from 'chalk';
import {Command} from 'commander';
import {Lib as NgxerModule} from '../lib/index';
import {GenerateCommand} from './commands/generate.command';

export class Cli {
  private ngxerModule: NgxerModule;
  generateCommand: GenerateCommand;

  commander = ['ngxer', 'Tool for prerendering Angular apps'];

  generateCommandDef: CommandDef = [
    ['generate', 'g'],
    'Generate static content.',
  ];

  constructor() {
    this.ngxerModule = new NgxerModule();
    this.generateCommand = new GenerateCommand();
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

    // generate
    (() => {
      const [[command, ...aliases], description] = this.generateCommandDef;
      commander
        .command(command)
        .aliases(aliases)
        .description(description)
        .action(() => this.generateCommand.run());
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
