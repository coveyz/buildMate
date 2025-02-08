import path from 'path';
import { SourceMapConsumer, SourceMapGenerator } from 'source-map';
import { parseSourceMap } from './utils';
import type { BuildOptions as EsbuildOptions, Metafile, OutputFile } from 'esbuild';
import type { RawSourceMap } from 'source-map';

import { isJS, isCSS } from './utils';
import { outputFile } from './fs';
import type { Plugin, PluginContext, AssetInfo, ChunkInfo, WrittenFile } from './types/plugin';


/** 📦 PluginContainer */
export class PluginContainer {
    plugins: Plugin[];
    context: PluginContext;

    constructor(plugins: Plugin[]) {
        this.plugins = plugins;
    };
    setContext(context: PluginContext) {
        this.context = context;
    };
    getContext() {
        if (!this.context) throw new Error(`Plugin context is not set`);
        return this.context;
    };
    modifyEsbuildOptions(options: EsbuildOptions) {
        for (const plugin of this.plugins) {
            if (plugin.esbuildOptions) {
                plugin.esbuildOptions.call(this.getContext(), options);
            }
        }
    };
    async buildStarted() {
        for (const plugin of this.plugins) {
            if (plugin.buildStart) {
                await plugin.buildStart.call(this.getContext());
            }
        }
    };
    async buildFinished({
        outputFiles,
        metafile,
    }: {
        outputFiles: OutputFile[];
        metafile: Metafile;
    }) {
        const files: Array<AssetInfo | ChunkInfo> = outputFiles
            .filter((file) => !file.path.endsWith('.map'))
            .map((file): ChunkInfo | AssetInfo => {
                if (isJS(file.path) || isCSS(file.path)) {
                    const relativePath = path.relative(process.cwd(), file.path);
                    const meta = metafile?.outputs[relativePath];

                    return {
                        type: 'chunk',
                        code: file.text,
                        map: outputFiles.find((file) => file.path === `${file.path}.map`)?.text,
                        path: file.path,
                        entryPoint: meta?.entryPoint,
                        exports: meta?.exports,
                        imports: meta?.imports,
                    }
                } else {
                    return {
                        type: 'asset',
                        path: file.path,
                        contents: file.contents,
                    }
                }
            });
        // console.log('📦-files=>', files);
        const writtenFiles: WrittenFile[] = [];

        await Promise.all(files.map(async (info) => {
            for (const plugin of this.plugins) {
                if (info.type === 'chunk' && plugin.renderChunk) {
                    const result = await plugin.renderChunk.call(this.getContext(), info.code, info);
                    if (result) {
                        info.code = result.code;
                        if (result.map) {
                            const originalConsumer = await new SourceMapConsumer(parseSourceMap(info.map));
                            const newConsumer = await new SourceMapConsumer(parseSourceMap(result.map));
                            const generator = SourceMapGenerator.fromSourceMap(originalConsumer);
                            generator.applySourceMap(newConsumer, info.path);
                            info.map = generator.toJSON();

                            originalConsumer.destroy();
                            newConsumer.destroy();
                        };
                    };
                }
            };

            const inlineSourceMap = this.context!.options.sourcemap === 'inline';
            const contents =
                info.type === 'chunk'
                    ? `${info.code}${getSourceMapComment(inlineSourceMap, info.map, info.path, isCSS(info.path))}`
                    : info.contents;

            await outputFile(info.path, contents, {
                mode: info.type === 'chunk' ? info.mode : undefined,
            });

            writtenFiles.push({
                get name() {
                    return path.relative(process.cwd(), info.path);
                },
                get size() {
                    return contents.length;
                }
            });

            if (info.type === 'chunk' && info.map && !inlineSourceMap) {
                const map = typeof info.map === 'string' ? JSON.parse(info.map) : info.map;
                const outPath = `${info.path}.map`;
                const contents = JSON.stringify(map);
                await outputFile(outPath, contents);
                writtenFiles.push({
                    get name() {
                        return path.relative(process.cwd(), outPath);
                    },
                    get size() {
                        return contents.length;
                    }
                })
            };

            for (const plugin of this.plugins) {
                if (plugin.buildEnd) {
                    await plugin.buildEnd.call(this.getContext(), { writtenFiles })
                }
            }
        }));
    };
};


const getSourceMapComment = (
    inline: boolean,
    map: RawSourceMap | string | null | undefined,
    filePath: string,
    isCssFile: boolean
) => {
    if (!map) return '';

    const prefix = isCssFile ? '/*' : '//',
        suffix = isCssFile ? '*/' : '';
    const url = inline
        ? `data:application/json;base64,${Buffer.from(
            typeof map === 'string' ? map : JSON.stringify(map)
        ).toString('base64')}`
        : `${path.basename(filePath)}.map`;

    return `${prefix}# sourceMappingURL=${url}${suffix}`;
};
