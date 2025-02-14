import { MarkRequired } from 'ts-essentials';
import type { InputOption } from 'rollup'
import type { MinifyOptions } from 'terser';
import type { Loader, BuildOptions, Plugin as EsbuildPlugin } from 'esbuild';

import { Plugin, TreeshakingStrategy } from './plugin';



/** 
 * SIGKILL 无法捕获错误  
 * SIGTERM 可以捕获错误
*/
export type KILL_SIGNAL = 'SIGKILL' | "SIGTERM";

export type BrowserTarget =
    | 'chrome'
    | 'deno'
    | 'edge'
    | 'firefox'
    | 'hermes'
    | 'ie'
    | 'ios'
    | 'node'
    | 'opera'
    | 'rhino'
    | 'safari';
export type BrowserTargetWithVersion =
    | `${BrowserTarget}${number}`
    | `${BrowserTarget}${number}.${number}`
    | `${BrowserTarget}${number}.${number}.${number}`;
export type EsTarget =
    | 'es3'
    | 'es5'
    | 'es6'
    | 'es2015'
    | 'es2016'
    | 'es2017'
    | 'es2018'
    | 'es2019'
    | 'es2020'
    | 'es2021'
    | 'es2022'
    | 'esnext';

export type Target = BrowserTarget | BrowserTargetWithVersion | EsTarget;

export type Format = 'cjs' | 'iife' | 'esm';

export type Entry = string[] | Record<string, string>;

export type ContextForOutPathGeneration = {
    options: NormalizedOptions;
    format: Format;
    /** "type" field in project's package.json */
    pkgType?: string;
};

export type OutExtensionObject = { js?: string, dts?: string };

export type OutExtensionFactory = (ctx: ContextForOutPathGeneration) => OutExtensionObject;

export type DtsConfig = {
    entry?: InputOption;
    /** 是否解析 声明文件中使用的外部类型 */
    resolve?: boolean | (string | RegExp)[];
    /** 是否 仅生成说明文件 */
    only?: boolean;
    /** 在每个输出的 .d.ts 文件顶部插入的内容 */
    banner?: string;
    /** 在每个输出的 .d.ts 文件底部插入的内容 */
    footer?: string;
    /** 
     * 覆盖 tsconfig种的 compilerOptions 
     * 优先级 高于 tsconfig.json中的 compilerOptions
    */
    compilerOptions?: any
};

export type BannerOrFooter =
    | {
        js?: string;
        css?: string;
    }
    | ((ctx: { format: Format }) => { js?: string; css?: string } | undefined)


/**
 * The options available in encode-bundle.config.ts
 * Not all of them are available from CLI flags
 */
export type Options = {
    name?: string;
    entry?: Entry;
    format?: Format | Format[];
    target?: Target | Target[];
    /** Don't bundle these modules */
    external?: (string | RegExp)[];
    /**
     * false: 禁用配置文件
     * 字符串： 传递一个自定义的配置文件名
     */
    config?: boolean | string;
    outDir?: string;
    dts?: boolean | string | DtsConfig
    /** 抑制 非错误日志 （不包含 onSuccess 进程中的） */
    silent?: boolean;
    /** 自定义 tsconfig */
    tsconfig?: string;
    watch?: boolean | string | (string | boolean)[];
    /** 清理输出目录 */
    clean?: boolean | string[];
    outExtension?: OutExtensionFactory;
    /**
  * Interop default within `module.exports` in cjs
  * @default false
  */
    cjsInterop?: boolean;
    killSignal?: KILL_SIGNAL;
    sourcemap?: boolean | 'inline';
    /**
     * BuildMate Plugin 📦
     * @experimental
     * @alpha
     */
    plugins?: Plugin[];
    /**
     * 默认 esbuild 已经支持了 treeshaking
     * 还可以通过 这个选项让 rollup 进行额外的摇树，可以使打包文件更小
     */
    treeshake?: TreeshakingStrategy;
    globalName?: string;
    minify?: boolean | 'terser';
    terserOptions?: MinifyOptions;
    /**
     * Inject CSS as style tags to document head
     * @default false
     */
    injectStyle?: boolean | ((css: string, fileId: string) => string);
    env?: {
        [k: string]: string
    },
    /** 
     *  Replace `process.env.NODE_ENV` with `production` or `development`
     * `production` when the bundled is minified, `development` otherwise
    */
    replaceNodeEnv?: boolean;
    minifyWhitespace?: boolean;
    /**
     * 代码分割
     * esm 默认 true， cjs 默认 false
     */
    splitting?: boolean;
    platform?: 'node' | 'browser' | 'neutral';
    /** esbuild loader options */
    loader?: Record<string, Loader>;
    /** 必要时 注入 esm 和 cjs 垫片 */
    shims?: boolean;
    esbuildOptions?: (options: BuildOptions, context: { format: Format }) => void;
    /** 不会被视为 外部依赖 */
    noExternal?: (string | RegExp)[];
    /** 
     * 是否跳过 nodeModules 中模块打包 
     * true 的时候 noExternal选项中的模块仍然会被打包
    */
    skipNodeModulesBundle?: boolean;
    esbuildPlugins?: EsbuildPlugin[];
    banner?: BannerOrFooter;
    footer?: BannerOrFooter;
    /** Disable bundling, default to false */
    bundle?: boolean;
    jsxFactory?: string;
    jsxFragment?: string;
    define?: { [k: string]: string };
    /**
 * This option allows you to automatically replace a global variable with an import from another file.
 * @see https://esbuild.github.io/api/#inject
 */
    inject?: string[];
    /**
     * 将不同的格式输出到不同的文件夹，而不是使用不同的扩展名。
     */
    legacyOutput?: boolean;
    minifyIdentifiers?: boolean;
    minifySyntax?: boolean;
    keepNames?: boolean;
    /**
     * @see https://esbuild.github.io/api/#pure
     */
    pure?: string | string[];
};

export type NormalizedOptions = Omit<
    MarkRequired<Options, 'entry' | 'outDir'>,
    'dts' | 'format'
> & {
    dts?: DtsConfig;
    tsconfigDecoratorMetaData?: boolean;
    tsconfigResolvePaths: Record<string, string[]>;
    format: Format[];
}