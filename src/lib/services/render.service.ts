import {launch, Browser} from 'puppeteer-core';
const superstatic = require('superstatic');

import {FileService} from './file.service';
import {ProjectService} from './project.service';

export class RenderService {
  private server!: any;
  private browser!: Browser;

  constructor(
    private fileService: FileService,
    private projectService: ProjectService
  ) {}

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
    contentModifier: (path: string, content: string) => string,
    handler: (path: string, content: string) => Promise<void>,
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
          const page = await this.browser.newPage();
          await page.goto('http://localhost:7777/' + path, {
            waitUntil: 'networkidle0',
            timeout: 1000000,
          });
          const pageContent = await page.content();
          await handler(path, contentModifier(path, pageContent));
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
