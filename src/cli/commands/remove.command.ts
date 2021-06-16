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

  async run(inputs: string[]) {
    const {out} = await this.projectService.loadDotNgxerRCDotJson();
    return Promise.all(
      inputs.map(input =>
        (async () => {
          // database
          if (input.indexOf(':') !== -1) {
            // TODO: ...
          }
          // path
          else {
            // remove cached
            // TODO: ...
            // remove file
            const dirPath = resolve(out, input);
            if (await this.fileService.exists(dirPath)) {
              this.fileService.removeDir(dirPath);
              console.log(OK + 'Static removed: ' + blue(`${out}/${input}`));
            } else {
              console.log(
                WARN + 'No static found at: ' + blue(`${out}/${input}`)
              );
            }
          }
        })()
      )
    );
  }
}
