import {launch, Browser, Page} from 'puppeteer-core';
const superstatic = require('superstatic');

import {DatabaseRender} from './project.service';

export class RenderService {
  private server!: any;
  private browser!: Browser;

  constructor() {}

  async bootup(dir: string) {
    if (!this.server || !this.browser) {
      // server & browser
      this.server = await superstatic
        .server({
          port: 7777,
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
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
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
          await page.goto('http://localhost:7777/' + path, {
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
          await handler(path, cacheInput, doc);
        })()
      )
    );
  }
}
