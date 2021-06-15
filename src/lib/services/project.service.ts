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
}

export interface DatabaseRender {
  collection: string;
  output: string;
  locale?: string;
}

export interface ParsedHTML {
  full: string;
  content: string;
  contentBetweens: [string, string];
  styles: string[];
  styleBetweens: [string, string];
  scripts: string[];
  scriptBetweens: [string, string];
  title: string;
  titleBetweens: [string, string];
  description: string;
  descriptionBetweens: [string, string];
  image: string;
  imageBetweens: [string, string];
  url: string;
  urlBetweens: [string, string];
  lang: string;
  langBetweens: [string, string];
  locale: string;
  localeBetweens: [string, string];
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

  async parseIndexHTML(out: string) {
    return this.parseHTMLFile(resolve(out));
  }

  async parseHTMLFile(path: string) {
    path = path.indexOf('index.html') !== -1 ? path : `${path}/index.html`;
    const rawHtmlContent = await this.fileService.readText(path);
    return this.parseHTMLContent(rawHtmlContent);
  }

  async parseHTMLContent(rawHtmlContent: string) {
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
    const contentBetweens = ['</router-outlet>', '</main>'];
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

  composeHTMLContent(templateData: ParsedHTML, data: ParsedHTML) {
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
    const {content, title, description, image, url, lang, locale} = data;
    // meta replacements
    let finalContent = htmlContent
      .replace(new RegExp(templateTitle, 'g'), title)
      .replace(new RegExp(templateDescription, 'g'), description)
      .replace(new RegExp(templateImage, 'g'), image)
      .replace(new RegExp(templateUrl, 'g'), url)
      .replace(templateLocale, locale)
      .replace(`lang="${templateLang}"`, `lang="${lang}"`);
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
      `<app-root>${content}</app-root>`
    );
    // result
    return finalContent;
  }
}
