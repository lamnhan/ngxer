import {yellow, grey, green} from 'chalk';
const ttyTable = require('tty-table');

import {OK, ERROR} from '../../lib/services/message.service';
import {ReportService} from '../../lib/services/report.service';

interface Options {
  detail?: boolean;
}

export class ReportCommand {
  constructor(private reportService: ReportService) {}

  async run(options: Options) {
    if (await this.reportService.exists()) {
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
          ['Path render', `Count: ${green(totalPathRender)}`],
          ['Database render', `Count: ${green(totalDatabaseRender)}`],
          ['Total count', green(totalPathRender + totalDatabaseRender)]
        );
      } else {
        table.push(
          [
            'Path render',
            `Count: ${green(totalPathRender)}` +
              (totalPathRender <= 0
                ? ''
                : grey('\n+ /' + pathRendering.join('\n+ /'))),
          ],
          [
            'Database render',
            `Count: ${green(totalDatabaseRender)}` +
              (totalDatabaseRender <= 0
                ? ''
                : grey('\n+ /' + databaseRendering.join('\n+ /'))),
          ],
          ['Total count', green(totalPathRender + totalDatabaseRender)]
        );
      }
      console.log(
        OK + 'Here your render report (add --detail for more detail):'
      );
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
