import {red} from 'chalk';
import {Command} from 'commander';
import {Lib as NgxerModule} from '../lib/index';

export class Cli {
  private ngxerModule: NgxerModule;

  commander = ['ngxer', 'Tool for prerendering Angular apps'];

  constructor() {
    this.ngxerModule = new NgxerModule();
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
