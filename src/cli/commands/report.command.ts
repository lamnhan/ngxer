import {yellow} from 'chalk';

import {OK, ERROR} from '../../lib/services/message.service';
import {ReportService} from '../../lib/services/report.service';

export class ReportCommand {
  constructor(private reportService: ReportService) {}

  async run() {
    if (!(await this.reportService.exists())) {
      console.log(
        ERROR +
          'No report available, generate content first: ' +
          yellow('ngxer generate')
      );
    }
    const reports = await this.reportService.read();
    console.log(OK + 'Here your render reports:');
    console.log({reports});
  }
}
