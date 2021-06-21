import {resolve} from 'path';
const minify = require('@node-minify/core');
const htmlMinifier = require('@node-minify/html-minifier');

import {HelperService} from './helper.service';
import {FileService} from './file.service';
import {ProjectService} from './project.service';

export interface MetaData {
  url: string;
  title: string;
  description: string;
  image: string;
  locale: string;
  lang: string;
  authorName: string;
  authorUrl: string;
  createdAt: string;
  updatedAt: string;
  content: string;
}

export interface ParsedHTML extends MetaData {
  urlBetweens: [string, string];
  titleBetweens: [string, string];
  descriptionBetweens: [string, string];
  imageBetweens: [string, string];
  localeBetweens: [string, string];
  authorNameBetweens: [string, string];
  authorUrlBetweens: [string, string];
  createdAtBetweens: [string, string];
  updatedAtBetweens: [string, string];
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
    private fileService: FileService,
    private projectService: ProjectService
  ) {}

  async minifyContent(
    rawHtmlContent: string,
    advanced?: true | Record<string, unknown>
  ) {
    return minify({
      compressor: htmlMinifier,
      content: rawHtmlContent,
      options: {
        removeAttributeQuotes: false,
        removeEmptyAttributes: true,
        removeRedundantAttributes: true,
        ...(advanced === true
          ? {
              removeComments: true,
              removeEmptyElements: true,
            }
          : advanced),
      },
    });
  }

  indexPath(out: string) {
    return resolve(out, 'index.html');
  }

  indexOriginalPath(out: string) {
    return resolve(out, 'index-original.html');
  }

  isIndexExists(out: string) {
    return this.fileService.exists(this.indexPath(out));
  }

  isIndexOriginalExists(out: string) {
    return this.fileService.exists(this.indexOriginalPath(out));
  }

  async processContentOrPath(input: string) {
    return input.substr(-5) !== '.html'
      ? input
      : await this.fileService.readText(
          resolve(input.replace('@', this.projectService.rcDir + '/'))
        );
  }

  composePageContent(
    content: string,
    contentTemplate: string | Record<string, string> = '',
    locale: string
  ) {
    const textContentTemplate =
      typeof contentTemplate === 'string'
        ? contentTemplate
        : contentTemplate[locale];
    return this.minifyContent(
      textContentTemplate.replace(
        '<!--PRERENDER_CONTENT_PLACEHOLDER-->',
        content
      ),
      true
    );
  }

  async saveIndex(
    out: string,
    parsedHTML: ParsedHTML,
    content: string,
    contentTemplate: string | Record<string, string> = '',
    metas?: MetaData,
    locale?: string,
    splashscreenTimeout = 0,
    i18nIndexes = false
  ) {
    locale = locale || parsedHTML.locale;
    const isLocalizing = !!metas;
    // page content between <app-root></app-root>
    const indexContent = await this.composePageContent(
      content,
      contentTemplate,
      locale
    );
    // final file content
    const indexFinal = await (() => {
      metas = (metas || {}) as MetaData; // {} -> for main index.html
      // localized only
      if (isLocalizing && !metas.url) {
        const url =
          parsedHTML.url.substr(-1) === '/'
            ? parsedHTML.url
            : parsedHTML.url + '/';
        metas.url = `${url}${locale}/`;
      }
      if (!metas.locale) {
        metas.locale = locale;
      }
      if (!metas.content) {
        metas.content = indexContent;
      }
      // result
      return this.composeContent(
        parsedHTML,
        metas,
        undefined,
        null,
        splashscreenTimeout
      );
    })();
    // localized indexes
    if (i18nIndexes) {
      const localeLowerCased = locale.toLowerCase();
      const [languageCode, countryCode] = localeLowerCased.split('-');
      const i18nNames = [
        locale,
        localeLowerCased,
        // firebase/other variants
        languageCode,
        `${languageCode}_${countryCode}`,
        `ALL_${countryCode}`,
        `${languageCode}_ALL`,
      ];
      // localized indexes
      await Promise.all(
        i18nNames.map(dir =>
          this.fileService.createFile(
            resolve(out, dir, 'index.html'),
            indexFinal
          )
        )
      );
    }
    // main index
    if (!isLocalizing) {
      return this.fileService.createFile(this.indexPath(out), indexFinal);
    }
  }

  async parseIndex(out: string, customContentBetweens?: [string, string]) {
    const indexOriginalPath = this.indexOriginalPath(out);
    if (!(await this.fileService.exists(indexOriginalPath))) {
      await this.fileService.copy(this.indexPath(out), indexOriginalPath);
    }
    return this.parseFile(indexOriginalPath, customContentBetweens);
  }

  async parseFile(path: string, customContentBetweens?: [string, string]) {
    path = path.indexOf('.html') !== -1 ? path : `${path}/index.html`;
    const rawHtmlContent = await this.fileService.readText(path);
    return this.parseContent(rawHtmlContent, customContentBetweens);
  }

  async parseContent(
    rawHtmlContent: string,
    customContentBetweens?: [string, string]
  ) {
    // strip all unneccesary code
    const htmlContent = await this.minifyContent(rawHtmlContent);
    // defined extract betweens and placeholder
    const urlBetweens = ['<link rel="canonical" href="', '"'];
    const titleBetweens = ['<title>', '</title>'];
    const descriptionBetweens = ['<meta name="description" content="', '"'];
    const imageBetweens = ['<meta itemprop="image" content="', '"'];
    const localeBetweens = ['<meta itemprop="inLanguage" content="', '"'];
    const authorNameBetweens = ['<meta itemprop="author" content="', '"'];
    const authorUrlBetweens = ['<link rel="author" href="', '"'];
    const createdAtBetweens = ['<meta itemprop="dateCreated" content="', '"'];
    const updatedAtBetweens = ['<meta itemprop="dateModified" content="', '"'];
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
    const lang = locale.split('-').shift() as string;
    const authorName = this.helperService
      .stringsBetweens(
        htmlContent,
        authorNameBetweens[0],
        authorNameBetweens[1]
      )
      .shift() as string;
    const authorUrl = this.helperService
      .stringsBetweens(htmlContent, authorUrlBetweens[0], authorUrlBetweens[1])
      .shift() as string;
    const createdAt = this.helperService
      .stringsBetweens(htmlContent, createdAtBetweens[0], createdAtBetweens[1])
      .shift() as string;
    const updatedAt = this.helperService
      .stringsBetweens(htmlContent, updatedAtBetweens[0], updatedAtBetweens[1])
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
      authorName,
      authorNameBetweens,
      authorUrl,
      authorUrlBetweens,
      createdAt,
      createdAtBetweens,
      updatedAt,
      updatedAtBetweens,
      styles,
      styleBetweens,
      scripts,
      scriptBetweens,
      content,
      contentBetweens,
      full: htmlContent,
    } as ParsedHTML;
  }

  async composeContent(
    parsedHTML: ParsedHTML,
    metaData: MetaData,
    contentTemplate?: string | Record<string, string>,
    sessionData?: null | Record<string, unknown>,
    splashscreenTimeout = 0
  ) {
    const {
      url: templateUrl,
      title: templateTitle,
      description: templateDescription,
      image: templateImage,
      locale: templateLocale,
      lang: templateLang,
      authorName: templateAuthorName,
      authorUrl: templateAuthorUrl,
      createdAt: templateCreatedAt,
      updatedAt: templateUpdatedAt,
      scripts,
      styles,
      content: templateContent,
      full: htmlContent,
    } = parsedHTML;
    const {
      title,
      description,
      image,
      locale,
      authorName,
      authorUrl,
      createdAt,
      updatedAt,
      content,
    } = metaData;
    const url = !metaData.url
      ? ''
      : metaData.url.substr(-1) === '/'
      ? metaData.url
      : metaData.url + '/';
    const lang = metaData.lang
      ? metaData.lang
      : locale
      ? (locale.split('-').shift() as string)
      : '';
    // meta replacements
    let finalContent = htmlContent
      .replace(new RegExp(templateTitle, 'g'), title || templateTitle)
      .replace(
        new RegExp(`="${templateDescription}"`, 'g'),
        `="${description || templateDescription}"`
      )
      .replace(
        new RegExp(`="${templateImage}"`, 'g'),
        `="${image || templateImage}"`
      )
      .replace(new RegExp(`="${templateUrl}"`, 'g'), `="${url || templateUrl}"`)
      .replace(
        new RegExp(`="${templateLocale}"`, 'g'),
        `="${locale || templateLocale}"`
      )
      .replace(`lang="${templateLang}"`, `lang="${lang || templateLang}"`)
      .replace(
        `="${templateAuthorName}"`,
        `="${authorName || templateAuthorName}"`
      )
      .replace(
        `="${templateAuthorUrl}"`,
        `="${authorUrl || templateAuthorUrl}"`
      )
      .replace(
        new RegExp(`="${templateCreatedAt}"`, 'g'),
        `="${createdAt || templateCreatedAt}"`
      )
      .replace(
        new RegExp(`="${templateUpdatedAt}"`, 'g'),
        `="${updatedAt || templateUpdatedAt}"`
      );
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
    let pageContent =
      content || templateContent || templateDescription || templateTitle;
    if (contentTemplate) {
      pageContent = await this.composePageContent(
        pageContent,
        contentTemplate,
        locale || templateLocale
      );
    }
    finalContent = finalContent.replace(
      '<app-root></app-root>',
      `<app-root>${pageContent}</app-root>`
    );
    // splashscreen time out
    if (splashscreenTimeout > 0) {
      const time = splashscreenTimeout * 1000;
      const timeoutScript = [
        '<script>',
        `(()=>{setTimeout(()=>{var a=document.getElementById("app-splash-screen");if(a){a.classList.add("hidden");}},${time})})();`,
        '</script>',
      ].join('');
      finalContent = finalContent.replace(
        '</title>',
        `</title>${timeoutScript}`
      );
    }
    // session data
    if (sessionData && sessionData.id) {
      const sessionDataScript = [
        '<script>',
        `(()=>{if(window.sessionStorage){sessionStorage.setItem('prerender_data:${
          sessionData.id
        }','${JSON.stringify(sessionData)}');}})();`,
        '</script>',
      ].join('');
      finalContent = finalContent.replace(
        '</title>',
        `</title>${sessionDataScript}`
      );
    }
    // web manifests
    finalContent = finalContent.replace(
      `${templateLocale}.webmanifest`,
      `${locale || templateLocale}.webmanifest`
    );
    // result
    return finalContent;
  }
}
