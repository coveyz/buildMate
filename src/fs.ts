import fs from 'fs';
import path from 'path';

/** 📝 生成写入文件 */
export const outputFile = async (
    filePath: string,
    data: any,
    options?: { mode?: fs.Mode }
) => {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, data, options);
};

/** 📝 同步复制一个目录到另一个目录 */
export const copyDirSync = (
    srcDir: string,
    destDir: string
): void => {
    if (!fs.existsSync(srcDir)) return;

    fs.mkdirSync(destDir, { recursive: true });

    //📝 遍历文件
    for (const file of fs.readdirSync(srcDir)) {
        // 📝 源文件
        const srcFile = path.resolve(srcDir, file);
        if (srcFile === destDir) continue;
        // 📝 目标文件
        const destFile = path.resolve(destDir, file);
        // 📝 源文件状态
        const stat = fs.statSync(srcFile);

        if (stat.isDirectory()) {
            // 📝 递归 复制子目录
            copyDirSync(srcFile, destFile);
        } else {
            // 📝 同步复制文件
            fs.copyFileSync(srcFile, destFile);
        };
    };
};