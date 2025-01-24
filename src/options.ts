// import { globby } from 'globby';
import fs from 'fs';
import path from 'path';
import { loadTsConfig } from 'bundle-require';

import { createLogger, setSilent } from './log';
import { handleError, PrettyError } from './errors';
import type { Options, NormalizedOptions } from './types/options';




/** 🥳 标准化 配置 */
export const normalizeOptions = async (
    logger: ReturnType<typeof createLogger>,
    optionsFromConfigFile: Options | undefined,
    optionsFromOverride: Options
) => {
    // console.log('🥳-normalizeOptions-args=>', { logger, optionsFromConfigFile, optionsFromOverride });
    const _options = {
        ...optionsFromConfigFile,
        ...optionsFromOverride
    };

    const options: Partial<NormalizedOptions> = {
        outDir: 'dist',
        ..._options,
        format: typeof _options.format === 'string'
            ? [_options.format]
            : _options.format || ['cjs'],
        dts: typeof _options.dts === 'boolean'
            ? _options.dts
                ? {}
                : undefined
            : typeof _options.dts === 'string'
                ? { entry: _options.dts }
                : _options.dts
    };
    // console.log('🥳-normalizeOptions-options=>', options)

    setSilent(options.silent);

    const entry = options.entry;
    if (!entry || Object.keys(entry).length === 0) {
        throw new PrettyError('No input files, try "build-mate" <your-file> instead');
    };

    // 确保 entry 数组
    if (Array.isArray(entry)) {
        const { globby } = await import('globby');
        options.entry = await globby(entry);
        // 确保 entry 存在
        if (!options.entry || options.entry.length === 0) {
            throw new PrettyError(`Cannot find ${entry} 😫`);
        } else {
            logger.info('CLI', `Build entry: ${options.entry.join(', ')} 🚪`);
        }
    }
    else {
        Object.keys(entry).forEach(alias => {
            const fileName = entry[alias];
            if (!fs.existsSync(fileName)) {
                throw new PrettyError(`Cannot find ${alias}: ${fileName} 😫`);
            }
        })
        options.entry = entry;
        logger.info('CLI', `Building entry: ${JSON.stringify(entry)}`);
    };

    const tsConfig = await loadTsConfig(process.cwd(), options.tsconfig);
    // console.log('🥳-normalizeOptions-tsConfig=>', tsConfig);
    if (tsConfig) {
        logger.info('CLI', `Using tsconfig: ${path.relative(process.cwd(), tsConfig.path)} 📝`)
        options.tsconfig = tsConfig.path;
        options.tsconfigResolvePaths = tsConfig.data?.compilerOptions?.paths || {};
        options.tsconfigDecoratorMetaData = tsConfig.data?.compilerOptions?.emitDecoratorMetadata;
        if (options.dts) {
            options.dts.compilerOptions = {
                ...(tsConfig.data?.compilerOptions || {}),
                ...(options.dts?.compilerOptions || {})
            }
        }
        if (!options.target) {
            options.target = tsConfig.data?.compilerOptions?.target?.toLowerCase();
        }
    } else {
        throw new PrettyError(`Cannot find tsconfig:${options.tsconfig}😫`);
    };

    if (!options.target) {
        options.target = 'node16';
    };

    return options as NormalizedOptions;
};
