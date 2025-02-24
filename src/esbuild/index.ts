// import { consola } from 'consola';
import path from 'path';
import fs from 'fs';
import { build as esbuild, formatMessages } from 'esbuild';
import type { BuildResult, Plugin as EsbuildPlugin, } from 'esbuild';

import { loadPkg, getProductDependencies } from '../load';
import { defaultOutExtension, truthy } from '../utils';
import { getSilent } from '../log';
import { nodeProtocolPlugin } from './node-protocol';
import { externalPlugin } from './external';
import { swcPlugin } from './swc';
import { nativeNodeModules } from './native-node-modules';
import { postcssPlugin } from './postcss';
import { sveltePlugin } from './svelte';
import type { NormalizedOptions, Format, OutExtensionFactory } from '../types/options';
import type { PluginContainer } from '../plugin';
import type { Logger } from '../types/log';



/** 🗽 输出文件的拓展名 */
const getOutputExtensionMap = (
    options: NormalizedOptions,
    format: Format,
    pkgType: string | undefined,
) => {
    const outExtension: OutExtensionFactory = options.outExtension || defaultOutExtension;

    const defaultExtension = defaultOutExtension({ format, pkgType });
    const extension = outExtension({ options, format, pkgType });

    return {
        ".js": extension.js || defaultExtension.js,
    };
};

const generateExternal = async (external: (string | RegExp)[]) => {
    const result: (string | RegExp)[] = [];

    for (const item of external) {
        if (typeof item !== 'string' || !item.endsWith('package.json')) {
            result.push(item);
            continue;
        };
        let pkgPath: string = path.isAbsolute(item)
            ? path.dirname(item) //绝对路径 直接获取目录路径
            : path.dirname(path.resolve(process.cwd(), item)); //相对路径 先解析为绝对路径，再获取目录路径

        const deps = await getProductDependencies(pkgPath);
        result.push(...deps);
    };

    return result;
}

/**
 * 🗽 调用esbuild 进行代码编译和打包，编译后运行插件
 */
