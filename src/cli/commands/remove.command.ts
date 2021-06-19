import {resolve} from 'path';
import {grey, yellow} from 'chalk';

import {OK, WARN, INFO} from '../../lib/services/message.service';
import {FileService} from '../../lib/services/file.service';
import {ProjectService} from '../../lib/services/project.service';
import {RenderService} from '../../lib/services/render.service';
import {CacheService} from '../../lib/services/cache.service';
import {ReportService} from '../../lib/services/report.service';
import {SitemapService} from '../../lib/services/sitemap.service';

import {GenerateCommand} from './generate.command';

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

  async run(paths: string[]) {
    const {dotNgxerRCDotJson} = await this.generateCommand.prepareData();
    const {out, url} = dotNgxerRCDotJson;
    // sort by rendering type
    const {
      pathRenderList: pathRemoveList,
      databaseRenderList: databaseRemoveList,
      otherList: invalidList,
    } = this.renderService.sortPaths(dotNgxerRCDotJson, paths);
    if (pathRemoveList.length || databaseRemoveList.length) {
      console.log(INFO + 'Removing:');
    }
    // helper
    const dirRemoval = async (path: string) => {
      const dirPath = resolve(out, path);
      if (await this.fileService.exists(dirPath)) {
        await this.fileService.removeDir(dirPath);
        console.log('  + ' + grey(`${path}`));
      } else {
        console.log('  + ' + grey(`${path}`) + yellow(' (not found)'));
      }
    };
    // path removal
    if (pathRemoveList.length) {
      await Promise.all(
        pathRemoveList.map(path =>
          (async () => {
            path = this.renderService.processPath(path);
            await this.cacheService.remove(path);
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
            await this.cacheService.remove(`${collection}:${docId}`);
            await dirRemoval(path);
          })()
        )
      );
    }
    // invalid removal
    if (invalidList.length) {
      console.log(
        '\n' +
          WARN +
          'Invalid paths: ' +
          '\n  + ' +
          invalidList.map(x => (x ? x : '/')).join('\n  + ')
      );
    }
    // final touches
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
}
