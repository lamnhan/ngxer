import {resolve} from 'path';
const minify = require('@node-minify/core');
const htmlMinifier = require('@node-minify/html-minifier');

import {HelperService} from './helper.service';
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

export interface ParsedHTML {
  template: string;
  styles: string[];
  styleBetweens: [string, string];
  scripts: string[];
  scriptBetweens: [string, string];
  title: string;
  titleBetweens: [string, string];
  titlePlaceholder: string;
  description: string;
  descriptionBetweens: [string, string];
  descriptionPlaceholder: string;
  image: string;
  imageBetweens: [string, string];
  imagePlaceholder: string;
  url: string;
  urlBetweens: [string, string];
  urlPlaceholder: string;
  lang: string;
  langBetweens: [string, string];
  langPlaceholder: string;
  locale: string;
  localeBetweens: [string, string];
  localePlaceholder: string;
}

export class ProjectService {
  public readonly rcFile = '.ngxerrc.json';
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
    return this.parseHTML(resolve(out));
  }

  async parseHTML(path: string) {
    path = path.indexOf('index.html') ? path : `${path}/index.html`;
    const rawHtmlContent = await this.fileService.readText(path);
    // strip all unneccesary code
    const htmlContent = await minify({
      compressor: htmlMinifier,
      content: rawHtmlContent,
    });
    // defined extract betweens and placeholder
    const titleBetweens = ['<title>', '</title>'];
    const titlePlaceholder = '{{TITLE}}';
    const descriptionBetweens = ['<meta name="description" content="', '"'];
    const descriptionPlaceholder = '{{DESCRIPTION}}';
    const imageBetweens = ['<meta property="og:image" content="', '"'];
    const imagePlaceholder = '{{IMAGE}}';
    const urlBetweens = ['<link rel="canonical" href="', '"'];
    const urlPlaceholder = '{{URL}}';
    const langBetweens = ['<html lang="', '"'];
    const langPlaceholder = '{{LANG}}';
    const localeBetweens = ['<meta property="og:locale" content="', '"'];
    const localePlaceholder = '{{LOCALE}}';
    const scriptBetweens = ['<script src="', '"'];
    const styleBetweens = ['<link rel="stylesheet" href="', '"'];
    // extract metas
    const title = this.helperService
      .stringsBetweens(htmlContent, titleBetweens[0], titleBetweens[1])
      .shift() as string;
    const description = this.helperService
      .stringsBetweens(
        htmlContent,
        descriptionBetweens[0],
        descriptionBetweens[1]
      )
      .shift() as string;
    const image = this.helperService
      .stringsBetweens(htmlContent, imageBetweens[0], imageBetweens[1])
      .shift() as string;
    const url = this.helperService
      .stringsBetweens(htmlContent, urlBetweens[0], urlBetweens[1])
      .shift() as string;
    const lang = this.helperService
      .stringsBetweens(htmlContent, langBetweens[0], langBetweens[1])
      .shift() as string;
    const locale = this.helperService
      .stringsBetweens(htmlContent, localeBetweens[0], localeBetweens[1])
      .shift() as string;
    // extract bundles
    const onlyVendorFilesFilter = (url: string) =>
      !url.startsWith('/') && !url.startsWith('http');
    const styles = this.helperService.stringsBetweens(
      htmlContent,
      styleBetweens[0],
      styleBetweens[1],
      onlyVendorFilesFilter
    );
    const scripts = this.helperService.stringsBetweens(
      htmlContent,
      scriptBetweens[0],
      scriptBetweens[1],
      onlyVendorFilesFilter
    );
    // make the template
    const template = htmlContent
      .replace(
        new RegExp(`${titleBetweens[0]}${title}${titleBetweens[1]}`, 'g'),
        titlePlaceholder
      )
      .replace(
        new RegExp(
          `${descriptionBetweens[0]}${description}${descriptionBetweens[1]}`,
          'g'
        ),
        descriptionPlaceholder
      )
      .replace(
        new RegExp(`${imageBetweens[0]}${image}${imageBetweens[1]}`, 'g'),
        imagePlaceholder
      )
      .replace(
        new RegExp(`${urlBetweens[0]}${url}${urlBetweens[1]}`, 'g'),
        urlPlaceholder
      )
      .replace(
        new RegExp(`${langBetweens[0]}${lang}${langBetweens[1]}`, 'g'),
        langPlaceholder
      )
      .replace(
        new RegExp(`${localeBetweens[0]}${locale}${localeBetweens[1]}`, 'g'),
        localePlaceholder
      );
    // result
    return {
      template,
      styles,
      styleBetweens,
      scripts,
      scriptBetweens,
      title,
      titleBetweens,
      titlePlaceholder,
      description,
      descriptionBetweens,
      descriptionPlaceholder,
      image,
      imageBetweens,
      imagePlaceholder,
      url,
      urlBetweens,
      urlPlaceholder,
      lang,
      langBetweens,
      langPlaceholder,
      locale,
      localeBetweens,
      localePlaceholder,
    } as ParsedHTML;
  }
}
