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

/** 是否为空，针对 数组、对象、字符串、new Map()、new Set()、null、undefined 进行判断，null、undefined 直接返回 true，也就是直接等于空 */
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
    console.log('ancestor', ancestor);

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

