import { Module } from '@nestjs/common';
import { ExchangeRateService } from './exchange-rate.service.js';
import { CoreModule } from '../core/core.module.js';

@Module({
  imports: [CoreModule],
  providers: [ExchangeRateService],
  exports: [ExchangeRateService],
})
export class ExchangeRateModule {}