export const runEsbuild = async (
    options: NormalizedOptions,
    {
        pluginContainer,
        format,
        css,
        logger,
        buildDependencies
    }: {
        pluginContainer: PluginContainer,
        format: Format,
        css?: Map<string, string>
        logger: Logger,
        buildDependencies: Set<string>,
    }
) => {
    //🗽 获取包信息 生产信息
    const pkg = await loadPkg(process.cwd()),
        deps = await getProductDependencies(process.cwd());
    //🗽 外部依赖
    const external = [
        ...deps.map((dep) => new RegExp(`^${dep}($|\\/|\\\\)`)),
        ...(await generateExternal(options.external || []))
    ];
    //🗽 输出目录 & 环境变量 
    const outDir = options.outDir;
    const outExtension = getOutputExtensionMap(options, format, pkg.type);
    const env = {
        ...options.env
    };
    if (options.replaceNodeEnv) {
        env.NODE_ENV = options.minify || options.minifyWhitespace
            ? 'production'
            : 'development';
    };

    logger.info(format, 'Build start');
    const startTIme = Date.now();

    let result: BuildResult | undefined;

    const splitting = format === 'iife'
        ? false
        : typeof options.splitting === 'boolean'
            ? options.splitting
            : format === 'esm';
    const platform = options.platform || 'node';
    const loader = options.loader || {};
    const injectShims = options.shims;

    //🗽 设置上下文 & 开始执行
    pluginContainer.setContext({
        format,
        splitting,
        options,
        logger,
    });
    await pluginContainer.buildStarted();

    //🗽 配置
    const esbuildPlugins: (EsbuildPlugin | false | undefined)[] = [
        format === 'cjs' && nodeProtocolPlugin(),
        {
            name: 'modify-options',
            setup(build) {
                pluginContainer.modifyEsbuildOptions(build.initialOptions);
                if (options.esbuildOptions) {
                    options.esbuildOptions(build.initialOptions, { format });
                };
            }
        },
        //esbuild 插件 不支持 RegExp
        format !== 'iife' && externalPlugin({
            external,
            noExternal: options.noExternal,
            skipNodeModulesBundle: options.skipNodeModulesBundle,
            tsconfigResolvePaths: options.tsconfigResolvePaths
        }),
        options.tsconfigDecoratorMetaData && swcPlugin({ logger }),
        nativeNodeModules(),
        postcssPlugin({
            css,
            inject: options.injectStyle,
            cssLoader: loader['.css']
        }),
        sveltePlugin({ css }),
        ...(options.esbuildPlugins || [])
    ];

    const banner = typeof options.banner === 'function' ? options.banner({ format }) : options.banner;
    const footer = typeof options.footer === 'function' ? options.footer({ format }) : options.footer;

    try {
        //esbuild 进行编译&打包
        result = await esbuild({
            entryPoints: options.entry,
            format: (format === 'cjs' && splitting) || options.treeshake ? 'esm' : format,
            bundle: typeof options.bundle === 'undefined' ? true : options.bundle,
            platform,
            globalName: options.globalName,
            jsxFactory: options.jsxFactory,
            jsxFragment: options.jsxFragment,
            sourcemap: options.sourcemap ? 'external' : false,
            target: options.target,
            banner,
            footer,
            tsconfig: options.tsconfig,
            loader: {
                '.aac': 'file',
                '.css': 'file',
                '.eot': 'file',
                '.flac': 'file',
                '.gif': 'file',
                '.jpeg': 'file',
                '.jpg': 'file',
                '.mp3': 'file',
                '.mp4': 'file',
                '.ogg': 'file',
                '.otf': 'file',
                '.png': 'file',
                '.svg': 'file',
                '.ttf': 'file',
                '.wav': 'file',
                '.webm': 'file',
                '.webp': 'file',
                '.woff': 'file',
                '.woff2': 'file',
                ...loader,
            },
            /** 🗽 入口字段 */
            mainFields: platform === 'node' ? ['module', 'main'] : ['browser', 'module', 'main'],
            plugins: esbuildPlugins.filter(truthy),
            /** 🗽 全局变量 定义 */
            define: {
                BUILD_MATE_FORMAT: JSON.stringify(format),
                ...(format === 'cjs' && injectShims
                    ? {
                        'import.meta.url': 'importMetaUrl',
                    }
                    : {}
                ),
                ...options.define,
                ...Object.keys(env).reduce((acc, cur) => {
                    const value = JSON.stringify(env.cur);
                    return {
                        ...acc,
                        [`process.env.${cur}`]: value,
                        [`import.meta.env.${cur}`]: value,
                    }
                }, {})
            },
            /** 🗽 注入 */
            inject: [
                format === 'cjs' && injectShims ? path.join(__dirname, '../assets/cjs_shims.js') : '',
                format === 'esm' && injectShims && platform === 'node'
                    ? path.join(__dirname, '../assets/esm_shims.js')
                    : '',
                ...(options.inject || [])
            ].filter(Boolean),
            outdir: options.legacyOutput && format !== 'cjs' ? path.join(outDir, format) : outDir,
            /** 🗽 输出文件拓展名 */
            outExtension: options.legacyOutput ? undefined : outExtension,
            write: false,
            splitting,
            logLevel: 'error',
            /** 🗽 是否压缩 */
            minify: options.minify === 'terser' ? false : options.minify,
            /** 🗽 压缩空白字符 */
            minifyWhitespace: options.minifyWhitespace,
            /** 🗽 压缩标识符 */
            minifyIdentifiers: options.minifyIdentifiers,
            /** 🗽 压缩语法 */
            minifySyntax: options.minifySyntax,
            /** 🗽 是否保留名称 */
            keepNames: options.keepNames,
            /** 🗽 纯函数 */
            pure: typeof options.pure === 'string' ? [options.pure] : options.pure,
            /** 🗽 是否生成元数据文件 */
            metafile: true
        });
    } catch (error) {
        logger.error(format, 'Build failed');
        throw error;
    };

    if (result && result.warnings && !getSilent()) {
        const messages = result.warnings.filter((warning) => {
            if (warning.location) {
                const { file } = warning.location;
                return !file.startsWith('internal');
            } if (
                warning.text.includes(`This call to "require" will not be bundled because`) ||
                warning.text.includes(`Indirect calls to "require" will not be bundled`)
            ) return false;

            return true
        });

        const formatted = await formatMessages(messages, {
            kind: 'warning',
            color: true
        });


        formatted.forEach((messages) => {
            logger.warn(format, messages);
        });
    };

    /** 🗽 手写文件 */
    if (result && result.outputFiles) {
        await pluginContainer.buildFinished({
            outputFiles: result.outputFiles,
            metafile: result.metafile,
        });
        const timeInMs = Date.now() - startTIme;

        logger.success(format, `Build success in ${Math.floor(timeInMs)}ms 🎉`);
    };


    if (result.metafile) {
        for (const file of Object.keys(result.metafile.inputs)) {
            buildDependencies.add(file);
        };

        if (options.metafile) {
            const outPath = path.resolve(outDir, `metafile-${format}.json`);
            await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
            await fs.promises.writeFile(outPath, JSON.stringify(result.metafile), 'utf8');
        };
    };
};