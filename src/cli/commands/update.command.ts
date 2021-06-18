import {OK, WARN, INFO} from '../../lib/services/message.service';
import {
  DotNgxerRCDotJson,
  ProjectService,
} from '../../lib/services/project.service';
import {RenderService} from '../../lib/services/render.service';
import {ReportService} from '../../lib/services/report.service';
import {SitemapService} from '../../lib/services/sitemap.service';

import {GenerateCommand} from './generate.command';

interface Options {
  live?: boolean;
}

export class UpdateCommand {
  constructor(
    private projectService: ProjectService,
    private renderService: RenderService,
    private resportService: ReportService,
    private sitemapService: SitemapService,
    private generateCommand: GenerateCommand
  ) {}

  async run(paths: string[], options: Options) {
    const {dotNgxerRCDotJson, parsedIndexHTML, contentTemplate} =
      await this.generateCommand.prepareData();
    const {out, url, pathRender = [], databaseRender = []} = dotNgxerRCDotJson;
    // sort by rendering type
    const {
      pathRenderList,
      databaseRenderList,
      otherList: pathAdded,
    } = this.renderService.sortPaths(dotNgxerRCDotJson, paths);
    // path render
    const allPathRender = [...pathRenderList, ...pathAdded];
    if (allPathRender.length) {
      console.log('\n' + 'Begin path rendering:');
      // from cached
      if (!options.live) {
        await this.generateCommand.cachedPathRender(
          dotNgxerRCDotJson,
          allPathRender,
          parsedIndexHTML,
          contentTemplate
        );
      }
      // live render
      else {
        console.log(WARN + 'Live path rendering could take some time.');
        await this.generateCommand.livePathRender(
          dotNgxerRCDotJson,
          allPathRender,
          parsedIndexHTML,
          contentTemplate
        );
      }
      // done
      console.log(OK + 'Path rendering completed.');
    }
    // database render
    const databaseAdded: string[] = [];
    if (databaseRenderList.length) {
      console.log('\n' + 'Begin database rendering:');
      // from cached
      if (!options.live) {
        //
      }
      // live render
      else {
        //
      }
      // done
      console.log(OK + 'Database rendering completed.');
    }
    // update .ngxer.json pathRender
    if (pathAdded.length) {
      // update .ngxer.json (pathRender)
      await this.projectService.updateDotNgxerRCDotJson({
        pathRender: [...(dotNgxerRCDotJson.pathRender || []), ...pathAdded],
      });
    }
    // update sitemap & report
    if (pathAdded.length || databaseAdded.length) {
      let {
        pathRendering: pathRenderLatest,
        databaseRendering: databaseRenderLatest,
      } = await this.resportService.read();
      pathRenderLatest = [...pathRenderLatest, ...pathAdded];
      databaseRenderLatest = [...databaseRenderLatest, ...databaseAdded];
      // update sitemap
      await this.sitemapService.save(out, url, [
        ...pathRenderLatest,
        ...databaseRenderLatest,
      ]);
      // update report
      await this.resportService.update(pathRenderLatest, databaseRenderLatest);
      // done
      console.log(INFO + 'Updated: .ngxer.json, sitemap.xml & report.json');
    }
  }
}
