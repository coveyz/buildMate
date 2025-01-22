import { createLogger } from '../log';

export type Logger = ReturnType<typeof createLogger>;

export type LoG_TYPE = 'success' | 'info' | 'warn' | 'error'; 