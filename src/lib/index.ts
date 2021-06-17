import {MessageService} from './services/message.service';
import {HelperService} from './services/helper.service';
import {FileService} from './services/file.service';
import {FetchService} from './services/fetch.service';
import {ProjectService} from './services/project.service';
import {CacheService} from './services/cache.service';
import {HtmlService} from './services/html.service';
import {FirebaseService} from './services/firebase.service';
import {RenderService} from './services/render.service';
import {ReportService} from './services/report.service';
import {SitemapService} from './services/sitemap.service';

export class Lib {
  messageService: MessageService;
  helperService: HelperService;
  fileService: FileService;
  fetchService: FetchService;
  projectService: ProjectService;
  cacheService: CacheService;
  htmlService: HtmlService;
  firebaseService: FirebaseService;
  renderService: RenderService;
  reportService: ReportService;
  sitemapService: SitemapService;

  constructor() {
    this.messageService = new MessageService();
    this.helperService = new HelperService();
    this.fileService = new FileService();
    this.fetchService = new FetchService();
    this.projectService = new ProjectService(this.fileService);
    this.cacheService = new CacheService(this.fileService, this.projectService);
    this.htmlService = new HtmlService(this.helperService, this.fileService);
    this.firebaseService = new FirebaseService(this.fileService);
    this.renderService = new RenderService(this.fetchService, this.htmlService);
    this.reportService = new ReportService(
      this.fileService,
      this.projectService
    );
    this.sitemapService = new SitemapService(this.fileService);
  }
}
