import {resolve} from 'path';

import {FileService} from './file.service';
import {ProjectService} from './project.service';

export class ReportService {
  public readonly file = 'report.json';

  constructor(
    private fileService: FileService,
    private projectService: ProjectService
  ) {}

  private getPath() {
    return resolve(this.projectService.rcDir, this.file);
  }

  exists() {
    return this.fileService.exists(this.getPath());
  }

  read() {
    return this.fileService.readJson<string[]>(this.getPath());
  }

  save(data: string[]) {
    return this.fileService.createJson(this.getPath(), data);
  }

  async update(data: string[]) {
    const currentValue = await this.read();
    return this.save([...currentValue, ...data]);
  }

  remove() {
    return this.fileService.removeFile(this.getPath());
  }
}
