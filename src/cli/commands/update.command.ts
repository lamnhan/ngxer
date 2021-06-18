import {OK, WARN, INFO} from '../../lib/services/message.service';
import {ProjectService} from '../../lib/services/project.service';
import {ReportService} from '../../lib/services/report.service';
import {SitemapService} from '../../lib/services/sitemap.service';

import {GenerateCommand} from './generate.command';

interface Options {
  live?: boolean;
}

export class UpdateCommand {
  constructor(
    private projectService: ProjectService,
    private resportService: ReportService,
    private sitemapService: SitemapService,
    private generateCommand: GenerateCommand
  ) {}

  async run(inputs: string[], options: Options) {
    const {dotNgxerRCDotJson, parsedIndexHTML, contentTemplate} =
      await this.generateCommand.prepareData();
    const {out, url, pathRender = [], databaseRender = []} = dotNgxerRCDotJson;
    // sort by rendering type
    const pathRenderList: string[] = [];
    const databaseRenderList: string[] = [];
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      if (input.indexOf(':') !== -1) {
        databaseRenderList.push(input);
      } else {
        pathRenderList.push(input);
      }
    }
    // path render
    const pathAdded: string[] = [];
    if (pathRenderList.length) {
      console.log('\n' + 'Begin path rendering:');
      // from cached
      if (!options.live) {
        await this.generateCommand.cachedPathRender(
          dotNgxerRCDotJson,
          pathRenderList,
          parsedIndexHTML,
          contentTemplate
        );
      }
      // live render
      else {
        console.log(WARN + 'Live path rendering could take some time.');
        const result = await this.generateCommand.livePathRender(
          dotNgxerRCDotJson,
          pathRenderList,
          parsedIndexHTML,
          contentTemplate
        );
        // filter add values
        for (let i = 0; i < result.length; i++) {
          const path = result[i];
          if (pathRender.indexOf(path) === -1) {
            pathAdded.push(path);
          }
        }
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
