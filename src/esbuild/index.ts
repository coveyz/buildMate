import path from 'path';
import { BuildResult, Plugin as EsbuildPlugin } from 'esbuild';

import { loadPkg, getProductDependencies } from '../load';
import { defaultOutExtension } from '../utils';
import { nodeProtocolPlugin } from './node-protocol';
import { externalPlugin } from './external';
import { swcPlugin } from './swc';
import { nativeNodeModules } from './native-node-modules';
import { postcssPlugin } from './postcss';
import { sveltePlugin } from './svelte';
import type { NormalizedOptions, Format } from '../types/options';
import type { PluginContainer } from '../plugin';
import type { Logger } from '../types/log';



/** 🗽 输出文件的拓展名 */
const getOutputExtensionMap = (
    options: NormalizedOptions,
    format: Format,
    pkgType: string | undefined,
) => {
    const outExtension = options.outExtension || defaultOutExtension;
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
    pluginContainer.buildStarted();

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
        format !== 'cjs' && externalPlugin({
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
        sveltePlugin({css}),
        ...(options.esbuildPlugins || [])
    ];
};