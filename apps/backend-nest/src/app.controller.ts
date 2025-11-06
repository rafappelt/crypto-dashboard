import { Controller, Get, HttpStatus, HttpException } from '@nestjs/common';
import { AppService } from './app.service.js';
import { FinnhubHealthService } from './finnhub/finnhub-health.service.js';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly finnhubHealthService: FinnhubHealthService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async getHealth() {
    const finnhubStatus = await this.finnhubHealthService.checkApiKey();

    if (!finnhubStatus.isValid && finnhubStatus.error) {
      throw new HttpException(
        {
          status: 'error',
          timestamp: new Date().toISOString(),
          finnhub: {
            status: 'error',
            error: finnhubStatus.error,
          },
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      finnhub: {
        status: 'ok',
      },
    };
  }
}
