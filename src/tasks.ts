import path from 'path'
import { Worker } from 'worker_threads';
import kill from 'tree-kill';
import execa from 'execa';
import type { ChildProcess } from 'child_process';

import { getAllDependenciesHash } from './load';
import { removeFiles, slash, debouncePromise } from './utils';
import { PluginContainer } from './plugin';
import { runEsbuild } from './esbuild';
import { shebang, treeShakingPlugin, cjsSplitting, cjsInterop, es5, sizeReporter, terserPlugin } from './plugins';
import { copyPublicDir, isInPublicDir } from './lib/public-dir';
import type { NormalizedOptions, Options, KILL_SIGNAL } from './types/options';
import type { Logger } from './types/log';
import { handleError } from './errors';

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
        let depsHash = await getAllDependenciesHash(process.cwd());

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

        const debouncedBuildAll = debouncePromise(
            () => buildAll(),
            100,
            handleError
        )

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

                    await runEsbuild(options, {
                        pluginContainer,
                        format,
                        css: index === 0 || options.injectStyle ? css : undefined,
                        logger,
                        buildDependencies,
                    }).catch((error) => {
                        preBuildDependencies.forEach((v) => buildDependencies.add(v));
                        throw error;
                    });
                })
            ]);

            if (options.onSuccess) {
                if (typeof options.onSuccess === 'function') {
                    onSuccessCleanup = await options.onSuccess();
                } else {
                    onSuccessProcess = execa(options.onSuccess, {
                        shell: true,
                        stdio: 'inherit',
                    });

                    onSuccessProcess.on('exit', (code) => {
                        if (code && code !== 0) {
                            process.exitCode = code;
                        }
                    });
                }
            };
        };

        const startWatcher = async () => {
            if (!options.watch) return;
            const { watch } = await import('chokidar');

            const customIgnores = options.ignoreWatch
                ? Array.isArray(options.ignoreWatch)
                    ? options.ignoreWatch
                    : [options.ignoreWatch]
                : [];
            const ignored = ['**/{.git,node_modules}/**', options.outDir, ...customIgnores];
            const watchPaths = typeof options.watch === 'boolean'
                ? '.'
                : Array.isArray(options.watch)
                    ? options.watch.filter((path) => typeof path === 'string') as string[]
                    : options.watch;

            logger.info('CLI',
                `Watching for changes in ${Array.isArray(watchPaths)
                    ? watchPaths.map((v) => '"' + v + '"').join(' | ')
                    : '"' + watchPaths + '"'
                }`
            );

            logger.info('CLI',
                `Ignoring changes in ${ignored.map((v) => '"' + v + '"').join(' | ')}`,
            );

            const watcher = watch(watchPaths, {
                ignored,
                ignoreInitial: true,
                ignorePermissionErrors: true,
            });

            watcher.on('all', async (type, file) => {
                file = slash(file);

                if (options.publicDir && isInPublicDir(options.publicDir, file)) {
                    logger.info('CLI', `Change in public fir: ${file}`);
                    copyPublicDir(options.publicDir, options.outDir);
                    return;
                };

                // 默认情况下，只有当导入的文件发生变化时才会重新构建。
                // 如果你指定了自定义的 `watch`，可以是一个字符串或多个字符串，
                // 那么当这些文件发生变化时，我们会重新构建。
                let shouldSkipChange = false;

                if (options.watch === true) {
                    if (file === 'package.json' && !buildDependencies.has(file)) {
                        const currentHash = await getAllDependenciesHash(process.cwd());
                        shouldSkipChange = currentHash === depsHash;
                        depsHash = currentHash;
                    } else if (!buildDependencies.has(file)) {
                        shouldSkipChange = true;
                    };
                };
                if (shouldSkipChange) return;

                logger.info('CLI', `Change detected: ${type} ${file}`);
                debouncedBuildAll();
            });
        };

        logger.info('CLI', `Target: ${options.target} 🎯`);
        await buildAll();
        copyPublicDir(options.publicDir, options.outDir);
        startWatcher();
    };
};