import {yellow, grey, green} from 'chalk';
const ttyTable = require('tty-table');

import {OK, ERROR} from '../../lib/services/message.service';
import {ProjectService} from '../../lib/services/project.service';
import {ReportService} from '../../lib/services/report.service';

interface Options {
  detail?: boolean;
}

export class ReportCommand {
  constructor(
    private projectService: ProjectService,
    private reportService: ReportService
  ) {}

  async run(options: Options) {
    const {out} = await this.projectService.loadDotNgxerRCDotJson();
    if (
      (await this.projectService.isValidOutDir(out)) &&
      (await this.reportService.exists())
    ) {
      const {timestamp, indexRendering, pathRendering, databaseRendering} =
        await this.reportService.read();
      console.log(OK + 'Render report (add --detail for more detail):');
      this.outputReport(
        indexRendering,
        pathRendering,
        databaseRendering,
        timestamp,
        options.detail
      );
    } else {
      console.log(
        ERROR +
          'No report available, generate content first: $ ' +
          yellow('ngxer generate')
      );
    }
  }

  outputReport(
    indexRendering: string[],
    pathRendering: string[],
    databaseRendering: string[],
    timestamp?: string,
    detail = false
  ) {
    const table = ttyTable(
      [
        {value: 'Database render', width: 100, align: 'left'},
        {value: 'Path render', width: 100, align: 'left'},
        {value: 'Index render', width: 100, align: 'left'},
      ],
      []
    );
    const totalIndexRender = indexRendering.length;
    const totalPathRender = pathRendering.length;
    const totalDatabaseRender = databaseRendering.length;
    if (!detail) {
      table.push([
        `Count: ${green(totalDatabaseRender)}`,
        `Count: ${green(totalPathRender)}`,
        `Count: ${green(totalIndexRender)}`,
      ]);
    } else {
      table.push([
        `Count: ${green(totalDatabaseRender)}` +
          (totalDatabaseRender <= 0
            ? ''
            : grey('\n+ ' + databaseRendering.join('\n+ '))),
        `Count: ${green(totalPathRender)}` +
          (totalPathRender <= 0
            ? ''
            : grey('\n+ ' + pathRendering.join('\n+ '))),
        `Count: ${green(totalIndexRender)}` +
          (totalIndexRender <= 0
            ? ''
            : grey('\n+ /' + indexRendering.join('\n+ '))),
      ]);
    }
    console.log(table.render());
    console.log(
      '   Total count: ' +
        green(totalIndexRender + totalPathRender + totalDatabaseRender)
    );
    console.log(
      '   Latest updated: ' + grey(timestamp ? new Date(timestamp) : new Date())
    );
  }
}
