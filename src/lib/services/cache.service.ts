import {resolve} from 'path';
import {Page} from '@lamnhan/schemata';

import {FileService} from './file.service';
import {
  MetaData,
  DotNgxerRCDotJson,
  DatabaseRender,
  ProjectService,
} from './project.service';

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

  private convertMeta(metaData: MetaData) {
    const {title, description, image, url, locale, content} = metaData;
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Page;
  }

  private extractMeta(
    rcJson: DotNgxerRCDotJson,
    input: string,
    data: Record<string, unknown>
  ) {
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
    const title = data.title || this.projectService.defaultMetaData.title;
    const description =
      data.description ||
      data.excerpt ||
      this.projectService.defaultMetaData.description;
    const image = data.image || this.projectService.defaultMetaData.image;
    const url = databaseRender
      ? rcJson.url + '/' + databaseRender.path.replace(':id', docId)
      : data.url
      ? data.url
      : this.projectService.defaultMetaData.url;
    const locale = data.locale || this.projectService.defaultMetaData.locale;
    const lang =
      typeof locale === 'string'
        ? (locale.split('-').shift() as string)
        : this.projectService.defaultMetaData.lang;
    const content = data.content || this.projectService.defaultMetaData.content;
    // result
    return {title, description, image, url, locale, lang, content} as MetaData;
  }
}
