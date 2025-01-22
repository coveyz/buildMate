import fs from 'fs'
import path from 'path';
import JoyCon from 'joycon';
import { bundleRequire } from 'bundle-require'

import { jsoncParse } from './utils';


/** 🥰 load json */
export const loadJson = async (filePath: string) => {
    try {
        return jsoncParse(await fs.promises.readFile(filePath, 'utf-8'));
    } catch (error) {
    }
}

/** 🥰 读取 buildMate 配置文件 */
export const loadBuildMateConfig = async (
    cwd: string,
    configFile?: string
) => {
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
}