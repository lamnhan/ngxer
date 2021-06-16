import {resolve} from 'path';

import {OK} from '../../lib/services/message.service';
import {FileService} from '../../lib/services/file.service';
import {ProjectService} from '../../lib/services/project.service';

interface CacheCommandOptions {
  remove?: boolean;
}

export class CacheCommand {
  constructor(
    private fileService: FileService,
    private projectService: ProjectService
  ) {}

  async run(inputs: string[], options: CacheCommandOptions) {
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
          // remove data.json
          if (options.remove) {
            await this.fileService.removeFile(dataPath);
          }
        })()
      )
    );
    console.log(OK + 'Caches saved.');
  }
}
