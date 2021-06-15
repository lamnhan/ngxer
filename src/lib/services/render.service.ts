import {launch, Browser, Page} from 'puppeteer-core';
const superstatic = require('superstatic');

export class RenderService {
  private server!: any;
  private browser!: Browser;

  constructor() {}

  async bootup(www: string) {
    if (!this.server || !this.browser) {
      // server & browser
      this.server = await superstatic
        .server({
          port: 7777,
          host: 'localhost',
          cwd: www,
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

  async render(
    out: string,
    paths: string[],
    handler: (path: string, page: Page) => Promise<void>,
    afterBootup?: () => void,
    afterShutdown?: () => void
  ) {
    // bootup
    await this.bootup(out);
    if (afterBootup) {
      afterBootup();
    }
    // render
    await Promise.all(
      paths.map(path =>
        (async () => {
          path = path.startsWith('/') ? path : '/' + path;
          const page = await this.browser.newPage();
          await page.goto('http://localhost:7777' + path, {
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
    if (afterShutdown) {
      afterShutdown();
    }
  }
}
