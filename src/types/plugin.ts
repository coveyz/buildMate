import type { BuildOptions as EsbuildOptions, Metafile } from 'esbuild';
import type { RawSourceMap } from 'source-map';
import type { SourceMap, TreeshakingOptions, TreeshakingPreset } from 'rollup';

import type { Format, NormalizedOptions } from './options';
import type { Logger } from './log';
import type { MaybePromise } from './utils';

export type WrittenFile = {
    readonly name: string;
    readonly size: number;
};

export type ChunkInfo = {
    type: 'chunk';
    code: string;
    map?: RawSourceMap | string | null;
    path: string;
    mode?: number;
    entryPoint?: string;
    exports?: string[];
    imports?: Metafile['outputs'][string]['imports'];
};

export type AssetInfo = {
    type: "asset";
    path: string;
    contents: Uint8Array;
}

export type PluginContext = {
    format: Format;
    splitting?: boolean;
    options: NormalizedOptions;
    logger: Logger;
};

export type ModifyEsbuildOptions = (this: PluginContext, options: EsbuildOptions) => void;

export type BuildStart = (this: PluginContext) => MaybePromise<void>;

export type RenderChunk = (
    this: PluginContext,
    code: string,
    chunkInfo: ChunkInfo
) => MaybePromise<
    | {
        code: string;
        map?: object | string | SourceMap | null
    }
    | undefined
    | null
    | void
>;

export type BuildEnd = (
    this: PluginContext,
    ctx: { writtenFiles: WrittenFile[] }
) => MaybePromise<void>;

export type Plugin = {
    name: string;
    esbuildOptions?: ModifyEsbuildOptions;
    buildStart?: BuildStart;
    renderChunk?: RenderChunk;
    buildEnd?: BuildEnd;
};

export type TreeshakingStrategy = boolean | TreeshakingOptions | TreeshakingPreset;