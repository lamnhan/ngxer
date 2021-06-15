import {resolve} from 'path';
import {yellow} from 'chalk';

import {OK, WARN, INFO} from '../../lib/services/message.service';
import {FileService} from '../../lib/services/file.service';
import {ProjectService} from '../../lib/services/project.service';
import {RenderService} from '../../lib/services/render.service';

export class GenerateCommand {
  constructor(
    private fileService: FileService,
    private projectService: ProjectService,
    private renderService: RenderService
  ) {}

  async run(manualPaths: string[] = []) {
    // load data
    const {
      out,
      url,
      sitemap = false,
      pathRender = [],
      databaseRender = [],
    } = await this.projectService.loadDotNgxerRCDotJson();
    const parsedIndexHTML = await this.projectService.parseIndexHTML(out);
    // path render (from manual paths or rc pathRender)
    const pathRenderFinal = [] as string[];
    // process input
    if (manualPaths.length) {
      pathRenderFinal.push(...manualPaths);
    } else if (pathRender.length) {
      for (let i = 0; i < pathRender.length; i++) {
        if (
          !(await this.fileService.exists(
            resolve(out, pathRender[i], 'index.html')
          ))
        ) {
          pathRenderFinal.push(pathRender[i]);
        }
      }
    }
    // render
    if (pathRenderFinal.length) {
      await this.renderService.render(
        out,
        pathRenderFinal,
        (path, content) => {
          return content;
        },
        async (path, content) => {
          const filePath = resolve(out, path, 'index.html');
          await this.fileService.createFile(filePath, content);
          console.log(OK + 'Saved: ' + filePath);
        },
        () => console.log(INFO + 'Server and browser started.'),
        () => console.log(INFO + 'Disposed server and browser.')
      );
    }
    // database render
    if (databaseRender.length) {
      console.log('TODO: database render ...');
    }
    // save sitemap
    if (sitemap) {
      const sitemapItems = [] as string[];
      const sitemapContent = await this.buildSitemap(url, sitemapItems);
      await this.fileService.createFile(
        resolve(out, 'sitemap.xml'),
        sitemapContent
      );
    }
  }

  async buildSitemap(url: string, paths: string[]) {
    const items = paths.map(path => {
      const remoteUrl = url + '/' + path;
      const loc = remoteUrl.substr(-1) === '/' ? remoteUrl : remoteUrl + '/';
      const changefreq = 'daily';
      const priority = '1.0';
      const lastmod = new Date().toISOString().substr(0, 10);
      return [
        '   <url>',
        '       <loc>' + loc + '</loc>',
        '       <lastmod>' + lastmod + '</lastmod>',
        '       <changefreq>' + changefreq + '</changefreq>',
        '       <priority>' + priority + '</priority>',
        '   </url>',
      ];
    });
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...items,
      '</urlset>',
    ].join('\n');
  }
}
