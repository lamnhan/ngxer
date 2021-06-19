import {green} from 'chalk';
import * as ora from 'ora';

import {WARN, ERROR} from '../../lib/services/message.service';
import {ProjectService} from '../../lib/services/project.service';
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
    // load data
    const gartheredData = await this.generateCommand.prepareData();
    if (!gartheredData) {
      return console.log(
        ERROR + 'No index.html found, invalid out path or need to build first.'
      );
    }
    const {dotNgxerRCDotJson, parsedIndexHTML, contentTemplate} = gartheredData;
    const {out, url, pathRender = [], databaseRender = []} = dotNgxerRCDotJson;
    const spinner = ora().start();
    // sort by rendering type
    const {
      pathRenderList,
      databaseRenderList,
      otherList: pathAdded,
    } = this.renderService.sortPaths(dotNgxerRCDotJson, paths);
    // path render (added - always live)
    if (pathAdded.length) {
      spinner.text = WARN + 'Live path rendering could take some time.';
      await this.generateCommand.livePathRender(
        spinner,
        dotNgxerRCDotJson,
        pathAdded,
        parsedIndexHTML,
        contentTemplate
      );
    }
    // path render
    if (pathRenderList.length) {
      // from cached
      if (!options.live) {
        await this.generateCommand.cachedPathRender(
          spinner,
          dotNgxerRCDotJson,
          pathRenderList,
          parsedIndexHTML,
          contentTemplate
        );
      }
      // live render
      else {
        spinner.text = WARN + 'Live path rendering could take some time.';
        await this.generateCommand.livePathRender(
          spinner,
          dotNgxerRCDotJson,
          pathRenderList,
          parsedIndexHTML,
          contentTemplate
        );
      }
    }
    // database render
    const databaseAdded: string[] = [];
    if (databaseRenderList.length) {
      // from cached
      if (!options.live) {
        //
      }
      // live render
      else {
        //
      }
    }
    // update .ngxer.json#pathRender
    if (pathAdded.length) {
      await this.projectService.updateDotNgxerRCDotJson({
        pathRender: [...(dotNgxerRCDotJson.pathRender || []), ...pathAdded],
      });
    }
    // update sitemap & report
    if (pathAdded.length || databaseAdded.length) {
      const {
        indexRendering: indexRenderLatest,
        pathRendering,
        databaseRendering,
      } = await this.resportService.read();
      let pathRenderLatest = pathRendering;
      let databaseRenderLatest = databaseRendering;
      pathRenderLatest = [...pathRenderLatest, ...pathAdded];
      databaseRenderLatest = [...databaseRenderLatest, ...databaseAdded];
      // sitemap
      await this.sitemapService.save(out, url, [
        ...indexRenderLatest,
        ...pathRenderLatest,
        ...databaseRenderLatest,
      ]);
      // report
      await this.resportService.update(
        indexRenderLatest,
        pathRenderLatest,
        databaseRenderLatest
      );
    }
    // done
    spinner.stopAndPersist({
      symbol: green('[OK]'),
      text: 'Update completed!',
    });
  }
}
