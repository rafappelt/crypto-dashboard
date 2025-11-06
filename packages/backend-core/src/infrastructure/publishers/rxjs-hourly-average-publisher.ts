import { Subject, Observable } from 'rxjs';
import { HourlyAverageEntity } from '../../domain/entities/hourly-average.entity.js';
import { IHourlyAveragePublisher } from '../../application/ports/hourly-average-publisher.port.js';

export class RxJsHourlyAveragePublisher implements IHourlyAveragePublisher {
  private readonly subject = new Subject<HourlyAverageEntity>();

  getHourlyAverages$(): Observable<HourlyAverageEntity> {
    return this.subject.asObservable();
  }

  publish(average: HourlyAverageEntity): void {
    this.subject.next(average);
  }
}
