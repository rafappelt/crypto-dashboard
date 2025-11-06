import { Observable } from 'rxjs';
import { HourlyAverageEntity } from '../../domain/entities/hourly-average.entity.js';

export interface IHourlyAveragePublisher {
  getHourlyAverages$(): Observable<HourlyAverageEntity>;
  publish(average: HourlyAverageEntity): void;
}
