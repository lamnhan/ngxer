import {resolve} from 'path';
import {yellow, grey, red, magenta} from 'chalk';

import {OK, INFO, WARN} from '../../lib/services/message.service';
import {FileService} from '../../lib/services/file.service';
import {
  DotNgxerRCDotJson,
  DatabaseRender,
  HomeConfig,
  ProjectService,
} from '../../lib/services/project.service';
import {CacheService} from '../../lib/services/cache.service';
import {ParsedHTML, HtmlService} from '../../lib/services/html.service';
import {RenderService} from '../../lib/services/render.service';
import {FirebaseService} from '../../lib/services/firebase.service';
import {ReportService} from '../../lib/services/report.service';
import {SitemapService} from '../../lib/services/sitemap.service';

export class GenerateCommand {
  constructor(
    private fileService: FileService,
    private projectService: ProjectService,
    private cacheService: CacheService,
    private htmlService: HtmlService,
    private renderService: RenderService,
    private firebaseService: FirebaseService,
    private reportService: ReportService,
    private sitemapService: SitemapService
  ) {}

  async run() {
    // load data
    const {dotNgxerRCDotJson, parsedIndexHTML, contentTemplate, homePage} =
      await this.prepareData();
    const {
      out,
      url,
      sitemap = false,
      pathRender = [],
      databaseRender = [],
    } = dotNgxerRCDotJson;

    // legends
    console.log(
      INFO +
        `Render legends: ${yellow('cached')} | ${magenta('live')} | ${grey(
          'exists'
        )} | ${red('error')}`
    );

    /**
     * index.html
     */
    if (await this.htmlService.isIndexOriginalExists(out)) {
      if (typeof homePage === 'string') {
        await this.htmlService.saveIndex(
          out,
          parsedIndexHTML,
          homePage,
          contentTemplate
        );
        console.log('\n' + OK + 'Modified: index.html');
      } else {
        const homePageLocales = Object.keys(homePage);
        for (let i = 0; i < homePageLocales.length; i++) {
          const locale = homePageLocales[i];
          const {content = '', metas} = homePage[locale];
          await this.htmlService.saveIndex(
            out,
            parsedIndexHTML,
            content,
            contentTemplate,
            metas,
            locale
          );
        }
        console.log(
          '\n' +
            OK +
            'Saved:' +
            [
              'index.html',
              ...homePageLocales.map(locale => `${locale}/index.html`),
            ].join('\n + ')
        );
      }
    }

    /**
     * path render (from manual paths or rc pathRender)
     */

    const pathRenderSitemap = [] as string[];
    if (pathRender.length) {
      console.log('\n' + 'Begin path rendering:');
      // filter
      const pathRenderExisting: string[] = [];
      const pathRenderCache: string[] = [];
      const pathRenderLive: string[] = [];
      for (let i = 0; i < pathRender.length; i++) {
        const path = this.renderService.processPath(pathRender[i]);
        if (await this.fileService.exists(resolve(out, path, 'index.html'))) {
          pathRenderExisting.push(path);
        } else {
          if (await this.cacheService.exists(path)) {
            pathRenderCache.push(path);
          } else {
            pathRenderLive.push(path);
          }
        }
      }
      // render existing
      if (pathRenderExisting.length) {
        pathRenderExisting.forEach(path => {
          pathRenderSitemap.push(path);
          console.log('  + ' + grey('/' + path));
        });
      }
      // render cached
      if (pathRenderCache.length) {
        const result = await this.cachedPathRender(
          dotNgxerRCDotJson,
          pathRenderCache,
          parsedIndexHTML,
          contentTemplate
        );
        pathRenderSitemap.push(...result);
      }
      // render live
      if (pathRenderLive.length) {
        console.log(WARN + 'Live path rendering could take some time.');
        const result = await this.livePathRender(
          dotNgxerRCDotJson,
          pathRenderLive,
          parsedIndexHTML,
          contentTemplate
        );
        pathRenderSitemap.push(...result);
      }
      // done
      console.log(OK + 'Path rendering completed.');
    }

    /**
     * database render
     */

    const databaseRenderSitemap = [] as string[];
    if (databaseRender.length) {
      console.log('\n' + 'Begin database rendering:');
      // proccess collection
      const firestore = await this.firebaseService.firestore();
      const cacheLocaleChecks: string[] = [];
      await Promise.all(
        databaseRender.map(databaseRenderItem =>
          (async () => {
            const {
              collection,
              type,
              locale,
              path: pathTemplate,
            } = databaseRenderItem;
            const collectionCachedDir = resolve(
              this.projectService.rcDir,
              'database_cached',
              collection
            );
            const collectionQuery = firestore
              .collection(collection)
              .where('type', '==', type)
              .where('status', '==', 'publish')
              .where('locale', '==', locale)
              .orderBy('createdAt', 'asc');
            // load docs
            const databaseRenderExisting: string[] = [];
            const databaseRenderCache: Array<Record<string, unknown>> = [];
            const databaseRenderLive: Array<Record<string, unknown>> = [];
            // load data for the fist time
            if (
              // first rendering item and no .../database_cached/[collection]
              (!cacheLocaleChecks.length &&
                !(await this.fileService.exists(collectionCachedDir))) ||
              // not the first but diference locale
              (cacheLocaleChecks.length &&
                cacheLocaleChecks.indexOf(`${collection} by ${locale}`) === -1)
            ) {
              const docs = (
                await collectionQuery.limitToLast(1000).get()
              ).docs.map(doc => doc.data());
              databaseRenderLive.push(...docs); // render live for all
            }
            // load latest 30 items
            else {
              const docs = (
                await collectionQuery.limitToLast(30).get()
              ).docs.map(doc => doc.data());
              // filter
              for (let i = 0; i < docs.length; i++) {
                const doc = docs[i];
                const path = this.renderService.processPath(
                  pathTemplate.replace(':id', doc.id as string)
                );
                if (
                  await this.fileService.exists(
                    resolve(out, path, 'index.html')
                  )
                ) {
                  databaseRenderExisting.push(path);
                } else {
                  if (
                    await this.cacheService.exists(`${collection}:${doc.id}`)
                  ) {
                    databaseRenderCache.push(doc);
                  } else {
                    databaseRenderLive.push(doc);
                  }
                }
              }
            }
            // update locale checks
            cacheLocaleChecks.push(`${collection} by ${locale}`);
            // renderexisting
            if (databaseRenderExisting.length) {
              databaseRenderExisting.forEach(path => {
                databaseRenderSitemap.push(path);
                console.log('  + ' + grey('/' + path));
              });
            }
            // render cached
            if (databaseRenderCache.length) {
              const result = await this.cachedDatabaseRender(
                dotNgxerRCDotJson,
                databaseRenderItem,
                databaseRenderCache,
                parsedIndexHTML,
                contentTemplate
              );
              databaseRenderSitemap.push(...result);
            }
            // render live
            if (databaseRenderLive.length) {
              const result = await this.liveDatabaseRender(
                dotNgxerRCDotJson,
                databaseRenderItem,
                databaseRenderLive,
                parsedIndexHTML,
                contentTemplate
              );
              databaseRenderSitemap.push(...result);
            }
          })()
        )
      );
      // done
      console.log(OK + 'Database rendering completed.');
    }

    /**
     * save sitemap
     */

    if (sitemap) {
      const sitemapItems = [...pathRenderSitemap, ...databaseRenderSitemap];
      await this.sitemapService.save(out, url, sitemapItems);
      console.log('\n' + OK + 'Saved: sitemap.xml');
    }

    /**
     * save report
     */
    await this.reportService.save(pathRenderSitemap, databaseRenderSitemap);
    console.log(OK + 'To view report: $ ' + yellow('ngxer report'));
  }

