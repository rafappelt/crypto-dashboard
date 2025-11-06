// This file helps Jest resolve .js imports in TypeScript files
// by configuring the module resolution

import { createRequire } from 'module';
import { pathToFileURL } from 'url';

// This is a workaround for Jest to handle .js imports in TypeScript ESM files
// The actual resolution is handled by ts-jest and the moduleNameMapper

export {};


