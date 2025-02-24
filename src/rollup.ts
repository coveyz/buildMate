import path from 'path';
import { parentPort } from 'worker_threads';
import resolveFrom from 'resolve-from';
import ts from 'typescript';
import hashbangPlugin from 'rollup-plugin-hashbang';
import jsonPlugin from '@rollup/plugin-json';
import type { Plugin, InputOptions, OutputOptions } from 'rollup';

import { createLogger, setSilent } from './log';
import { loadPkg, getProductionDeps } from './load';
import { handleError } from './errors';
import { isEmpty, convertToObjectEntry, removeFiles, defaultOutExtension } from './utils';
import { tsResolvePlugin } from './rollup/ts-resolve';
import { reportSize } from './lib/report-size';
import type { NormalizedOptions } from './types/options';
import type { RollupConfig, TsResolveOptions } from './types/rollup';



const logger = createLogger();
const dtsPlugin: typeof import('rollup-plugin-dts') = require('rollup-plugin-dts');

/** 🧰 解析 TypeScript 编译选项 */
const parseCompilerOptions = (compilerOptions: any) => {
    if (isEmpty(compilerOptions)) return {};
    const { options } = ts.parseJsonConfigFileContent({ compilerOptions }, ts.sys, './');

    return options;
};

/** 🧰 获取 rollup 配置 */
const getRollupConfig = async (options: NormalizedOptions): Promise<RollupConfig> => {
    setSilent(options.silent);
    const compileOptions = parseCompilerOptions(options?.dts?.compilerOptions);

    /** 🧰 初始化 DTS选项，设置入口 */
    const dtsOptions = options.dts || {};
    dtsOptions.entry = dtsOptions.entry || options.entry;
    if (Array.isArray(dtsOptions.entry) && dtsOptions.entry.length > 1) {
        dtsOptions.entry = convertToObjectEntry(dtsOptions.entry);
    };


    /** 🧰 处理 typescript 解析器选项 */
    let tsResolveOptions: TsResolveOptions | undefined;


    if (dtsOptions.resolve) {
        tsResolveOptions = {};
        if (Array.isArray(dtsOptions.resolve)) {
            tsResolveOptions.resolveOnly = dtsOptions.resolve;
        };
        // `paths` should be handled by rollup-plugin-dts
        if (compileOptions.paths) {
            const res = Object.keys(compileOptions.paths).map(path => {
                return new RegExp(`^${path.replace("*", ".+")}$`);
            });

            tsResolveOptions.ignore = (source) => {
                return res.some((item) => item.test(source));
            }
        }
    };

    const pkg = await loadPkg(process.cwd());
    const deps = await getProductionDeps(process.cwd());

    /** 🧰 清理插件 */
    const buildMateCleanPlugin: Plugin = {
        name: 'build-mate:clean',
        async buildStart() {
            if (options.clean) {
                await removeFiles(['**/*.d.{ts,mts,cts}'], options.outDir);
            };
        },
    };

    /** 🧰 忽略文件 */
    const ignoreFiles: Plugin = {
        name: 'build-mate:ignore-files',
        load(id) {
            if (!/\.(js|cjs|mjs|jsx|ts|tsx|mts|json)$/.test(id)) {
                return '';
            }
        }
    };

    /** 🧰 修复 cjs导出的插件 */
    const fixCjsExport: Plugin = {
        name: 'build-mate:fix-cjs-export',
        renderChunk(code, info) {
            if (
                info.type !== 'chunk' ||
                !/\.(ts|cts)$/.test(info.fileName) ||
                !info.isEntry ||
                info.exports?.length !== 1 ||
                info.exports[0] !== 'default'
            ) {
                return;
            };

            return code.replace(/(?<=(?<=[;}]|^)\s*export\s*){\s*([\w$]+)\s*as\s+default\s*}/, `= $1`);
        }
    };

    return {
        inputConfig: {
            input: dtsOptions.entry,
            onwarn(warning, handle) {
                if (
                    warning.code === 'CIRCULAR_DEPENDENCY' ||
                    warning.code === 'UNRESOLVED_IMPORT' ||
                    warning.code === 'EMPTY_BUNDLE'
                ) {
                    return;
                };
                return handle(warning);
            },
            plugins: [
                buildMateCleanPlugin,
                tsResolveOptions && tsResolvePlugin(tsResolveOptions),
                hashbangPlugin(),
                jsonPlugin(),
                ignoreFiles,
                dtsPlugin.default({
                    tsconfig: options.tsconfig,
                    compilerOptions: {
                        ...compileOptions,
                        baseUrl: compileOptions?.baseUrl || '.',
                        declaration: true,
                        noEmit: false,
                        emitDeclarationOnly: true,
                        noEmitOnError: true,
                        checkJs: false,
                        declarationMap: false,
                        skipLibCheck: true,
                        preserveSymlinks: false,
                        target: ts.ScriptTarget.ESNext,
                    }
                })
            ].filter(Boolean),
            external: [
                ...deps.map((dep) => new RegExp(`^${dep}($|\\/|\\\\)`)),
                ...(options.external || [])
            ]
        },
        outputConfig: options.format.map((format) => {
            const outputExtension =
                options.outExtension?.({ format, options, pkgType: pkg.type }).dts
                || defaultOutExtension({ format, pkgType: pkg.type }).dts;

            return {
                dir: options.outDir || 'dist',
                format: 'esm',
                exports: 'named',
                banner: dtsOptions.banner,
                footer: dtsOptions.footer,
                entryFileNames: `[name]${outputExtension}`,
                plugins: [format === 'cjs' && options.cjsInterop && fixCjsExport].filter(Boolean)
            }
        })
    }
};

