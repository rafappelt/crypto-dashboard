import {
  ExchangePair,
  ExchangeRateUpdate,
  WebSocketMessage,
  DEFAULT_EXCHANGE_PAIRS,
} from '@crypto-dashboard/shared';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ExchangeRateService } from '../exchange-rate/exchange-rate.service.js';
import {
  IExchangeRateReceiver,
  IHourlyAveragePublisher,
  ExchangeRateEntity,
  HourlyAverageEntity,
  logger as backendLogger,
} from '@crypto-dashboard/backend-core';
import { Inject } from '@nestjs/common';
import {
  EXCHANGE_RATE_RECEIVER,
  HOURLY_AVERAGE_PUBLISHER,
} from '../core/core.module.js';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
})
export class WebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private exchangeRateSubscriptions = new Map<string, any>();
  private hourlyAverageSubscriptions = new Map<string, any>();

  constructor(
    @Inject(EXCHANGE_RATE_RECEIVER)
    private readonly exchangeRateReceiver: IExchangeRateReceiver,
    @Inject(HOURLY_AVERAGE_PUBLISHER)
    private readonly hourlyAveragePublisher: IHourlyAveragePublisher,
    private readonly exchangeRateService: ExchangeRateService,
  ) {}

  handleConnection(client: Socket) {
    backendLogger.info(`Client connected: ${client.id}`);
    this.sendConnectionStatus(client, 'connected');

    // Subscribe to exchange rate updates from backend-core
    const exchangeRateSub = this.exchangeRateReceiver
      .getExchangeRates$()
      .subscribe(async (rate) => {
        await this.sendExchangeRate(client, rate);
      });

    // Subscribe to hourly average updates from backend-core
    const hourlyAverageSub = this.hourlyAveragePublisher
      .getHourlyAverages$()
      .subscribe((average) => {
        this.sendHourlyAverage(client, average);
      });

    this.exchangeRateSubscriptions.set(client.id, exchangeRateSub);
    this.hourlyAverageSubscriptions.set(client.id, hourlyAverageSub);
  }

  handleDisconnect(client: Socket) {
    backendLogger.info(`Client disconnected: ${client.id}`);

    // Unsubscribe
    const exchangeRateSub = this.exchangeRateSubscriptions.get(client.id);
    if (exchangeRateSub) {
      exchangeRateSub.unsubscribe();
      this.exchangeRateSubscriptions.delete(client.id);
    }

    const hourlyAverageSub = this.hourlyAverageSubscriptions.get(client.id);
    if (hourlyAverageSub) {
      hourlyAverageSub.unsubscribe();
      this.hourlyAverageSubscriptions.delete(client.id);
    }
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(client: Socket, payload: { pair?: ExchangePair }) {
    backendLogger.debug(
      `Client ${client.id} subscribed to ${payload.pair || 'all pairs'}`,
    );

    // Send initial hourly averages if available
    if (payload.pair) {
      const average = await this.exchangeRateService.getLatestHourlyAverage(
        payload.pair,
      );
      if (average) {
        this.sendHourlyAverage(client, average);
      }
    } else {
      for (const pair of DEFAULT_EXCHANGE_PAIRS) {
        const average =
          await this.exchangeRateService.getLatestHourlyAverage(pair);
        if (average) {
          this.sendHourlyAverage(client, average);
        }
      }
    }
  }

  private async sendExchangeRate(client: Socket, rate: ExchangeRateEntity) {
    const latestAverage = await this.exchangeRateService.getLatestHourlyAverage(
      rate.pair,
    );

    const update: ExchangeRateUpdate = {
      pair: rate.pair,
      price: rate.price,
      timestamp: rate.timestamp,
      hourlyAverage: latestAverage?.averagePrice,
    };

    const message: WebSocketMessage = {
      type: 'exchange-rate',
      data: update,
    };

    client.emit('message', message);
  }

  private sendHourlyAverage(client: Socket, average: HourlyAverageEntity) {
    const message: WebSocketMessage = {
      type: 'hourly-average',
      data: {
        pair: average.pair,
        averagePrice: average.averagePrice,
        hour: average.hour,
        sampleCount: average.sampleCount,
      },
    };

    client.emit('message', message);
  }

  private sendConnectionStatus(
    client: Socket,
    status: 'connected' | 'disconnected' | 'error',
    message?: string,
  ) {
    const wsMessage: WebSocketMessage = {
      type: 'connection-status',
      data: {
        status,
        message,
      },
    };

    client.emit('message', wsMessage);
  }
}
