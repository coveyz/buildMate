import path from 'path'
import { Worker } from 'worker_threads';
import kill from 'tree-kill';
import type { ChildProcess } from 'child_process';

import { getAllDependenciesHash } from './load';
import { removeFiles } from './utils';
import { PluginContainer } from './plugin';
import { runEsbuild } from './esbuild';
import { shebang, treeShakingPlugin, cjsSplitting, cjsInterop, es5, sizeReporter, terserPlugin } from './plugins';
import type { NormalizedOptions, Options, KILL_SIGNAL } from './types/options';
import type { Logger } from './types/log';

/** 📝 杀死进程 */
const killProcess = (
    { pid, signal }: { pid: number, signal: KILL_SIGNAL }
): Promise<void> => {
    return new Promise((resolve, reject) => {
        kill(pid, signal, (err) => {
            if (err) return reject(err);
            resolve();
        });
    })
}

/** 📝 处理 typescript 声明文件的生成 */
export const dtsTask = async (options: NormalizedOptions, item?: Options) => {
    if (options.dts) {
        await new Promise<void>((resolve, reject) => {
            const worker = new Worker(path.join(__dirname, './rollup.js'));

            worker.postMessage({
                configName: item?.name,
                options: {
                    ...options, //functions cannot be cloned
                    banner: undefined,
                    footer: undefined,
                    esbuildPlugins: undefined,
                    esbuildOptions: undefined,
                    plugins: undefined,
                    treeshake: undefined,
                    onSuccess: undefined,
                    outExtension: undefined
                }
            });
            worker.on('message', (data) => {
                if (data === 'error') {
                    reject(new Error('error occurred in dts build'));
                } else if (data === 'success') {
                    resolve();
                } else {
                    const { type, text } = data;
                    if (type === 'log') {
                        console.log(text);
                    } else if (type === 'error') {
                        console.error(text);
                    }
                }
            });

        })
    };
};

/** 📝 处理主任务： 构建 & 监视项目中的文件变化, */
export const mainTask = async (
    options: NormalizedOptions,
    logger: Logger
) => {
    if (!options.dts?.only) {
        /** 📝 成功进程 */
        let onSuccessProcess: ChildProcess | undefined;
        /** 📝 成功清理 */
        let onSuccessCleanup: (() => any) | undefined | void;
        /** 📝 存储 构建过程中的依赖项 */
        const buildDependencies: Set<string> = new Set();
        /** 📝 存储 构建过程中的依赖项的 hash， 检测是否以来项 发生改变 */
        const depsHash = await getAllDependenciesHash(process.cwd());

        /** 📝 清理上一次构建成功后的 */
        const doOnSuccessCleanup = async () => {
            if (onSuccessProcess) {
                await killProcess({
                    pid: onSuccessProcess.pid!,
                    signal: options.killSignal || 'SIGTERM'
                })
            } else if (onSuccessCleanup) {
                await onSuccessCleanup();
            };

            onSuccessProcess = undefined;
            onSuccessCleanup = undefined;
        };

        const buildAll = async () => {
            await doOnSuccessCleanup();

            const preBuildDependencies = new Set(buildDependencies);
            buildDependencies.clear();

            //📝 清除 输出目录
            if (options.clean) {
                const extraPatterns = Array.isArray(options.clean) ? options.clean : [];
                //📝 dts 在 dtsTask 中进行删除，
                if (options.dts) {
                    extraPatterns.unshift('!**/*.d.{ts,cts,mts}');
                }
                await removeFiles(['**/*', ...extraPatterns], options.outDir);
                logger.info('CLI', 'Cleaned output folder 🧹');
            };

            //📝 编译资源
            const css: Map<string, string> = new Map();
            await Promise.all([
                ...options.format.map(async (format, index) => {
                    const pluginContainer = new PluginContainer([
                        shebang(),
                        ...(options.plugins || []),
                        treeShakingPlugin({
                            treeshake: options.treeshake,
                            name: options.globalName,
                            silent: options.silent
                        }),
                        cjsSplitting(),
                        cjsInterop(),
                        es5(),
                        sizeReporter(),
                        terserPlugin({
                            minifyOptions: options.minify,
                            format: format,
                            terserOptions: options.terserOptions,
                            globalName: options.globalName,
                            logger,
                        })
                    ]);
                    // console.log('📝-pluginContainer=>', pluginContainer);

                    await runEsbuild(options, {
                        pluginContainer,
                        format,
                        css: index === 0 || options.injectStyle ? css : undefined,
                        logger,
                        buildDependencies,
                    })
                })
            ])
        };

        logger.info('CLI', `Target: ${options.target} 🎯`);
        await buildAll();
    };
};