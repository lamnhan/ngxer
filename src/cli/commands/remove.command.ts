import {resolve} from 'path';
import {blue} from 'chalk';

import {OK, WARN, ERROR} from '../../lib/services/message.service';
import {FileService} from '../../lib/services/file.service';
import {ProjectService} from '../../lib/services/project.service';

export class RemoveCommand {
  constructor(
    private fileService: FileService,
    private projectService: ProjectService
  ) {}

  async run(inputs: string[]) {
    const {out, databaseRender = []} =
      await this.projectService.loadDotNgxerRCDotJson();
    const dirRemoval = async (dirPath: string, input: string, out: string) => {
      if (await this.fileService.exists(dirPath)) {
        await this.fileService.removeDir(dirPath);
        console.log(OK + 'Removed: ' + blue(`${out}/${input}`));
      } else {
        console.log(WARN + 'Not found: ' + blue(`${out}/${input}`));
      }
    };
    await Promise.all(
      inputs.map(input =>
        (async () => {
          // database
          if (input.indexOf(':') !== -1) {
            const [collection, doc] = input.split(':');
            const renderItem = databaseRender
              .filter(item => item.collection === collection)
              .shift();
            if (renderItem) {
              // remove cache
              await this.projectService.removeCache('database', input);
              // remove file
              const dirPath = resolve(out, renderItem.path.replace(':id', doc));
              await dirRemoval(dirPath, input, out);
            } else {
              console.log(
                ERROR +
                  'No database render for the collection: ' +
                  blue(collection)
              );
            }
          }
          // path
          else {
            // remove cached
            await this.projectService.removeCache('path', input);
            // remove file
            const dirPath = resolve(out, input);
            await dirRemoval(dirPath, input, out);
          }
        })()
      )
    );
  }
}
