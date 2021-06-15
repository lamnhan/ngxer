import {resolve} from 'path';
import {blue} from 'chalk';

import {OK, WARN} from '../../lib/services/message.service';
import {FileService} from '../../lib/services/file.service';
import {ProjectService} from '../../lib/services/project.service';

export class RemoveCommand {
  constructor(
    private fileService: FileService,
    private projectService: ProjectService
  ) {}

  async run(path: string) {
    const {out = 'www'} = await this.projectService.loadDotNgxerRCDotJson();
    const dirPath = resolve(out, path);
    if (await this.fileService.exists(dirPath)) {
      this.fileService.removeDir(dirPath);
      console.log(OK + 'Static removed: ' + blue(`${out}/${path}`));
    } else {
      console.log(WARN + 'No static found at: ' + blue(`${out}/${path}`));
    }
  }
}
