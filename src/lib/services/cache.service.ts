import {resolve} from 'path';
import {Page} from '@lamnhan/schemata';

import {FileService} from './file.service';
import {MetaData, DotNgxerRCDotJson, ProjectService} from './project.service';

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
    const cachedPath = this.getPath(input);
    if (!(await this.fileService.exists(cachedPath))) {
      return null;
    }
    const data = await this.fileService.readJson<Record<string, unknown>>(
      cachedPath
    );
    const meta = this.extractMeta(rcJson, input, data);
    if (!data || !meta) {
      return null;
    }
    return {data, meta};
  }

  async save(
    rcJson: DotNgxerRCDotJson,
    input: string,
    data: Record<string, unknown>
  ) {
    // process data
    const metaData: MetaData = {
      title:
        typeof data.title === 'string'
          ? data.title
          : this.projectService.defaultMetaData.title,
      description:
        typeof data.description === 'string'
          ? data.description
          : this.projectService.defaultMetaData.description,
      image:
        typeof data.image === 'string'
          ? data.image
          : this.projectService.defaultMetaData.image,
      url: data.id
        ? rcJson.url + '/' + data.id
        : typeof data.url !== 'string'
        ? this.projectService.defaultMetaData.url
        : data.url.substr(-1) === '/'
        ? data.url
        : data.url + '/',
      lang:
        typeof data.lang === 'string'
          ? data.lang
          : this.projectService.defaultMetaData.lang,
      locale:
        typeof data.locale === 'string'
          ? data.locale
          : this.projectService.defaultMetaData.locale,
      content:
        typeof data.content === 'string'
          ? data.content
          : this.projectService.defaultMetaData.content,
    };
    // save cache
    const cachePath = this.getPath(input);
    const cacheData =
      input.indexOf(':') !== -1 ? data : this.convertMeta(metaData);
    await this.fileService.createJson(cachePath, cacheData);
    // result
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
    const collection =
      input.indexOf(':') === -1
        ? 'pages'
        : (input.split(':').shift() as string);
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
    const url = data.id
      ? rcJson.url + '/' + data.id
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
