import {blue} from 'chalk';

import {OK, WARN} from '../../lib/services/message.service';
import {FileService} from '../../lib/services/file.service';
import {ProjectService} from '../../lib/services/project.service';

export class InitCommand {
  constructor(
    private fileService: FileService,
    private projectService: ProjectService
  ) {}

  async run(customPath = '.') {
    const pathToRCFile = customPath + '/' + this.projectService.rcFile;
    if (await this.fileService.exists(pathToRCFile)) {
      console.log(WARN + 'The file ' + blue(pathToRCFile) + ' already exists!');
    } else {
      await this.projectService.createDotNgxerRCDotJson(customPath);
      console.log(OK + `Added (${blue(pathToRCFile)}) to the project.`);
    }
  }
}
