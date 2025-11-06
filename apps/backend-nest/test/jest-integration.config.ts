import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '../',
  testRegex: 'test/.*\\.integration\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/test/tsconfig.json',
      },
    ],
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup-integration-tests.ts'],
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage/integration',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@crypto-dashboard/shared$': '<rootDir>/src/__mocks__/@crypto-dashboard/shared.ts',
    '^@crypto-dashboard/shared/(.*)\\.js$': '<rootDir>/../../packages/shared/src/$1.ts',
    '^@crypto-dashboard/backend-core$': '<rootDir>/../../packages/backend-core/src/index.ts',
    '^@crypto-dashboard/backend-core/(.*)\\.js$': '<rootDir>/../../packages/backend-core/src/$1.ts',
    // Handle relative .js imports within backend-core package
    '^(\\.{1,2}/.*)\\.js$': [
      '<rootDir>/../../packages/backend-core/src/$1.ts',
      '<rootDir>/../../packages/shared/src/$1.ts',
      '$1',
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@crypto-dashboard|socket\\.io-client)/)',
  ],
  testTimeout: 30000, // 30 seconds for integration tests
};

export default config;

