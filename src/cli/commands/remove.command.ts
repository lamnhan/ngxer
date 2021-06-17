import {resolve} from 'path';
import {blue} from 'chalk';

import {OK, WARN, ERROR, INFO} from '../../lib/services/message.service';
import {FileService} from '../../lib/services/file.service';
import {ProjectService} from '../../lib/services/project.service';
import {RenderService} from '../../lib/services/render.service';
import {CacheService} from '../../lib/services/cache.service';
import {ReportService} from '../../lib/services/report.service';
import {SitemapService} from '../../lib/services/sitemap.service';

export class RemoveCommand {
  constructor(
    private fileService: FileService,
    private projectService: ProjectService,
    private renderService: RenderService,
    private cacheService: CacheService,
    private resportService: ReportService,
    private sitemapService: SitemapService
  ) {}

  async run(inputs: string[]) {
    const dotNgxerRCDotJson = await this.projectService.loadDotNgxerRCDotJson();
    const {out, url, databaseRender = []} = dotNgxerRCDotJson;
    // helper
    const dirRemoval = async (path: string) => {
      const dirPath = resolve(out, path);
      if (await this.fileService.exists(dirPath)) {
        await this.fileService.removeDir(dirPath);
        console.log(OK + 'Removed: ' + blue(`/${path}`));
      } else {
        console.log(WARN + 'Not found: ' + blue(`/${path}`));
      }
    };
    // do removal
    const pathRemoved: string[] = [];
    const databaseRemoved: string[] = [];
    await Promise.all(
      inputs.map(input =>
        (async () => {
          // database
          if (input.indexOf(':') !== -1) {
            const [collection, docId] = input.split(':');
            const databaseRenderItems = databaseRender.filter(
              item => item.collection === collection
            );
            if (databaseRenderItems.length) {
              // remove cache
              await this.cacheService.remove(input);
              // process path with multiple locales
              const path = await (async () => {
                if (databaseRenderItems.length === 1) {
                  return databaseRenderItems[0].path.replace(':id', docId);
                } else {
                  let correctPath = '';
                  for (let i = 0; i < databaseRenderItems.length; i++) {
                    const path = databaseRenderItems[i].path.replace(
                      ':id',
                      docId
                    );
                    if (await this.fileService.exists(resolve(out, path))) {
                      correctPath = path;
                      break;
                    }
                  }
                  return correctPath;
                }
              })();
              // remove file
              await dirRemoval(path);
              // for sitemap & report
              databaseRemoved.push(path);
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
            const path = this.renderService.processPath(input);
            // remove cached
            await this.cacheService.remove(path);
            // remove file
            await dirRemoval(path);
            // for sitemap & report
            pathRemoved.push(path);
          }
        })()
      )
    );
    // update .ngxer.json pathRender, sitemap & report
    let rcPathRenderRemain = dotNgxerRCDotJson.pathRender || [];
    let {
      pathRendering: pathRenderRemain,
      databaseRendering: databaseRenderRemain,
    } = await this.resportService.read();
    if (pathRemoved.length) {
      rcPathRenderRemain = rcPathRenderRemain.filter(
        item => pathRemoved.indexOf(item) === -1
      );
      pathRenderRemain = pathRenderRemain.filter(
        item => pathRemoved.indexOf(item) === -1
      );
    }
    if (databaseRemoved.length) {
      databaseRenderRemain = databaseRenderRemain.filter(
        item => databaseRemoved.indexOf(item) === -1
      );
    }
    await this.projectService.updateDotNgxerRCDotJson({
      pathRender: rcPathRenderRemain,
    });
    await this.sitemapService.save(out, url, [
      ...pathRenderRemain,
      ...databaseRenderRemain,
    ]);
    await this.resportService.update(pathRenderRemain, databaseRenderRemain);
    console.log(INFO + 'Updated .ngxer.json, sitemap.xml & report.json');
  }
}
