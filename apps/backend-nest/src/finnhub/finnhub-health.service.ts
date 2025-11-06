import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FinnhubHealthService as CoreFinnhubHealthService,
  FinnhubHealthStatus,
} from '@crypto-dashboard/backend-core';

@Injectable()
export class FinnhubHealthService {
  private readonly coreService: CoreFinnhubHealthService;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('FINNHUB_API_KEY') || '';
    this.coreService = new CoreFinnhubHealthService(apiKey);
  }

  async checkApiKey(): Promise<FinnhubHealthStatus> {
    return this.coreService.checkApiKey();
  }
}
