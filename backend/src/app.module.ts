import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { UploadModule } from './modules/upload/upload.module';
import { AnalysisModule } from './modules/analysis/analysis.module';
import { ProductModule } from './modules/product/product.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AuthMiddleware } from './modules/auth/auth.middleware';
import { AnalysisJob } from './jobs/analysis.job';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    UploadModule,
    AnalysisModule,
    ProductModule,
    DashboardModule,
  ],
  providers: [AnalysisJob],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes({ path: 'api/*', method: RequestMethod.ALL });
  }
}
