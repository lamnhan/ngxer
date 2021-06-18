import {resolve} from 'path';
import {Page} from '@lamnhan/schemata';

import {FileService} from './file.service';
import {
  DotNgxerRCDotJson,
  DatabaseRender,
  ProjectService,
} from './project.service';
import {MetaData} from './html.service';

export class CacheService {
  public readonly allowedCollections = [
    'audios',
    'authors',
    'bundles',
    'categories',
    'tags',
    'pages',
    'posts',
    'products',
    'profiles',
    'tags',
    'videos',
  ];

  constructor(
    private fileService: FileService,
    private projectService: ProjectService
  ) {}

  getPath(input: string) {
    const type = input.indexOf(':') !== -1 ? 'database' : 'path';
    return resolve(
      this.projectService.rcDir,
      `${type}_cached`,
      `${input.replace(':', '/')}.json`
    );
  }

  exists(input: string) {
    return this.fileService.exists(this.getPath(input));
  }

  async read(rcJson: DotNgxerRCDotJson, input: string) {
    const cachePath = this.getPath(input);
    if (!(await this.fileService.exists(cachePath))) {
      return null;
    }
    const cacheData = await this.fileService.readJson<Record<string, unknown>>(
      cachePath
    );
    if (!cacheData) {
      return null;
    }
    const metaData = this.extractMeta(rcJson, input, cacheData);
    if (!metaData) {
      return null;
    }
    return {
      path: cachePath,
      meta: metaData,
      data: cacheData as Record<string, unknown>,
    };
  }

  async save(
    rcJson: DotNgxerRCDotJson,
    input: string,
    data: MetaData | Record<string, unknown>
  ) {
    const isPathRendering = input.indexOf(':') === -1;
    const cachePath = this.getPath(input);
    // build meta
    const metaData = isPathRendering
      ? (data as MetaData)
      : this.extractMeta(rcJson, input, data as Record<string, unknown>);
    if (!metaData) {
      return null;
    }
    // build data
    const cacheData = !isPathRendering ? data : this.convertMeta(metaData);
    // save cache & result
    await this.fileService.createJson(cachePath, cacheData);
    return {
      path: cachePath,
      meta: metaData,
      data: cacheData as Record<string, unknown>,
    };
  }

  async remove(input: string) {
    return this.fileService.removeFile(this.getPath(input));
  }

  private convertMeta(metaData: MetaData): Page {
    const {
      url,
      title,
      description,
      image,
      locale,
      createdAt,
      updatedAt,
      content,
    } = metaData;
    const urlSplits = url.split('/');
    const id = urlSplits[urlSplits.length - 1]
      ? urlSplits[urlSplits.length - 1]
      : urlSplits[urlSplits.length - 2];
    return {
      id,
      title,
      description,
      thumbnail: image,
      image,
      locale,
      origin: id,
      content,
      type: 'page',
      status: 'publish',
      createdAt,
      updatedAt,
    };
  }

  private extractMeta(
    rcJson: DotNgxerRCDotJson,
    input: string,
    data: Record<string, unknown>
  ): null | MetaData {
    const isPathRendering = input.indexOf(':') === -1;
    const [collection, docId] = (isPathRendering ? 'pages' : input).split(':');
    const databaseRender = isPathRendering
      ? null
      : ((rcJson.databaseRender || [])
          .filter(item => item.collection === collection)
          .shift() as DatabaseRender);
    // ignore private colelctions
    if (this.allowedCollections.indexOf(collection) === -1) {
      return null;
    }
    // data
    const url = (
      databaseRender
        ? rcJson.url + '/' + databaseRender.path.replace(':id', docId)
        : data.url
        ? data.url
        : rcJson.url
    ) as string;
    const title = data.title as string;
    const description = data.description as string;
    const image = (data.image ||
      `${rcJson.url}/assets/images/featured.jpg`) as string;
    const locale = data.locale as string;
    const lang = locale.split('-').shift() as string;
    const createdAt = data.createdAt as string;
    const updatedAt = data.updatedAt as string;
    const content = data.content as string;
    // result
    return {
      url,
      title,
      description,
      image,
      locale,
      lang,
      createdAt,
      updatedAt,
      content,
    };
  }
}
