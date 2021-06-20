import {resolve} from 'path';
import {green, yellow, magenta, cyan} from 'chalk';
import * as ora from 'ora';

import {WARN, ERROR} from '../../lib/services/message.service';
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
    const gartheredData = await this.prepareData();
    if (!gartheredData) {
      return console.log(
        ERROR + 'No index.html found, invalid out path or need to build first.'
      );
    } else {
      console.log('Start static prerendering ...');
    }

    // extract data
    const {dotNgxerRCDotJson, parsedIndexHTML, contentTemplate, homePage} =
      gartheredData;
    const {
      out,
      url,
      sitemap = false,
      pathRender = [],
      databaseRender = [],
      databaseLimitFirstTime = 1000,
      databaseLimit = 30,
      splashscreenTimeout = 0,
    } = dotNgxerRCDotJson;
    const spinner = ora().start();

    /**
     * index.html
     */

    const indexRenderSitemap = [] as string[];
    // single
    if (await this.htmlService.isIndexOriginalExists(out)) {
      if (typeof homePage === 'string') {
        const mainContent = homePage;
        await this.htmlService.saveIndex(
          out,
          parsedIndexHTML,
          mainContent,
          contentTemplate,
          undefined,
          undefined,
          splashscreenTimeout
        );
        // sitemap
        indexRenderSitemap.push('');
      }
      // miltiple locales
      else {
        const homePageLocales = Object.keys(homePage);
        if (homePageLocales.length) {
          // main
          const mainLocale = homePageLocales.shift() as string;
          const mainContent = homePage[mainLocale].content || '';
          await this.htmlService.saveIndex(
            out,
            parsedIndexHTML,
            mainContent,
            contentTemplate,
            undefined,
            undefined,
            splashscreenTimeout
          );
          // localized
          for (let i = 0; i < homePageLocales.length; i++) {
            const locale = homePageLocales[i];
            const {content = '', metas} = homePage[locale];
            await this.htmlService.saveIndex(
              out,
              parsedIndexHTML,
              content,
              contentTemplate,
              metas,
              locale,
              splashscreenTimeout
            );
          }
          // sitemap
          indexRenderSitemap.push('', ...homePageLocales);
        }
      }
    }

    /**
     * path render (from manual paths or rc pathRender)
     */

    const pathRenderSitemap = [] as string[];
    if (pathRender.length) {
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
        });
      }
      // render cached
      if (pathRenderCache.length) {
        const result = await this.cachedPathRender(
          spinner,
          dotNgxerRCDotJson,
          pathRenderCache,
          parsedIndexHTML,
          contentTemplate
        );
        pathRenderSitemap.push(...result);
      }
      // render live
      if (pathRenderLive.length) {
        spinner.text = WARN + 'Live path rendering could take some time.';
        const result = await this.livePathRender(
          spinner,
          dotNgxerRCDotJson,
          pathRenderLive,
          parsedIndexHTML,
          contentTemplate
        );
        pathRenderSitemap.push(...result);
      }
    }

    /**
     * database render
     */

    const databaseRenderSitemap = [] as string[];
    if (databaseRender.length) {
      // proccess collection
      const firestore = await this.firebaseService.firestore();
      const cacheLocaleChecks: string[] = [];
      await Promise.all(
        databaseRender.map(databaseRenderItem =>
          (async () => {
            const {
              collection,
              path: pathTemplate,
              status,
              type,
              locale,
              orderBy,
            } = databaseRenderItem;
            const collectionCachedDir = resolve(
              this.projectService.rcDir,
              'database_cached',
              collection
            );
            // build query
            let collectionQuery = firestore
              .collection(collection)
              .where('status', '==', status || 'publish');
            if (type) {
              collectionQuery = collectionQuery.where('type', '==', type);
            }
            if (locale) {
              collectionQuery = collectionQuery.where('locale', '==', locale);
            }
            if (orderBy) {
              collectionQuery = collectionQuery.orderBy(
                orderBy[0] || 'createdAt',
                (orderBy[1] || 'asc') as any
              );
            }
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
              spinner.text = `Load "${collection}" for the first time.`;
              const docs = (
                await collectionQuery.limitToLast(databaseLimitFirstTime).get()
              ).docs.map(doc => doc.data());
              databaseRenderLive.push(...docs); // render live for all
            }
            // load latest N items
            else {
              spinner.text = `Load "${collection}" latest items.`;
              const docs = (
                await collectionQuery.limitToLast(databaseLimit).get()
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
              });
            }
            // render cached
            if (databaseRenderCache.length) {
              const result = await this.cachedDatabaseRender(
                spinner,
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
                spinner,
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
    }

    /**
     * save sitemap
     */

    if (sitemap) {
      const sitemapItems = [
        ...indexRenderSitemap,
        ...pathRenderSitemap,
        ...databaseRenderSitemap,
      ];
      await this.sitemapService.save(out, url, sitemapItems);
    }

    /**
     * save report
     */
    await this.reportService.save(
      indexRenderSitemap,
      pathRenderSitemap,
      databaseRenderSitemap
    );

    /**
     * Result
     */
    spinner.stopAndPersist({
      symbol: green('[OK]'),
      text: 'Completed! View report: $ ' + yellow('ngxer report --detail'),
    });
  }

  async prepareData() {
    // rc data
    const dotNgxerRCDotJson = await this.projectService.loadDotNgxerRCDotJson();
    const {out, contentBetweens} = dotNgxerRCDotJson;
    let {homePage = '', contentTemplate = ''} = dotNgxerRCDotJson;
    if (!(await this.projectService.isValidOutDir(out))) {
      return null;
    }
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
    spinner: ora.Ora,
    dotNgxerRCDotJson: DotNgxerRCDotJson,
    pathRenderCache: string[],
    parsedIndexHTML: ParsedHTML,
    contentTemplate?: string | Record<string, string>
  ) {
    const {
      out,
      includeSessionData = false,
      splashscreenTimeout = 0,
    } = dotNgxerRCDotJson;
    const result: string[] = [];
    await Promise.all(
      pathRenderCache.map(path =>
        (async () => {
          path = this.renderService.processPath(path);
          spinner.text = 'Path render (cached): ' + cyan(path);
          const cached = await this.cacheService.read(dotNgxerRCDotJson, path);
          // save file
          if (cached) {
            const filePath = resolve(out, path, 'index.html');
            const fileContent = await this.htmlService.composeContent(
              parsedIndexHTML,
              cached.meta,
              contentTemplate,
              includeSessionData ? cached.data : null,
              splashscreenTimeout
            );
            await this.fileService.createFile(filePath, fileContent);
            result.push(path);
          }
        })()
      )
    );
    return result;
  }

  async livePathRender(
    spinner: ora.Ora,
    dotNgxerRCDotJson: DotNgxerRCDotJson,
    pathRenderLive: string[],
    parsedIndexHTML: ParsedHTML,
    contentTemplate?: string | Record<string, string>
  ) {
    const {
      out,
      url,
      contentBetweens,
      includeSessionData = false,
      splashscreenTimeout = 0,
    } = dotNgxerRCDotJson;
    const result: string[] = [];
    await this.renderService.liveRender(
      out,
      pathRenderLive,
      async (path, page) => {
        spinner.text = 'Path render (live): ' + magenta(path);
        // extract data
        const pageContent = await page.content();
        const metaData = await this.htmlService.parseContent(
          pageContent,
          contentBetweens
        );
        metaData.url = url + '/' + path + '/';
        metaData.content = await this.htmlService.minifyContent(
          (metaData.content || '').replace(/( _ng).*?("")/g, ''),
          true
        );
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
            contentTemplate,
            includeSessionData ? cached.data : null,
            splashscreenTimeout
          );
          await this.fileService.createFile(filePath, fileContent);
          result.push(path);
        }
      }
    );
    return result;
  }

  async cachedDatabaseRender(
    spinner: ora.Ora,
    dotNgxerRCDotJson: DotNgxerRCDotJson,
    databaseRenderItem: DatabaseRender,
    databaseRenderCache: Array<Record<string, unknown>>,
    parsedIndexHTML: ParsedHTML,
    contentTemplate?: string | Record<string, string>
  ) {
    const {
      out,
      includeSessionData = false,
      splashscreenTimeout = 0,
    } = dotNgxerRCDotJson;
    const {collection, path: pathTemplate} = databaseRenderItem;
    const result: string[] = [];
    await Promise.all(
      databaseRenderCache.map(doc =>
        (async () => {
          const path = this.renderService.processPath(
            pathTemplate.replace(':id', doc.id as string)
          );
          spinner.text = 'Database render (cached): ' + cyan(path);
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
              contentTemplate,
              includeSessionData ? cached.data : null,
              splashscreenTimeout
            );
            await this.fileService.createFile(filePath, fileContent);
            result.push(path);
          }
        })()
      )
    );
    return result;
  }

  async liveDatabaseRender(
    spinner: ora.Ora,
    dotNgxerRCDotJson: DotNgxerRCDotJson,
    databaseRenderItem: DatabaseRender,
    databaseRenderLive: Array<Record<string, unknown>>,
    parsedIndexHTML: ParsedHTML,
    contentTemplate?: string | Record<string, string>
  ) {
    const {
      out,
      includeSessionData = false,
      splashscreenTimeout = 0,
    } = dotNgxerRCDotJson;
    const result: string[] = [];
    await this.renderService.collectionRender(
      databaseRenderItem,
      databaseRenderLive,
      async (path, cacheInput, data) => {
        spinner.text = 'Database render (live): ' + magenta(path);
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
            contentTemplate,
            includeSessionData ? cached.data : null,
            splashscreenTimeout
          );
          await this.fileService.createFile(filePath, fileContent);
          result.push(path);
        }
      }
    );
    return result;
  }
}
