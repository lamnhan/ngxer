import {resolve} from 'path';
import {yellow} from 'chalk';

import {ERROR, OK} from '../../lib/services/message.service';
import {FileService} from '../../lib/services/file.service';
import {ProjectService} from '../../lib/services/project.service';
import {RenderService} from '../../lib/services/render.service';
import {CacheService} from '../../lib/services/cache.service';
import {ReportService} from '../../lib/services/report.service';
import {SitemapService} from '../../lib/services/sitemap.service';

import {GenerateCommand} from './generate.command';

interface Options {
  keepCache?: boolean;
}

export class RemoveCommand {
  constructor(
    private fileService: FileService,
    private projectService: ProjectService,
    private renderService: RenderService,
    private cacheService: CacheService,
    private resportService: ReportService,
    private sitemapService: SitemapService,
    private generateCommand: GenerateCommand
  ) {}

  async run(paths: string[], options: Options) {
    // load data
    const gartheredData = await this.generateCommand.prepareData();
    if (!gartheredData) {
      return console.log(
        ERROR + 'No index.html found, invalid out path or need to build first.'
      );
    }
    const {dotNgxerRCDotJson} = gartheredData;
    const {out, url} = dotNgxerRCDotJson;
    // sort by rendering type
    const {
      pathRenderList: pathRemoveList,
      databaseRenderList: databaseRemoveList,
    } = this.renderService.sortPaths(dotNgxerRCDotJson, paths);
    // helper
    const dirRemoval = async (path: string) => {
      const dirPath = resolve(out, path);
      if (await this.fileService.exists(dirPath)) {
        await this.fileService.removeDir(dirPath);
      }
    };
    // path removal
    if (pathRemoveList.length) {
      await Promise.all(
        pathRemoveList.map(path =>
          (async () => {
            path = this.renderService.processPath(path);
            if (!options.keepCache) {
              await this.cacheService.remove(path);
            }
            await dirRemoval(path);
          })()
        )
      );
    }
    // database removal
    if (databaseRemoveList.length) {
      await Promise.all(
        databaseRemoveList.map(item =>
          (async () => {
            const {
              path,
              config: {collection},
            } = item;
            const docId = path.split('/').pop() as string;
            if (!options.keepCache) {
              await this.cacheService.remove(`${collection}:${docId}`);
            }
            await dirRemoval(path);
          })()
        )
      );
    }
    // final touches
    if (!options.keepCache) {
      let rcPathRenderRemain = dotNgxerRCDotJson.pathRender || [];
      const {
        indexRendering: indexRenderRemain,
        pathRendering,
        databaseRendering,
      } = await this.resportService.read();
      let pathRenderRemain = pathRendering;
      let databaseRenderRemain = databaseRendering;
      // remove by path
      if (pathRemoveList.length) {
        rcPathRenderRemain = rcPathRenderRemain.filter(
          item => pathRemoveList.indexOf(item) === -1
        );
        pathRenderRemain = pathRenderRemain.filter(
          item => pathRemoveList.indexOf(item) === -1
        );
      }
      // remove by database
      if (databaseRemoveList.length) {
        databaseRenderRemain = databaseRenderRemain.filter(
          item => databaseRemoveList.map(x => x.path).indexOf(item) === -1
        );
      }
      // update .ngxer.json#pathRender
      await this.projectService.updateDotNgxerRCDotJson({
        pathRender: rcPathRenderRemain,
      });
      // update sitemap
      await this.sitemapService.save(out, url, [
        ...indexRenderRemain,
        ...pathRenderRemain,
        ...databaseRenderRemain,
      ]);
      // update report
      await this.resportService.update(
        indexRenderRemain,
        pathRenderRemain,
        databaseRenderRemain
      );
    }
    // done
    console.log(
      OK +
        `Remove completed${
          !options.keepCache ? '' : ' (keep cached)'
        }! View report: $ ` +
        yellow('ngxer r -d')
    );
  }
}
