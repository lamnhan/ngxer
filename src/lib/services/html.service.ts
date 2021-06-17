import {resolve} from 'path';
const minify = require('@node-minify/core');
const htmlMinifier = require('@node-minify/html-minifier');

import {HelperService} from './helper.service';
import {FileService} from './file.service';

export interface MetaData {
  url: string;
  title: string;
  description: string;
  image: string;
  locale: string;
  lang: string;
  content: string;
}

export interface ParsedHTML extends MetaData {
  urlBetweens: [string, string];
  titleBetweens: [string, string];
  description: string;
  descriptionBetweens: [string, string];
  imageBetweens: [string, string];
  localeBetweens: [string, string];
  langBetweens: [string, string];
  styles: string[];
  styleBetweens: [string, string];
  scripts: string[];
  scriptBetweens: [string, string];
  contentBetweens: [string, string];
  full: string;
}

export class HtmlService {
  constructor(
    private helperService: HelperService,
    private fileService: FileService
  ) {}

  async parseIndex(out: string, customContentBetweens?: [string, string]) {
    return this.parseFile(resolve(out), customContentBetweens);
  }

  async parseFile(path: string, customContentBetweens?: [string, string]) {
    path = path.indexOf('index.html') !== -1 ? path : `${path}/index.html`;
    const rawHtmlContent = await this.fileService.readText(path);
    return this.parseContent(rawHtmlContent, customContentBetweens);
  }

  async parseContent(
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
    const urlBetweens = ['<link rel="canonical" href="', '"'];
    const titleBetweens = ['<title>', '</title>'];
    const descriptionBetweens = ['<meta name="description" content="', '"'];
    const imageBetweens = ['<meta itemprop="image" content="', '"'];
    const localeBetweens = ['<meta itemprop="inLanguage" content="', '"'];
    const langBetweens = ['<html lang="', '"'];
    const scriptBetweens = ['<script src="', '"'];
    const styleBetweens = ['<link rel="stylesheet" href="', '"'];
    const contentBetweens = customContentBetweens
      ? customContentBetweens
      : ['</router-outlet>', '</main>'];
    // extract metas
    const url = this.helperService
      .stringsBetweens(htmlContent, urlBetweens[0], urlBetweens[1])
      .shift() as string;
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
    const locale = this.helperService
      .stringsBetweens(htmlContent, localeBetweens[0], localeBetweens[1])
      .shift() as string;
    const lang = this.helperService
      .stringsBetweens(htmlContent, langBetweens[0], langBetweens[1])
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
      url,
      urlBetweens,
      title,
      titleBetweens,
      description,
      descriptionBetweens,
      image,
      imageBetweens,
      locale,
      localeBetweens,
      lang,
      langBetweens,
      styles,
      styleBetweens,
      scripts,
      scriptBetweens,
      content,
      contentBetweens,
      full: htmlContent,
    } as ParsedHTML;
  }

  composeContent(
    templateData: ParsedHTML,
    metaData: MetaData,
    sessionData?: Record<string, unknown>
  ) {
    const {
      url: templateUrl,
      title: templateTitle,
      description: templateDescription,
      image: templateImage,
      locale: templateLocale,
      lang: templateLang,
      scripts,
      styles,
      content: templateContent,
      full: htmlContent,
    } = templateData;
    const {title, description, image, locale, lang, content} = metaData;
    const url = !metaData.url
      ? ''
      : metaData.url.substr(-1) === '/'
      ? metaData.url
      : metaData.url + '/';
    // meta replacements
    let finalContent = htmlContent
      .replace(new RegExp(templateTitle, 'g'), title || templateTitle)
      .replace(
        new RegExp(templateDescription, 'g'),
        description || templateDescription
      )
      .replace(new RegExp(templateImage, 'g'), image || templateImage)
      .replace(new RegExp(`="${templateUrl}"`, 'g'), `="${url || templateUrl}"`)
      .replace(
        new RegExp(`="${templateLocale}"`, 'g'),
        `="${locale || templateLocale}"`
      )
      .replace(`lang="${templateLang}"`, `lang="${lang || templateLang}"`);
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
      `<app-root>${content || templateContent || templateTitle}</app-root>`
    );
    // session data
    if (sessionData) {
      const scriptCode = `<script>if(window.sessionStorage){sessionStorage.setItem('PRERENDER_DATA','${JSON.stringify(
        sessionData
      )}');}</script>`;
      finalContent = finalContent.replace('</title>', `</title>${scriptCode}`);
    }
    // result
    return finalContent;
  }
}
