import { Module } from '@nestjs/common';

import { CompanySearchService } from './company-search.service';

@Module({
  providers: [CompanySearchService],
  exports: [CompanySearchService],
})
export class CompanyModule {}
