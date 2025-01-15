
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
}