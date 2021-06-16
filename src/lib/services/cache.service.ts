import {resolve} from 'path';

import {FileService} from './file.service';
import {RenderingTypes, MetaData, ProjectService} from './project.service';

export class CacheService {
  constructor(
    private fileService: FileService,
    private projectService: ProjectService
  ) {}

  getPath(type: RenderingTypes, input: string) {
    return resolve(
      this.projectService.rcDir,
      `${type}_cached`,
      `${input.replace(':', '/')}.json`
    );
  }

  exists(type: RenderingTypes, input: string) {
    return this.fileService.exists(this.getPath(type, input));
  }

  async read(type: RenderingTypes, input: string) {
    const cachedPath = this.getPath(type, input);
    if (!(await this.fileService.exists(cachedPath))) {
      return null;
    }
    return this.fileService.readJson<MetaData>(cachedPath);
  }

  async save(
    type: RenderingTypes,
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
      url:
        typeof data.url !== 'string'
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
    const cachePath = this.getPath(type, input);
    await this.fileService.createJson(cachePath, metaData);
    // result
    return {path: cachePath, data: metaData};
  }

  async remove(type: RenderingTypes, input: string) {
    return this.fileService.removeFile(this.getPath(type, input));
  }
}