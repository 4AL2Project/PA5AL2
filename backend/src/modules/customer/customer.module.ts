import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { CustomerJwtGuard } from './guards/customer-jwt.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [CustomerController],
  providers: [CustomerService, CustomerJwtGuard],
  exports: [CustomerService, CustomerJwtGuard, JwtModule],
})
export class CustomerModule {}
