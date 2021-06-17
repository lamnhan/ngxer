import {yellow, grey, green} from 'chalk';
const ttyTable = require('tty-table');

import {OK, ERROR} from '../../lib/services/message.service';
import {ReportService} from '../../lib/services/report.service';

interface Options {
  detail?: boolean;
  clear?: boolean;
}

export class ReportCommand {
  constructor(private reportService: ReportService) {}

  async run(options: Options) {
    if (options.clear) {
      await this.reportService.remove();
      console.log(OK + 'Cleared render report.');
    } else if (await this.reportService.exists()) {
      const {timestamp, pathRendering, databaseRendering} =
        await this.reportService.read();
      const table = ttyTable(
        [
          {value: 'Name', width: 50, align: 'left'},
          {value: 'Value', width: 100, align: 'left'},
        ],
        []
      );
      const totalPathRender = pathRendering.length;
      const totalDatabaseRender = databaseRendering.length;
      if (!options.detail) {
        table.push(
          ['Path render', green(totalPathRender)],
          ['Database render', green(totalDatabaseRender)],
          ['Total', green(totalPathRender + totalDatabaseRender)]
        );
      } else {
        table.push(
          [
            'Path render',
            `Count: ${green(totalPathRender)}` +
              '\n' +
              pathRendering.join('\n'),
          ],
          [
            'Database render',
            `Count: ${green(totalDatabaseRender)}` +
              '\n' +
              databaseRendering.join('\n'),
          ],
          ['Total', green(totalPathRender + totalDatabaseRender)]
        );
      }
      console.log(OK + 'Here your render report:');
      console.log(table.render());
      console.log('   Latest updated: ' + grey(new Date(timestamp)));
    } else {
      console.log(
        ERROR +
          'No report available, generate content first: $ ' +
          yellow('ngxer generate')
      );
    }
  }
}
