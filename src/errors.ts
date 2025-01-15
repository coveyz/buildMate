import { isMainThread, parentPort } from 'worker_threads';
import * as colors from 'colorette';

export class PrettyError extends Error {
    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;

        if (typeof Error.captureStackTrace.constructor === 'function') {
            Error.captureStackTrace(this, this.constructor);
        } else {
            this.stack = new Error(message).stack;
        }
    }
};

export const handleError = (error: any) => {
    // 错误位置
    if (error.loc) {
        console.error(
            colors.bold(
                colors.red(
                    `Error parsing: ${error.loc.file}:${error.loc.line}:${error.loc.column}`
                )
            )
        )
    };
    // 错误代码片段
    if (error.frame) {
        console.error(colors.red(error.message));
        console.error(colors.dim(error.frame));
    } else {
        if (error instanceof PrettyError) {
            console.error(colors.red(error.message));
        } else {
            console.error(colors.red(error.stack));
        }
    };

    process.exitCode = 1;
    if (!isMainThread && parentPort) {
        parentPort?.postMessage('error');
    }
};