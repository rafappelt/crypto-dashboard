import { HourlyAverageEntity } from '../entities/hourly-average.entity.js';

export class HourlyAverageCalculatedEvent {
  constructor(
    public readonly hourlyAverage: HourlyAverageEntity,
    public readonly occurredAt: Date = new Date()
  ) {}
}