  async prepareData() {
    // rc data
    const dotNgxerRCDotJson = await this.projectService.loadDotNgxerRCDotJson();
    const {out, contentBetweens} = dotNgxerRCDotJson;
    let {homePage = '', contentTemplate = ''} = dotNgxerRCDotJson;
    // parsed index.html
    const parsedIndexHTML = await this.htmlService.parseIndex(
      out,
      contentBetweens
    );
    // content template
    if (typeof contentTemplate === 'string') {
      contentTemplate = await this.htmlService.processContentOrPath(
        contentTemplate
      );
    } else {
      const processedContentTemplate: Record<string, string> = {};
      const contentTemplatLocales = Object.keys(contentTemplate);
      for (let i = 0; i < contentTemplatLocales.length; i++) {
        const locale = contentTemplatLocales[i];
        processedContentTemplate[locale] =
          await this.htmlService.processContentOrPath(contentTemplate[locale]);
      }
      contentTemplate = processedContentTemplate;
    }
    // home page content
    if (typeof homePage === 'string') {
      homePage = await this.htmlService.processContentOrPath(homePage);
    } else {
      const processedHomePage: Record<string, HomeConfig> = {};
      const homePageLocales = Object.keys(homePage);
      for (let i = 0; i < homePageLocales.length; i++) {
        const locale = homePageLocales[i];
        const {content = '', metas} = homePage[locale];
        const homePageContent = await this.htmlService.processContentOrPath(
          content
        );
        processedHomePage[locale] = {content: homePageContent, metas};
      }
      homePage = processedHomePage;
    }
    // result
    return {
      dotNgxerRCDotJson,
      parsedIndexHTML,
      contentTemplate,
      homePage,
    };
  }

