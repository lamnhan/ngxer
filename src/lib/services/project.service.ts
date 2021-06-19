import {resolve} from 'path';

import {FileService} from './file.service';
import {MetaData} from './html.service';

export interface DotNgxerRCDotJson {
  out: string;
  url: string;
  pathRender?: string[];
  databaseRender?: DatabaseRender[];
  sitemap?: boolean;
  homePage?: string | Record<string, HomeConfig>;
  contentTemplate?: string | Record<string, string>;
  contentBetweens?: [string, string];
  databaseLimitFirstTime?: number;
  databaseLimit?: number;
  includeSessionData?: boolean;
  splashscreenTimeout?: number; // number of seconds
}

export interface HomeConfig {
  content?: string;
  metas?: MetaData;
}

export interface DatabaseRender {
  collection: string;
  type: string;
  locale: string;
  path: string; // xxx/:id
}

export class ProjectService {
  public readonly rcDir = 'ngxer';
  public readonly rcFile = '.ngxerrc.json';

  constructor(private fileService: FileService) {}

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
