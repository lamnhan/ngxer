import {resolve} from 'path';

import {HelperService} from './helper.service';
import {FileService} from './file.service';

export interface DotNgxerRCDotJson {
  out: string;
  url: string;
  sitemap?: boolean;
  pathRender?: string[];
  databaseRender?: DatabaseRender[];
  contentBetweens?: [string, string];
}

export interface DatabaseRender {
  collection: string;
  type: string;
  locale: string;
  path: string; // xxx/:id
}

export interface MetaData {
  title: string;
  description: string;
  image: string;
  url: string;
  lang: string;
  locale: string;
  content: string;
}

export class ProjectService {
  public readonly rcDir = 'ngxer';
  public readonly rcFile = '.ngxerrc.json';
  public readonly defaultMetaData: MetaData = {
    title: 'Invalid title',
    description: 'Invalid description',
    image: 'https://invalid.image/none.jpg',
    url: 'https://invalid.url/',
    lang: 'en',
    locale: 'en-US',
    content: '<p>Invalid content ...</p>',
  };
  constructor(
    private helperService: HelperService,
    private fileService: FileService
  ) {}

  isValid(projectPath = '.') {
    return this.fileService.exists(resolve(projectPath, this.rcFile));
  }

  loadDotNgxerRCDotJson(projectPath = '.') {
    return this.fileService.readJson<DotNgxerRCDotJson>(
      resolve(projectPath, this.rcFile)
    );
  }

  createDotNgxerRCDotJson(projectPath = '.') {
    return this.fileService.createJson(resolve(projectPath, this.rcFile), {
      out: 'docs',
      url: 'https://ngxer.lamnhan.com',
      sitemap: true,
      pathRender: [],
      databaseRender: [],
    });
  }

  async updateDotNgxerRCDotJson(
    data: {[P in keyof DotNgxerRCDotJson]?: DotNgxerRCDotJson[P]}
  ) {
    const dotNgxerRCDotJson = await this.loadDotNgxerRCDotJson();
    await this.fileService.createJson(this.rcFile, {
      ...dotNgxerRCDotJson,
      ...data,
    });
  }
}
