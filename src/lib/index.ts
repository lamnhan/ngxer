import {MessageService} from './services/message.service';
import {HelperService} from './services/helper.service';
import {FileService} from './services/file.service';
import {ProjectService} from './services/project.service';
import {FirebaseService} from './services/firebase.service';
import {RenderService} from './services/render.service';

export class Lib {
  messageService: MessageService;
  helperService: HelperService;
  fileService: FileService;
  projectService: ProjectService;
  firebaseService: FirebaseService;
  renderService: RenderService;

  constructor() {
    this.messageService = new MessageService();
    this.helperService = new HelperService();
    this.fileService = new FileService();
    this.projectService = new ProjectService(
      this.helperService,
      this.fileService
    );
    this.firebaseService = new FirebaseService(this.fileService);
    this.renderService = new RenderService(
      this.fileService,
      this.projectService
    );
  }
}
