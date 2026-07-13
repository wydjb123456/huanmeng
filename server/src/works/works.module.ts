import { Module } from '@nestjs/common';
import { WorksService } from './works.service';
import { WorksController } from './works.controller';
import { EvolinkService } from './evolink.service';
import { EvolinkTextService } from './evolink-text.service';
import { PdfService } from './pdf.service';
import { WordService } from './word.service';
import { StyleEngineService } from './iscs/style-engine.service';
import { TabooGuardService } from './iscs/taboo-guard.service';

@Module({
  controllers: [WorksController],
  providers: [WorksService, EvolinkService, EvolinkTextService, PdfService, WordService, StyleEngineService, TabooGuardService],
})
export class WorksModule {}