/** 🧰 监听 rollup */
const watchRollup = async (options: { inputConfig: InputOptions, outputConfig: OutputOptions[] }) => {
    const { watch } = await import('rollup');

    watch({
        ...options.inputConfig,
        plugins: options.inputConfig.plugins,
        output: options.outputConfig,
    }).on('event', (event) => {
        if (event.code === 'START') {
            logger.info('DTS', 'Build start');
        }
        else if (event.code === 'BUNDLE_END') {
            logger.success('DTS', `⚡️ Build success in ${event.duration}ms 🎉`);
            parentPort?.postMessage('success');
        }
        else if (event.code === 'ERROR') {
            logger.error('DTS', `Build fail`);
            handleError(event.error);
        }
    });
};

/** 🧰 运行 rollup */
const runRollup = async (options: RollupConfig) => {
    const { rollup } = await import('rollup');

    try {
        const start = Date.now();
        const getDuration = () => `${Math.floor(Date.now() - start)}ms`;
        logger.info('DTS', 'Build start');

        const bundle = await rollup(options.inputConfig);

        /** 🧰 写入 输出文件 */
        const results = await Promise.all(options.outputConfig.map(bundle.write));
        const outputs = results.flatMap((result) => result.output);

        logger.success('DTS', `⚡️ Build success in ${getDuration()} 🎉`);
        reportSize(
            logger,
            'DTS',
            outputs.reduce((acc, cur) => {
                const name = path.relative(
                    process.cwd(),
                    path.join(options.outputConfig[0].dir || '.', cur.fileName)
                );
                return {
                    ...acc,
                    [name]: cur.type === 'chunk' ? cur.code.length : cur.source.length
                }
            }, {})
        );
    } catch (error) {
        handleError(error);
        logger.error('DTS', `Build error`);
    }
};

async function startRollup(options: NormalizedOptions) {
    const config = await getRollupConfig(options);

    if (options.watch) {
        watchRollup(config);
    } else {
        try {
            await runRollup(config);
            parentPort?.postMessage('success');
        } catch (error) {
            parentPort?.postMessage('error');
        };
        parentPort?.close();
    };
}

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