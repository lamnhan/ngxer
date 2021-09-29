import {launch, Browser, Page} from 'puppeteer-core';
const superstatic = require('superstatic');
import * as marked from 'marked';

import {FetchService} from './fetch.service';
import {HtmlService} from './html.service';
import {DotNgxerRCDotJson, DatabaseRender} from './project.service';

export class RenderService {
  private server!: any;
  private browser!: Browser;

  constructor(
    private fetchService: FetchService,
    private htmlService: HtmlService
  ) {}

  async bootup(dir: string) {
    if (!this.server || !this.browser) {
      // server & browser
      this.server = await superstatic
        .server({
          port: 7000,
          host: 'localhost',
          cwd: dir,
          config: {
            rewrites: [{source: '**', destination: '/index.html'}],
            cleanUrls: true,
          },
          debug: false,
        })
        .listen();
      // browser
      this.browser = await launch({
        executablePath:
          process.env.GOOGLE_CHROME ||
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      });
    }
  }

  async shutdown() {
    await this.server.close();
    this.server = undefined;
    await this.browser.close();
    this.browser = undefined as any;
  }

  processPath(path: string) {
    path = !path.startsWith('/') ? path : path.substr(1); // remove leading slash
    path = path.substr(-1) !== '/' ? path : path.substr(0, path.length - 1); // remove trailing slash
    return path;
  }

  sortPaths(dotNgxerRCDotJson: DotNgxerRCDotJson, paths: string[]) {
    const {pathRender = [], databaseRender = []} = dotNgxerRCDotJson;
    const pathRenderList: string[] = [];
    const databaseRenderList: Array<{
      path: string;
      config: DatabaseRender;
    }> = [];
    const otherList: string[] = [];
    for (let i = 0; i < paths.length; i++) {
      const path = this.processPath(paths[i]);
      // exists in pathRender
      if (pathRender.indexOf(path) !== -1) {
        pathRenderList.push(path);
      } else {
        // rebuild database render item path
        const pathSplits = path.split('/');
        pathSplits.pop();
        pathSplits.push(':id');
        const databaseRenderItemPath = pathSplits.join('/');
        const databaseRenderItem = databaseRender
          .filter(item => item.path === databaseRenderItemPath)
          .shift();
        // has a database render item
        if (databaseRenderItem) {
          databaseRenderList.push({
            path,
            config: databaseRenderItem,
          });
        }
        // no pathRender nor database render
        else {
          otherList.push(path);
        }
      }
    }
    return {
      pathRenderList,
      databaseRenderList,
      otherList,
    };
  }

  async liveRender(
    dir: string,
    paths: string[],
    handler: (path: string, page: Page) => Promise<void>
  ) {
    // bootup
    await this.bootup(dir);
    // render
    await Promise.all(
      paths.map(path =>
        (async () => {
          path = this.processPath(path);
          const page = await this.browser.newPage();
          await page.goto('http://localhost:7000/' + path, {
            waitUntil: 'networkidle0',
            timeout: 1000000,
          });
          await handler(path, page);
          await page.close();
        })()
      )
    );
    // shutdown
    await this.shutdown();
  }

  async collectionRender(
    config: DatabaseRender,
    docs: Array<Record<string, unknown>>,
    handler: (
      path: string,
      cacheInput: string,
      data: Record<string, unknown>
    ) => Promise<void>
  ) {
    const {collection, path: pathTemplate} = config;
    await Promise.all(
      docs.map(doc =>
        (async () => {
          const id = doc.id as string;
          const path = pathTemplate.replace(':id', id);
          const cacheInput = `${collection}:${id}`;
          // data
          const data = doc;
          if (
            data.content &&
            typeof data.content === 'string' &&
            data.content.substr(0, 4) === 'http'
          ) {
            const url = data.content as string;
            const ext = url.split('.').pop() as string;
            const content = await this.fetchService.text(url);
            data.content = await this.htmlService.minifyContent(
              ext !== 'md' ? content : marked(content),
              true
            );
          }
          // forwarding
          await handler(path, cacheInput, data);
        })()
      )
    );
  }
}
