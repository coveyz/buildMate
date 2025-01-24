import { parentPort } from 'worker_threads';
import resolveFrom from 'resolve-from';
import ts from 'typescript';

import { createLogger, setSilent } from './log';
import { isEmpty, convertToObjectEntry } from './utils';
import type { NormalizedOptions } from './types/options';
import type { RollupConfig, TsResolveOptions } from './types/rollup';



const logger = createLogger();

/** 🧰 解析 TypeScript 编译选项 */
const parseCompilerOptions = (compilerOptions: any) => {
    // console.log('🧰-parseCompilerOptions-compilerOptions', compilerOptions);
    if (isEmpty(compilerOptions)) return {};
    const { options } = ts.parseJsonConfigFileContent({ compilerOptions }, ts.sys, './');

    return options;
};

/** 🧰 获取 rollup 配置 */
const getRollupConfig = async (options: NormalizedOptions): Promise<any> => {
    setSilent(options.silent);
    const compileOptions = parseCompilerOptions(options?.dts?.compilerOptions);

    const dtsOptions = options.dts || {};
    // console.log('🧰-getRollupConfig-dtsOptions=>', dtsOptions);

    dtsOptions.entry = dtsOptions.entry || options.entry;

    if (Array.isArray(dtsOptions.entry) && dtsOptions.entry.length > 1) {
        dtsOptions.entry = convertToObjectEntry(dtsOptions.entry);
    };

    let tsResolveOptions: TsResolveOptions | undefined;

    if (dtsOptions.resolve) {
        tsResolveOptions = {};
        if (Array.isArray(dtsOptions.resolve)) {
            tsResolveOptions.resolveOnly = dtsOptions.resolve;
        };
        // `paths` should be handled by rollup-plugin-dts
        if (compileOptions.paths) {
            const res = Object.keys(compileOptions.paths).map(path => {
                return new RegExp(`^${path.replace("*", ".+")}$`)
            });

            tsResolveOptions.ignore = (source) => {
                return res.some((item) => item.test(source));
            }
        }
    };
    console.log('🧰-getRollupConfig-dtsOptions=>', dtsOptions);

}

const startRollup = async (options: NormalizedOptions) => {
    const config = await getRollupConfig(options);
    // console.log('🧰-startRollup-startRollup-config', config);

};

parentPort?.on('message', (data) => {
    logger.setName(data.configName)
    const hasTypeScript = resolveFrom(process.cwd(), 'typescript');

    if (!hasTypeScript) {
        logger.error('dts', `You need to install "typescript" in your project.`);
        parentPort?.postMessage('error');
        parentPort?.close();
        return;
    };

    startRollup(data.options);
});