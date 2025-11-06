import { RxJsHourlyAveragePublisher } from './rxjs-hourly-average-publisher.js';
import { HourlyAverageEntity } from '../../domain/entities/hourly-average.entity.js';
import { ExchangePair } from '@crypto-dashboard/shared';

describe('RxJsHourlyAveragePublisher', () => {
  let publisher: RxJsHourlyAveragePublisher;

  beforeEach(() => {
    publisher = new RxJsHourlyAveragePublisher();
  });

  describe('publish', () => {
    it('should publish hourly average to subscribers', (done) => {
      const pair: ExchangePair = 'ETH/USDC';
      const hour = new Date('2024-01-01T10:00:00Z');
      hour.setMinutes(0, 0, 0);
      hour.setMilliseconds(0);

      const average = new HourlyAverageEntity(pair, 2000, hour, 100);

      publisher.getHourlyAverages$().subscribe((published) => {
        expect(published).toBe(average);
        done();
      });

      publisher.publish(average);
    });

    it('should publish multiple averages to subscribers', (done) => {
      const pair: ExchangePair = 'ETH/USDC';
      const hour1 = new Date('2024-01-01T10:00:00Z');
      hour1.setMinutes(0, 0, 0);
      hour1.setMilliseconds(0);

      const hour2 = new Date('2024-01-01T11:00:00Z');
      hour2.setMinutes(0, 0, 0);
      hour2.setMilliseconds(0);

      const average1 = new HourlyAverageEntity(pair, 2000, hour1, 100);
      const average2 = new HourlyAverageEntity(pair, 2100, hour2, 100);

      const published: HourlyAverageEntity[] = [];

      publisher.getHourlyAverages$().subscribe((average) => {
        published.push(average);
        if (published.length === 2) {
          expect(published[0]).toBe(average1);
          expect(published[1]).toBe(average2);
          done();
        }
      });

      publisher.publish(average1);
      publisher.publish(average2);
    });

    it('should support multiple subscribers', (done) => {
      const pair: ExchangePair = 'ETH/USDC';
      const hour = new Date('2024-01-01T10:00:00Z');
      hour.setMinutes(0, 0, 0);
      hour.setMilliseconds(0);

      const average = new HourlyAverageEntity(pair, 2000, hour, 100);
      let receivedCount = 0;

      const checkDone = () => {
        receivedCount++;
        if (receivedCount === 2) {
          done();
        }
      };

      publisher.getHourlyAverages$().subscribe((published) => {
        expect(published).toBe(average);
        checkDone();
      });

      publisher.getHourlyAverages$().subscribe((published) => {
        expect(published).toBe(average);
        checkDone();
      });

      publisher.publish(average);
    });
  });

  describe('getHourlyAverages$', () => {
    it('should return an Observable', () => {
      const observable = publisher.getHourlyAverages$();
      expect(observable).toBeDefined();
      expect(observable.subscribe).toBeDefined();
    });
  });
});