  async cachedPathRender(
    dotNgxerRCDotJson: DotNgxerRCDotJson,
    pathRenderCache: string[],
    parsedIndexHTML: ParsedHTML,
    contentTemplate?: string | Record<string, string>
  ) {
    const {out} = dotNgxerRCDotJson;
    const result: string[] = [];
    await Promise.all(
      pathRenderCache.map(path =>
        (async () => {
          path = this.renderService.processPath(path);
          const cached = await this.cacheService.read(dotNgxerRCDotJson, path);
          // save file
          if (cached) {
            const filePath = resolve(out, path, 'index.html');
            const fileContent = await this.htmlService.composeContent(
              parsedIndexHTML,
              cached.meta,
              cached.data,
              contentTemplate
            );
            await this.fileService.createFile(filePath, fileContent);
            result.push(path);
            console.log('  + ' + yellow('/' + path));
          } else {
            console.log('  + ' + red('/' + path));
          }
        })()
      )
    );
    return result;
  }

  async livePathRender(
    dotNgxerRCDotJson: DotNgxerRCDotJson,
    pathRenderLive: string[],
    parsedIndexHTML: ParsedHTML,
    contentTemplate?: string | Record<string, string>
  ) {
    const {out, url, contentBetweens} = dotNgxerRCDotJson;
    const result: string[] = [];
    await this.renderService.liveRender(
      out,
      pathRenderLive,
      async (path, page) => {
        // extract data
        const pageContent = await page.content();
        const metaData = await this.htmlService.parseContent(
          pageContent,
          contentBetweens
        );
        metaData.url = url + '/' + path + '/';
        // cache
        const cached = await this.cacheService.save(
          dotNgxerRCDotJson,
          path,
          metaData as unknown as Record<string, unknown>
        );
        // save file
        if (cached) {
          const filePath = resolve(out, path, 'index.html');
          const fileContent = await this.htmlService.composeContent(
            parsedIndexHTML,
            cached.meta,
            cached.data,
            contentTemplate
          );
          await this.fileService.createFile(filePath, fileContent);
          result.push(path);
          console.log('  + ' + magenta('/' + path));
        } else {
          console.log('  + ' + red('/' + path));
        }
      }
    );
    return result;
  }

  async cachedDatabaseRender(
    dotNgxerRCDotJson: DotNgxerRCDotJson,
    databaseRenderItem: DatabaseRender,
    databaseRenderCache: Array<Record<string, unknown>>,
    parsedIndexHTML: ParsedHTML,
    contentTemplate?: string | Record<string, string>
  ) {
    const {out} = dotNgxerRCDotJson;
    const {collection, path: pathTemplate} = databaseRenderItem;
    const result: string[] = [];
    await Promise.all(
      databaseRenderCache.map(doc =>
        (async () => {
          const path = this.renderService.processPath(
            pathTemplate.replace(':id', doc.id as string)
          );
          const cached = await this.cacheService.read(
            dotNgxerRCDotJson,
            `${collection}:${doc.id}`
          );
          // save file
          if (cached) {
            const filePath = resolve(out, path, 'index.html');
            const fileContent = await this.htmlService.composeContent(
              parsedIndexHTML,
              cached.meta,
              cached.data,
              contentTemplate
            );
            await this.fileService.createFile(filePath, fileContent);
            result.push(path);
            console.log('  + ' + yellow('/' + path));
          } else {
            console.log('  + ' + red('/' + path));
          }
        })()
      )
    );
    return result;
  }

  async liveDatabaseRender(
    dotNgxerRCDotJson: DotNgxerRCDotJson,
    databaseRenderItem: DatabaseRender,
    databaseRenderLive: Array<Record<string, unknown>>,
    parsedIndexHTML: ParsedHTML,
    contentTemplate?: string | Record<string, string>
  ) {
    const {out} = dotNgxerRCDotJson;
    const result: string[] = [];
    await this.renderService.collectionRender(
      databaseRenderItem,
      databaseRenderLive,
      async (path, cacheInput, data) => {
        // save cache
        const cached = await this.cacheService.save(
          dotNgxerRCDotJson,
          cacheInput,
          data
        );
        // save files
        if (cached) {
          const filePath = resolve(out, path, 'index.html');
          const fileContent = await this.htmlService.composeContent(
            parsedIndexHTML,
            cached.meta,
            cached.data,
            contentTemplate
          );
          await this.fileService.createFile(filePath, fileContent);
          result.push(path);
          console.log('  + ' + magenta('/' + path));
        } else {
          console.log('  + ' + red('/' + path));
        }
      }
    );
    return result;
  }
}
