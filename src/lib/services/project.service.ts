import {resolve} from 'path';
const minify = require('@node-minify/core');
const htmlMinifier = require('@node-minify/html-minifier');

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
  path: string; // xxx/:id
}

export type RenderingTypes = 'path' | 'database';

export interface MetaData {
  title: string;
  description: string;
  image: string;
  url: string;
  lang: string;
  locale: string;
  content: string;
}

export interface ParsedHTML extends MetaData {
  full: string;
  // content: string;
  contentBetweens: [string, string];
  styles: string[];
  styleBetweens: [string, string];
  scripts: string[];
  scriptBetweens: [string, string];
  // title: string;
  titleBetweens: [string, string];
  description: string;
  descriptionBetweens: [string, string];
  // image: string;
  imageBetweens: [string, string];
  // url: string;
  urlBetweens: [string, string];
  // lang: string;
  langBetweens: [string, string];
  // locale: string;
  localeBetweens: [string, string];
}

export class ProjectService {
  public readonly rcDir = 'ngxer';
  public readonly rcFile = '.ngxerrc.json';
  private defaultMetaData: MetaData = {
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

  getCachePath(type: RenderingTypes, input: string) {
    return resolve(
      this.rcDir,
      `${type}_cached`,
      `${input.replace(':', '/')}.json`
    );
  }

  cacheExists(type: RenderingTypes, input: string) {
    return this.fileService.exists(this.getCachePath(type, input));
  }

  async readCache(type: RenderingTypes, input: string) {
    const cachedPath = this.getCachePath(type, input);
    if (!(await this.fileService.exists(cachedPath))) {
      return null;
    }
    return this.fileService.readJson<MetaData>(cachedPath);
  }

  async saveCache(
    type: RenderingTypes,
    input: string,
    data: Record<string, unknown>
  ) {
    // process data
    const metaData: MetaData = {
      title:
        typeof data.title === 'string'
          ? data.title
          : this.defaultMetaData.title,
      description:
        typeof data.description === 'string'
          ? data.description
          : this.defaultMetaData.description,
      image:
        typeof data.image === 'string'
          ? data.image
          : this.defaultMetaData.image,
      url:
        typeof data.url !== 'string'
          ? this.defaultMetaData.url
          : data.url.substr(-1) === '/'
          ? data.url
          : data.url + '/',
      lang:
        typeof data.lang === 'string' ? data.lang : this.defaultMetaData.lang,
      locale:
        typeof data.locale === 'string'
          ? data.locale
          : this.defaultMetaData.locale,
      content:
        typeof data.content === 'string'
          ? data.content
          : this.defaultMetaData.content,
    };
    // save cache
    const cachePath = this.getCachePath(type, input);
    await this.fileService.createJson(cachePath, metaData);
    // result
    return {path: cachePath, data: metaData};
  }

  async removeCache(type: RenderingTypes, input: string) {
    return this.fileService.removeFile(this.getCachePath(type, input));
  }

  async parseIndexHTML(out: string) {
    return this.parseHTMLFile(resolve(out));
  }

  async parseHTMLFile(path: string) {
    path = path.indexOf('index.html') !== -1 ? path : `${path}/index.html`;
    const rawHtmlContent = await this.fileService.readText(path);
    return this.parseHTMLContent(rawHtmlContent);
  }

  async parseHTMLContent(
    rawHtmlContent: string,
    customContentBetweens?: [string, string]
  ) {
    // strip all unneccesary code
    const htmlContent = await minify({
      compressor: htmlMinifier,
      content: rawHtmlContent,
      options: {
        removeAttributeQuotes: false,
      },
    });
    // defined extract betweens and placeholder
    const titleBetweens = ['<title>', '</title>'];
    const descriptionBetweens = ['<meta name="description" content="', '"'];
    const imageBetweens = ['<meta property="og:image" content="', '"'];
    const urlBetweens = ['<link rel="canonical" href="', '"'];
    const langBetweens = ['<html lang="', '"'];
    const localeBetweens = ['<meta property="og:locale" content="', '"'];
    const scriptBetweens = ['<script src="', '"'];
    const styleBetweens = ['<link rel="stylesheet" href="', '"'];
    const contentBetweens = customContentBetweens
      ? customContentBetweens
      : ['</router-outlet>', '</main>'];
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
    const content = this.helperService
      .stringsBetweens(htmlContent, contentBetweens[0], contentBetweens[1])
      .shift() as string;
    // result
    return {
      full: htmlContent,
      content,
      contentBetweens,
      styles,
      styleBetweens,
      scripts,
      scriptBetweens,
      title,
      titleBetweens,
      description,
      descriptionBetweens,
      image,
      imageBetweens,
      url,
      urlBetweens,
      lang,
      langBetweens,
      locale,
      localeBetweens,
    } as ParsedHTML;
  }

  composeHTMLContent(templateData: ParsedHTML, data: MetaData) {
    const {
      full: htmlContent,
      title: templateTitle,
      description: templateDescription,
      image: templateImage,
      url: templateUrl,
      lang: templateLang,
      locale: templateLocale,
      scripts,
      styles,
    } = templateData;
    const {content, title, description, image, lang, locale} = data;
    const url = !data.url
      ? ''
      : data.url.substr(-1) === '/'
      ? data.url
      : data.url + '/';
    const {
      content: defaultContent,
      title: defaultTitle,
      description: defaultDescription,
      image: defaultImage,
      url: defaultUrl,
      lang: defaultLang,
      locale: defaultLocale,
    } = this.defaultMetaData;
    // meta replacements
    let finalContent = htmlContent
      .replace(new RegExp(templateTitle, 'g'), title || defaultTitle)
      .replace(
        new RegExp(templateDescription, 'g'),
        description || defaultDescription
      )
      .replace(new RegExp(templateImage, 'g'), image || defaultImage)
      .replace(new RegExp(`="${templateUrl}"`, 'g'), `="${url || defaultUrl}"`)
      .replace(`="${templateLocale}"`, `="${locale || defaultLocale}"`)
      .replace(`lang="${templateLang}"`, `lang="${lang || defaultLang}"`);
    // scripts replacement (to absolute)
    scripts.forEach(
      script =>
        (finalContent = finalContent.replace(
          new RegExp(`src="${script}"`, 'g'),
          `src="/${script}"`
        ))
    );
    // styles replacement (to absolute)
    styles.forEach(
      style =>
        (finalContent = finalContent.replace(
          new RegExp(`href="${style}"`, 'g'),
          `href="/${style}"`
        ))
    );
    // content replacement
    finalContent = finalContent.replace(
      '<app-root></app-root>',
      `<app-root>${content || defaultContent}</app-root>`
    );
    // result
    return finalContent;
  }
}
