import { parentPort, isMainThread } from 'worker_threads';
import util from 'util';
import * as colors from 'colorette';

import type { LOG_TYPE } from './types/log';


let silent = false;

export const setSilent = (isSilent?: boolean) => {
    silent = !!isSilent;
}

export const getSilent = () => {
    return silent;
}

/** 📔 根据日志类型 为数据添加颜色 */
export const colorize = (
    type: LOG_TYPE,
    data: any,
    onlyImportant = false
) => {
    if (onlyImportant && (type === 'success' || type === 'info')) return data;

    const color = type === 'info'
        ? 'blue'
        : type === 'error'
            ? 'red'
            : type === 'warn'
                ? 'yellow'
                : 'green';
    return colors[color](data);
};

/** 📔 创建 日志标签 */
export const makeLabel = (
    name: string | undefined,
    input: string,
    type: LOG_TYPE
) => {
    return [
        name && `${colors.dim('[')}${name.toUpperCase()}${colors.dim(']')}`,
        colorize(type, input.toUpperCase())
    ]
        .filter(Boolean)
        .join(' ');
};

/** 📔 创建 日志记录器 */
export const createLogger = (name?: string) => {
    return {
        setName(_name: string) {
            name = _name;
        },
        success(label: string, ...args: any[]) {
            return this.log(label, 'success', ...args);
        },
        info(label: string, ...args: any[]) {
            return this.log(label, 'info', ...args);
        },
        warn(label: string, ...args: any[]) {
            return this.log(label, 'warn', ...args);
        },
        error(label: string, ...args: any[]) {
            return this.log(label, 'error', ...args);
        },
        log(
            label: string,
            type: LOG_TYPE,
            ...data: unknown[]
        ) {
            const args = [
                makeLabel(name, label, type),
                ...data.map(item => colorize(type, item, true))
            ];

            switch (type) {
                case 'error': {
                    if (!isMainThread) {
                        parentPort?.postMessage({
                            type: 'error',
                            text: util.format(...args)
                        })
                        return;
                    };
                    return console.error(...args);
                }
                default:
                    if (silent) return;
                    if (!isMainThread) {
                        parentPort?.postMessage({
                            type: 'log',
                            text: util.format(...args)
                        })
                        return;
                    }
                    console.log(...args);
            }
        }
    };
};
