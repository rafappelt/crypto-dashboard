// Re-export from shared without .js extensions for Jest
// This mock file helps Jest resolve ES module imports from shared package
// Path is relative to src/__mocks__/@crypto-dashboard/
// From apps/backend-nest/src/__mocks__/@crypto-dashboard/ to packages/shared/src/
export * from '../../../../../packages/shared/src/types/exchange-pair.js';
export * from '../../../../../packages/shared/src/types/exchange-rate.js';
export * from '../../../../../packages/shared/src/types/exchange-rate-update.js';
export * from '../../../../../packages/shared/src/types/hourly-average.js';
export * from '../../../../../packages/shared/src/types/websocket-messages.js';
export * from '../../../../../packages/shared/src/types/connection-status.js';
export * from '../../../../../packages/shared/src/types/error-payload.js';
export * from '../../../../../packages/shared/src/config/exchange-pairs.config.js';
