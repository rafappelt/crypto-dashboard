import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ExchangeRateModule } from './exchange-rate/exchange-rate.module.js';
import { CoreModule } from './core/core.module.js';
import { WebsocketGateway } from './websocket/websocket.gateway.js';
import { FinnhubHealthService } from './finnhub/finnhub-health.service.js';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: resolve(__dirname, '../.env'),
      isGlobal: true,
      cache: true,
    }),
    CoreModule,
    ExchangeRateModule,
  ],
  controllers: [AppController],
  providers: [AppService, WebsocketGateway, FinnhubHealthService],
  exports: [CoreModule],
})
export class AppModule {}
