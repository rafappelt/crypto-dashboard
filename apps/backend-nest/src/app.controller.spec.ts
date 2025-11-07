import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { FinnhubHealthService } from './finnhub/finnhub-health.service.js';

describe('AppController', () => {
  let controller: AppController;
  let service: AppService;

  beforeEach(async () => {
    const mockFinnhubHealthService = {
      checkApiKey: jest.fn().mockResolvedValue({
        isValid: true,
        error: null,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: FinnhubHealthService,
          useValue: mockFinnhubHealthService,
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
    service = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHello', () => {
    it('should return hello message from service', () => {
      const result = controller.getHello();
      expect(result).toBe('Crypto Dashboard API is running!');
      expect(service.getHello()).toBe(result);
    });
  });

  describe('getHealth', () => {
    it('should return health status with timestamp', async () => {
      const result = await controller.getHealth();

      expect(result).toHaveProperty('status');
      expect(result.status).toBe('ok');
      expect(result).toHaveProperty('timestamp');
      expect(typeof result.timestamp).toBe('string');
      expect(() => new Date(result.timestamp)).not.toThrow();
    });

    it('should return valid ISO timestamp', async () => {
      const result = await controller.getHealth();
      const timestamp = new Date(result.timestamp);

      expect(timestamp.getTime()).not.toBeNaN();
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});
