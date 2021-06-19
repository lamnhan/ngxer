import {resolve} from 'path';
import {green} from 'chalk';
import * as ora from 'ora';

import {WARN, ERROR} from '../../lib/services/message.service';
import {FileService} from '../../lib/services/file.service';
import {
  DatabaseRender,
  ProjectService,
} from '../../lib/services/project.service';
import {FirebaseService} from '../../lib/services/firebase.service';
import {RenderService} from '../../lib/services/render.service';
import {ReportService} from '../../lib/services/report.service';
import {SitemapService} from '../../lib/services/sitemap.service';

import {GenerateCommand} from './generate.command';

interface Options {
  live?: boolean;
}

export class UpdateCommand {
  constructor(
    private fileService: FileService,
    private projectService: ProjectService,
    private firebaseService: FirebaseService,
    private renderService: RenderService,
    private resportService: ReportService,
    private sitemapService: SitemapService,
    private generateCommand: GenerateCommand
  ) {}

  async run(paths: string[], options: Options) {
    // load data
    const gartheredData = await this.generateCommand.prepareData();
    if (!gartheredData) {
      return console.log(
        ERROR + 'No index.html found, invalid out path or need to build first.'
      );
    }
    const {dotNgxerRCDotJson, parsedIndexHTML, contentTemplate} = gartheredData;
    const {out, url, pathRender = [], databaseRender = []} = dotNgxerRCDotJson;
    const spinner = ora().start();
    // sort by rendering type
    const {
      pathRenderList,
      databaseRenderList,
      otherList: pathAdded,
    } = this.renderService.sortPaths(dotNgxerRCDotJson, paths);
    // path render (added - always live)
    if (pathAdded.length) {
      spinner.text = WARN + 'Live path rendering could take some time.';
      await this.generateCommand.livePathRender(
        spinner,
        dotNgxerRCDotJson,
        pathAdded,
        parsedIndexHTML,
        contentTemplate
      );
    }
    // path render
    if (pathRenderList.length) {
      // from cached
      if (!options.live) {
        await this.generateCommand.cachedPathRender(
          spinner,
          dotNgxerRCDotJson,
          pathRenderList,
          parsedIndexHTML,
          contentTemplate
        );
      }
      // live render
      else {
        spinner.text = WARN + 'Live path rendering could take some time.';
        await this.generateCommand.livePathRender(
          spinner,
          dotNgxerRCDotJson,
          pathRenderList,
          parsedIndexHTML,
          contentTemplate
        );
      }
    }
    // database render
    const databaseAdded: string[] = [];
    if (databaseRenderList.length) {
      // grouping
      const grouping: Record<
        string,
        {paths: string[]; config: DatabaseRender}
      > = {};
      const groupingAdded: Record<
        string,
        {paths: string[]; config: DatabaseRender}
      > = {};
      for (let i = 0; i < databaseRenderList.length; i++) {
        const {path, config} = databaseRenderList[i];
        const collection = config.collection;
        const docId = path.split('/').pop() as string;
        if (
          await this.fileService.exists(
            resolve(
              this.projectService.rcDir,
              'database_cached',
              collection,
              `${docId}.json`
            )
          )
        ) {
          if (!grouping[config.path]) {
            grouping[config.path] = {
              config,
              paths: [path],
            };
          } else {
            grouping[config.path].paths.push(path);
          }
        } else {
          databaseAdded.push(path);
          if (!groupingAdded[config.path]) {
            groupingAdded[config.path] = {
              config,
              paths: [path],
            };
          } else {
            groupingAdded[config.path].paths.push(path);
          }
        }
      }
      // added (always live)
      const groupingAddedKeys = Object.keys(groupingAdded);
      if (groupingAddedKeys.length) {
        await Promise.all(
          groupingAddedKeys.map(key =>
            (async () => {
              const {paths, config} = groupingAdded[key];
              // fetch docs
              const docs = await this.fetchDocs(config.collection, paths);
              // render
              return this.generateCommand.liveDatabaseRender(
                spinner,
                dotNgxerRCDotJson,
                config,
                docs,
                parsedIndexHTML,
                contentTemplate
              );
            })()
          )
        );
      }
      // from cached
      const groupingKeys = Object.keys(grouping);
      if (groupingKeys.length) {
        // from cached
        if (!options.live) {
          await Promise.all(
            groupingKeys.map(key =>
              (async () => {
                const {paths, config} = grouping[key];
                const docs = paths.map(path => ({
                  id: path.split('/').pop() as string,
                }));
                return this.generateCommand.cachedDatabaseRender(
                  spinner,
                  dotNgxerRCDotJson,
                  config,
                  docs,
                  parsedIndexHTML,
                  contentTemplate
                );
              })()
            )
          );
        }
        // live render
        else {
          await Promise.all(
            groupingKeys.map(key =>
              (async () => {
                const {paths, config} = grouping[key];
                // fetch docs
                const docs = await this.fetchDocs(config.collection, paths);
                // render
                return this.generateCommand.liveDatabaseRender(
                  spinner,
                  dotNgxerRCDotJson,
                  config,
                  docs,
                  parsedIndexHTML,
                  contentTemplate
                );
              })()
            )
          );
        }
      }
    }
    // update .ngxer.json#pathRender
    if (pathAdded.length) {
      await this.projectService.updateDotNgxerRCDotJson({
        pathRender: [...(dotNgxerRCDotJson.pathRender || []), ...pathAdded],
      });
    }
    // update sitemap & report
    if (pathAdded.length || databaseAdded.length) {
      const {
        indexRendering: indexRenderLatest,
        pathRendering,
        databaseRendering,
      } = await this.resportService.read();
      let pathRenderLatest = pathRendering;
      let databaseRenderLatest = databaseRendering;
      pathRenderLatest = [...pathRenderLatest, ...pathAdded];
      databaseRenderLatest = [...databaseRenderLatest, ...databaseAdded];
      // sitemap
      await this.sitemapService.save(out, url, [
        ...indexRenderLatest,
        ...pathRenderLatest,
        ...databaseRenderLatest,
      ]);
      // report
      await this.resportService.update(
        indexRenderLatest,
        pathRenderLatest,
        databaseRenderLatest
      );
    }
    // done
    spinner.stopAndPersist({
      symbol: green('[OK]'),
      text: 'Update completed!',
    });
  }

  async fetchDocs(collection: string, paths: string[]) {
    const firestore = await this.firebaseService.firestore();
    const docs: Array<Record<string, unknown>> = [];
    await Promise.all(
      paths.map(path =>
        (async () => {
          const docId = path.split('/').pop() as string;
          const doc = (await firestore.doc(`${collection}/${docId}`).get())
            .data;
          if (doc) {
            docs.push(doc as unknown as Record<string, unknown>);
          }
        })()
      )
    );
    return docs;
  }
}
