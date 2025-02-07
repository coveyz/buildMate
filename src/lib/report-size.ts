import * as colors from 'colorette';

import { Logger } from '../types/log';


/** 📑 格式化文件大小 */
const prettyBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const unit = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const exp = Math.floor(Math.log(bytes) / Math.log(1024));

    return `${(bytes / Math.pow(1024, exp)).toFixed(2)} ${unit[exp]}`;
};

/** 📑 右侧填充 */
const padRight = (str: string, maxLength: number) => {
    return str + ' '.repeat(maxLength - str.length);
}

/** 📑 获取最长字符串长度 */
const getLengthOfLongestString = (strings: string[]) => {
    return strings.reduce((acc, cur) => {
        return Math.max(acc, cur.length);
    }, 0);
};

/** 📑 记录文件大小 */
export const reportSize = (
    logger: Logger,
    format: string,
    files: Record<string, number>
) => {
    const filesNames = Object.keys(files);
    const maxLength = getLengthOfLongestString(filesNames) + 1;

    for (const name of filesNames) {
        logger.success(
            format,
            `${colors.bold(padRight(name, maxLength))}${colors.green(prettyBytes(files[name]))}`
        )
    }
};