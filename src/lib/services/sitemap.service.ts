import {resolve} from 'path';

import {FileService} from './file.service';

export class SitemapService {
  constructor(private fileService: FileService) {}

  async save(out: string, url: string, paths: string[]) {
    const content = this.build(url, paths);
    return this.fileService.createFile(resolve(out, 'sitemap.xml'), content);
  }

  private build(url: string, paths: string[]) {
    const items = [] as string[];
    paths.forEach(path => {
      const remoteUrl = url + (path.startsWith('/') ? path : '/' + path);
      const loc = remoteUrl.substr(-1) === '/' ? remoteUrl : remoteUrl + '/';
      const changefreq = 'daily';
      const priority = '1.0';
      const lastmod = new Date().toISOString().substr(0, 10);
      items.push(
        '   <url>',
        '       <loc>' + loc + '</loc>',
        '       <lastmod>' + lastmod + '</lastmod>',
        '       <changefreq>' + changefreq + '</changefreq>',
        '       <priority>' + priority + '</priority>',
        '   </url>'
      );
    });
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...items,
      '</urlset>',
    ].join('\n');
  }
}
