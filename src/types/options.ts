import { MarkRequired } from 'ts-essentials';
import type { InputOption } from 'rollup'
import type { MinifyOptions } from 'terser';

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
    plugins: Plugin[];
    /**
     * 默认 esbuild 已经支持了 treeshaking
     * 还可以通过 这个选项让 rollup 进行额外的摇树，可以使打包文件更小
     */
    treeshake: TreeshakingStrategy;
    globalName?: string;
    minify?: boolean | 'terser';
    terserOptions?: MinifyOptions;
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