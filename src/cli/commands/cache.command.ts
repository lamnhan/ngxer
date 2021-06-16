import {resolve} from 'path';

import {OK} from '../../lib/services/message.service';
import {FileService} from '../../lib/services/file.service';
import {ProjectService} from '../../lib/services/project.service';

export class CacheCommand {
  constructor(
    private fileService: FileService,
    private projectService: ProjectService
  ) {}

  async run(inputs: string[]) {
    const results = [] as string[];
    await Promise.all(
      inputs.map(input =>
        (async () => {
          const [cachePath, dataPath] = input.split('<');
          // get data
          const data = await this.fileService.readJson<Record<string, unknown>>(
            resolve(dataPath)
          );
          // save cache
          await this.projectService.saveCache('path', cachePath, data);
          results.push(
            `${this.projectService.rcDir}/path_cached/` + cachePath + '.json'
          );
        })()
      )
    );
    console.log(OK + 'Caches saved:');
    console.log(results.map(item => '  + ' + item).join('\n'));
  }
}
