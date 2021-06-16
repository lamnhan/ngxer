import {resolve} from 'path';
import {blue, yellow, grey, red, magenta} from 'chalk';

import {OK, INFO} from '../../lib/services/message.service';
import {HelperService} from '../../lib/services/helper.service';
import {FileService} from '../../lib/services/file.service';
import {ProjectService} from '../../lib/services/project.service';
import {RenderService} from '../../lib/services/render.service';

export class GenerateCommand {
  constructor(
    private helperService: HelperService,
    private fileService: FileService,
    private projectService: ProjectService,
    private renderService: RenderService
  ) {}

  async run() {
    // load data
    const {
      out,
      url,
      sitemap = false,
      pathRender = [],
      databaseRender = [],
      contentBetweens,
    } = await this.projectService.loadDotNgxerRCDotJson();
    const parsedIndexHTML = await this.projectService.parseIndexHTML(out);

    /**
     * path render (from manual paths or rc pathRender)
     */

    if (pathRender.length) {
      const pathRenderExisting = [] as string[];
      const pathRenderCache = [] as string[];
      const pathRenderLive = [] as string[];
      // filter
      for (let i = 0; i < pathRender.length; i++) {
        const path = !pathRender[i].startsWith('/')
          ? pathRender[i]
          : pathRender[i].substr(1);
        if (await this.fileService.exists(resolve(out, path, 'index.html'))) {
          pathRenderExisting.push(path);
        } else {
          if (await this.projectService.cacheExists('path', path)) {
            pathRenderCache.push(path);
          } else {
            pathRenderLive.push(path);
          }
        }
      }
      // cache render
      const legends =
        `(${yellow('cached')}/` +
        `${magenta('live')}/` +
        `${grey('exists')}/` +
        `${red('error')})`;
      console.log(
        INFO + 'Begin path rendering ' + legends + ' (could take some time):'
      );
      if (pathRenderExisting.length) {
        pathRenderExisting.forEach(path => console.log('  + ' + grey(path)));
      }
      if (pathRenderCache.length) {
        await Promise.all(
          pathRenderCache.map(path =>
            (async () => {
              const metaData = await this.projectService.readCache(
                'path',
                path
              );
              // save file
              if (metaData) {
                const filePath = resolve(
                  out,
                  !path.startsWith('/') ? path : path.substr(1),
                  'index.html'
                );
                await this.fileService.createFile(
                  filePath,
                  this.projectService.composeHTMLContent(
                    parsedIndexHTML,
                    metaData
                  )
                );
                console.log('  + ' + yellow(path));
              } else {
                console.log('  + ' + red(path));
              }
            })()
          )
        );
      }
      // live render
      if (pathRenderLive.length) {
        await this.renderService.liveRender(
          out,
          pathRenderLive,
          async (path, page) => {
            // extract data
            const pageContent = await page.content();
            const metaData = await this.projectService.parseHTMLContent(
              pageContent,
              contentBetweens
            );
            metaData.url = url + path + '/';
            // cache
            await this.projectService.saveCache(
              'path',
              path.substr(1),
              metaData as unknown as Record<string, unknown>
            );
            // save file
            const filePath = resolve(out, path.substr(1), 'index.html');
            await this.fileService.createFile(
              filePath,
              this.projectService.composeHTMLContent(parsedIndexHTML, metaData)
            );
            console.log('  + ' + magenta(path));
          }
        );
      }
      // done
      console.log(OK + 'Path rendering completed.');
    }

    /**
     * database render
     */

    if (databaseRender.length) {
      console.log('TODO: database render ...');
    }

    /**
     * save sitemap
     */

    if (sitemap) {
      const sitemapItems = [] as string[];
      // path renders
      sitemapItems.push(...pathRender);
      // create sitemap
      const sitemapContent = await this.buildSitemap(url, sitemapItems);
      await this.fileService.createFile(
        resolve(out, 'sitemap.xml'),
        sitemapContent
      );
      console.log(OK + 'Saved: ' + blue('sitemap.xml'));
    }
  }

  async buildSitemap(url: string, paths: string[]) {
    const items = [] as string[];
    paths.forEach(path => {
      const remoteUrl = url + (path.startsWith('/') ? path : '/' + path);
      const loc = remoteUrl.substr(-1) === '/' ? remoteUrl : remoteUrl + '/';
      const changefreq = 'daily';
      const priority = '1.0';
      const lastmod = new Date().toISOString().substr(0, 10);
      items.push(
        '   <url>',
        '       <loc>' + loc + '</loc>',
        '       <lastmod>' + lastmod + '</lastmod>',
        '       <changefreq>' + changefreq + '</changefreq>',
        '       <priority>' + priority + '</priority>',
        '   </url>'
      );
    });
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...items,
      '</urlset>',
    ].join('\n');
  }
}
