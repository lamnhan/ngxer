import {resolve} from 'path';

import {FileService} from './file.service';
import {ProjectService} from './project.service';

export interface ReportJson {
  timestamp: string;
  indexRendering: string[];
  pathRendering: string[];
  databaseRendering: string[];
}

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
    return this.fileService.readJson<ReportJson>(this.getPath());
  }

  save(
    indexRendering: string[],
    pathRendering: string[],
    databaseRendering: string[]
  ) {
    return this.fileService.createJson(this.getPath(), {
      timestamp: new Date().toISOString(),
      indexRendering,
      pathRendering,
      databaseRendering,
    } as ReportJson);
  }

  async update(
    indexRendering?: string[],
    pathRendering?: string[],
    databaseRendering?: string[]
  ) {
    const {
      indexRendering: currentIndexRendering,
      pathRendering: currentPathRendering,
      databaseRendering: currentDatabaseRendering,
    } = await this.read();
    return this.save(
      !indexRendering ? currentIndexRendering : indexRendering,
      !pathRendering ? currentPathRendering : pathRendering,
      !databaseRendering ? currentDatabaseRendering : databaseRendering
    );
  }

  remove() {
    return this.fileService.removeFile(this.getPath());
  }
}
