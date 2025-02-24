import { createLogger } from '../log';

export type Logger = ReturnType<typeof createLogger>;

export type LOG_TYPE = 'success' | 'info' | 'warn' | 'error'; 