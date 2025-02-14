import fs from 'fs';
import resolveFrom from 'resolve-from';

import type { Format } from './types/options';
import type { Truthy } from './types/utils';



/** 
 * 🕹️ 普通路径 反斜杠改成 正斜杠
 * 🕹️ 拓展长度路径 和 包含非ASCII 除外
 */
export const slash = (path: string) => {
    const isExtendedLengthPath = /^\\\\\?\\/.test(path);
    const hasNonAscii = /[^\u0000-\u0080]+/.test(path);

    if (isExtendedLengthPath || hasNonAscii) return path;

    return path.replace(/\\/g, '/');
}

/**
 * 🕹️ 确保 数组形式
 */
export const ensureArray = (input: string | string[]): string[] => {
    return Array.isArray(input) ? input : input.split(',');
};


export const jsoncParse = async (data: string) => {
    try {
        const stripJsonComments = (await import('strip-json-comments')).default;
        return new Function('return ' + stripJsonComments(data).trim())();
    } catch {
        //默默地忽略任何错误
        return {};
    }
};

export const parseSourceMap = (map?: string | object | null) => {
    return typeof map === 'string' ? JSON.parse(map) : map;
}

/** 🕹️ 是否为空，针对 数组、对象、字符串、new Map()、new Set()、null、undefined 进行判断，null、undefined 直接返回 true，也就是直接等于空 */
export const isEmpty = (data: any): boolean => {
    if (data === null || data === undefined) return true;
    if (typeof data === 'string') return data.trim() === '';
    if (data instanceof Map || data instanceof Set) {
        return data.size === 0;
    };
    if (typeof data === 'object' || Array.isArray(data)) {
        for (const _key in data) {
            return false;
        };
        return true;
    };

    return false;
};

const findCommonAncestor = (filePaths: string[]): string => {
    if (filePaths.length <= 1) return '';
    const [first, ...rest] = filePaths;
    let ancestor = first.split('/');

    for (const filePath of rest) {
        const directories = filePath.split('/');
        let index = 0;

        while (index < ancestor.length && index < directories.length && ancestor[index] === directories[index]) {
            index++;
        }

        ancestor = ancestor.slice(0, index);
    }

    return ancestor.length <= 1 && ancestor[0] === ''
        ? `/${ancestor[0]}`
        : ancestor.join('/');
};

export const convertToObjectEntry = (entries: string[]): Record<string, string> => {
    entries = entries.map(item => item.replace(/\\/g, '/'));
    const ancestor = findCommonAncestor(entries);

    return entries.reduce((acc, cur) => {
        const key = cur
            .replace(ancestor, '')
            .replace(/^\//, '')
            .replace(/\.[a-z]+$/, '');

        return {
            ...acc,
            [key]: cur
        };
    }, {});
};

export const removeFiles = async (patterns: string[], dir: string) => {
    const { globby } = await import('globby');
    const files = await globby(patterns, {
        cwd: dir,
        absolute: true,
    });

    await Promise.all(files.map(file => fs.promises.unlink(file)));
};


export const defaultOutExtension = ({
    format,
    pkgType
}: {
    format: Format;
    pkgType?: string
}): { js: string; dts: string } => {
    let jsExtension = '.js',
        dtsExtension = '.d.ts';
    const isModule = pkgType === 'module';

    if (isModule && format === 'cjs') {
        jsExtension = '.cjs'
        dtsExtension = '.d.cts';
    }

    if (!isModule && format === 'esm') {
        jsExtension = '.mjs';
        dtsExtension = '.d.mts';
    };

    if (format === 'iife') {
        jsExtension = '.global.js';
    };

    return {
        js: jsExtension,
        dts: dtsExtension,
    }
};

/** 🕹️ 是否是 JS 文件 */
export const isJS = (path: string) => /\.(js|mjs|cjs)$/.test(path);
/** 🕹️ 是否是 CSS 文件 */
export const isCSS = (path: string) => /\.css$/.test(path);

export const getPostcss = (): null | typeof import('postcss') => {
    const path = resolveFrom.silent(process.cwd(), 'postcss');
    return path && require(path);
}

export const localRequire = (moduleName: string) => {
    const path = resolveFrom.silent(process.cwd(), moduleName);
    return path && require(path);
};

export const truthy = <T>(value: T): value is Truthy<T> => {
    return Boolean(value)
}