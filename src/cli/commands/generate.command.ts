import {resolve} from 'path';
import {yellow} from 'chalk';

import {OK, WARN} from '../../lib/services/message.service';
import {FileService} from '../../lib/services/file.service';
import {ProjectService} from '../../lib/services/project.service';

export class GenerateCommand {
  constructor(
    private fileService: FileService,
    private projectService: ProjectService
  ) {}

  async run(paths: string[] = []) {
    // load data
    const {out = 'www', sitemap = true} =
      await this.projectService.loadDotNgxerRCDotJson();
    const parsedIndexHTML = await this.projectService.parseIndexHTML(out);
    // check bundles status
    const outdated = true;
    // path render from command
    if (paths.length) {
      // warn for outdated
      if (outdated) {
        console.log(
          WARN +
            'Outdated, please re-render full: $ ' +
            yellow('ngxer generate')
        );
      }
      // render the specific paths
      else {
        // ...
        console.log('// TODO: render the specific paths');
      }
    }
    // from .ngxerrc.json
    else {
      console.log('// TODO: render paths/database from .ngxerrc.json');
      // ...
      // if (outdated || !(await this.fileService.exists(''))) {
      //   // ...
      // }
    }
    // save sitemap
    if (sitemap) {
      const sitemapContent = await this.buildSitemap();
      await this.fileService.createFile(
        resolve(out, 'sitemap.xml'),
        sitemapContent
      );
    }
    // copy robots.txt
    const robotsTXTPath = resolve('src', 'robots.txt');
    if (await this.fileService.exists(robotsTXTPath)) {
      await this.fileService.copy(robotsTXTPath, resolve(out, 'robots.txt'));
      console.log(OK + 'Copy robots.txt');
    } else {
      console.log(WARN + 'No src/robots.txt found');
    }
  }

  async buildSitemap() {
    return 'TODO: sitemap.xml';
  }
}
