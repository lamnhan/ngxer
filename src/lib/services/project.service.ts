import {resolve} from 'path';
const minify = require('@node-minify/core');
const htmlMinifier = require('@node-minify/html-minifier');

import {FileService} from './file.service';

export interface DotNgxerRCDotJson {
  out?: string;
  url?: string;
  sitemap?: boolean;
  pathRender?: string[];
  databaseRender?: DatabaseRender[];
}

export interface DatabaseRender {
  collection: string;
  output: string;
  locale?: string;
}

export interface ParsedIndexHTML {
  template: string;
}

export class ProjectService {
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
      out: 'firebase/public',
      url: '',
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

  async parseIndexHTML(out: string) {
    const indexHTMLPath = resolve(out, 'index.html');
    let indexContent = await this.fileService.readText(indexHTMLPath);
    // strip all unneccesary code
    indexContent = await minify({
      compressor: htmlMinifier,
      content: indexContent,
    });
    // extract bundles
    // result
    return {} as ParsedIndexHTML;
  }
}
