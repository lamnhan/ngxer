import {resolve} from 'path';
import {blue, yellow, grey, red, magenta} from 'chalk';

import {OK, INFO} from '../../lib/services/message.service';
import {FileService} from '../../lib/services/file.service';
import {ProjectService} from '../../lib/services/project.service';
import {CacheService} from '../../lib/services/cache.service';
import {HtmlService} from '../../lib/services/html.service';
import {RenderService} from '../../lib/services/render.service';
import {FirebaseService} from '../../lib/services/firebase.service';

export class GenerateCommand {
  constructor(
    private fileService: FileService,
    private projectService: ProjectService,
    private cacheService: CacheService,
    private htmlService: HtmlService,
    private renderService: RenderService,
    private firebaseService: FirebaseService
  ) {}

  async run() {
    // load data
    const dotNgxerDotJson = await this.projectService.loadDotNgxerRCDotJson();
    const {
      out,
      url,
      sitemap = false,
      pathRender = [],
      databaseRender = [],
      contentBetweens,
    } = dotNgxerDotJson;
    const parsedIndexHTML = await this.htmlService.parseIndex(out);

    // legends
    console.log(
      INFO +
        `Render legends: ${yellow('cached')} | ${magenta('live')} | ${grey(
          'exists'
        )} | ${red('error')}`
    );

    /**
     * path render (from manual paths or rc pathRender)
     */

    if (pathRender.length) {
      const pathRenderExisting = [] as string[];
      const pathRenderCache = [] as string[];
      const pathRenderLive = [] as string[];
      // filter
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
      // cache render
      console.log(INFO + 'Begin path rendering (could take some time):');
      if (pathRenderExisting.length) {
        pathRenderExisting.forEach(path =>
          console.log('  + ' + grey('/' + path))
        );
      }
      if (pathRenderCache.length) {
        await Promise.all(
          pathRenderCache.map(path =>
            (async () => {
              path = this.renderService.processPath(path);
              const cached = await this.cacheService.read(
                dotNgxerDotJson,
                path
              );
              // save file
              if (cached) {
                const filePath = resolve(out, path, 'index.html');
                await this.fileService.createFile(
                  filePath,
                  this.htmlService.composeContent(
                    parsedIndexHTML,
                    cached.meta,
                    cached.data
                  )
                );
                console.log('  + ' + yellow('/' + path));
              } else {
                console.log('  + ' + red('/' + path));
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
            const metaData = await this.htmlService.parseContent(
              pageContent,
              contentBetweens
            );
            metaData.url = url + '/' + path + '/';
            // cache
            const cached = await this.cacheService.save(
              dotNgxerDotJson,
              path,
              metaData as unknown as Record<string, unknown>
            );
            // save file
            const filePath = resolve(out, path, 'index.html');
            await this.fileService.createFile(
              filePath,
              this.htmlService.composeContent(
                parsedIndexHTML,
                cached.meta,
                cached.data
              )
            );
            console.log('  + ' + magenta('/' + path));
          }
        );
      }
      // done
      console.log(OK + 'Path rendering completed.');
    }

    /**
     * database render
     */

    const databaseRenderResults = [] as string[]; // for sitemap
    if (databaseRender.length) {
      console.log(INFO + 'Begin database rendering.');
      await Promise.all(
        databaseRender.map(databaseRenderItem =>
          (async () => {
            const {collection, type, locale} = databaseRenderItem;
            const collectionCachedDir = resolve(
              this.projectService.rcDir,
              'database_cached',
              collection
            );
            const firestore = await this.firebaseService.firestore();
            const collectionQuery = firestore
              .collection(collection)
              .where('type', '==', type)
              .where('status', '==', 'publish')
              .where('locale', '==', locale)
              .orderBy('createdAt', 'asc');
            // load docs
            const databaseRenderDocs = [] as Array<Record<string, unknown>>;
            if (!(await this.fileService.exists(collectionCachedDir))) {
              // load data for the fist time
              const docs = (
                await collectionQuery.limitToLast(1000).get()
              ).docs.map(doc => doc.data());
              databaseRenderDocs.push(...docs);
            } else {
              // load latest 30 items
              const docs = (
                await collectionQuery.limitToLast(30).get()
              ).docs.map(doc => doc.data());
              for (let i = 0; i < docs.length; i++) {
                const doc = docs[i];
                if (
                  !(await this.fileService.exists(
                    resolve(collectionCachedDir, doc.id + '.json')
                  ))
                ) {
                  databaseRenderDocs.push(doc);
                }
              }
            }
            // begin render
            await this.renderService.collectionRender(
              databaseRenderItem,
              databaseRenderDocs,
              async (path, cacheInput, data) => {
                // save cache
                const cached = await this.cacheService.save(
                  dotNgxerDotJson,
                  cacheInput,
                  data
                );
                // save files
                const filePath = resolve(out, path, 'index.html');
                await this.fileService.createFile(
                  filePath,
                  this.htmlService.composeContent(
                    parsedIndexHTML,
                    cached.meta,
                    cached.data
                  )
                );
                console.log('  + ' + magenta('/' + path));
                // for sitmap
                databaseRenderResults.push(path);
              }
            );
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
      const sitemapItems = [] as string[];
      // path renders
      sitemapItems.push(...pathRender, ...databaseRenderResults);
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
