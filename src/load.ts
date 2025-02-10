import fs from 'fs'
import path from 'path';
import JoyCon from 'joycon';
import { bundleRequire } from 'bundle-require'

import { jsoncParse } from './utils';
import type { defineConfig } from './index';


const joycon = new JoyCon();

/** 🥰 load json */
export const loadJson = async (filePath: string) => {
    try {
        return jsoncParse(await fs.promises.readFile(filePath, 'utf-8'));
    } catch (error) {
    }
};

const jsonLoader = {
    test: /\.json/,
    load(filepath: string) {
        return loadJson(filepath);
    }
};

joycon.addLoader(jsonLoader);

/** 🥰 加载 packageJson 返回内容 */
export const loadPkg = async (cwd: string, clearCache: boolean = false) => {
    if (clearCache) {
        joycon.clearCache();
    };

    const { data } = await joycon.load(['package.json'], cwd, path.dirname(cwd));

    return data || {};
};

/** 🥰 获取项目中的生产依赖项 */
export const getProductionDeps = async (cwd: string, clearCache: boolean = false) => {
    const data = await loadPkg(cwd, clearCache);

    const deps = Array.from(
        new Set([
            ...Object.keys(data.dependencies || {}),
            ...Object.keys(data.peerDependencies || {}),
        ])
    );

    return deps;
};


/** 🥰 读取 buildMate 配置文件 */
export const loadBuildMateConfig = async (
    cwd: string,
    configFile?: string
): Promise<{ path?: string, data?: ReturnType<typeof defineConfig> }> => {
    const configJoycon = new JoyCon();
    const configPath = await configJoycon.resolve({
        files: configFile
            ? [configFile]
            : [
                'build-mate.config.js',
                'build-mate.config.ts',
                'build-mate.config.cjs',
                'build-mate.config.mjs',
                'build-mate.config.json',
                'package.json'
            ],
        cwd,
        stopDir: path.parse(cwd).root,
        packageKey: 'build-mate'
    });

    if (configPath) {
        //if endsWith is .json
        if (configPath.endsWith('.json')) {
            let configData = await loadJson(configPath);

            if (configPath.endsWith('package.json')) {
                configData = configData['build-mate'];
            };

            if (configData) {
                return { path: configPath, data: configData };
            };
        };

        const configData = await bundleRequire({
            filepath: configPath,
        });

        return {
            path: configPath,
            data: configData.mod['build-mate'] || configData.mod.default || configData.mod,
        }
    };

    return {};
};

/** 
 * 🥰 获取所有依赖的哈希值 
 * 用它来决定 packagesJson 改变时是否需要重新构建
*/
export const getAllDependenciesHash = async (cwd: string) => {
    const data = await loadPkg(cwd, true);

    return JSON.stringify({
        ...data.dependencies,
        ...data.peerDependencies,
        ...data.devDependencies
    })
};