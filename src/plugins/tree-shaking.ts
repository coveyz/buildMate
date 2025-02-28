import { rollup } from 'rollup';
import hashbangPlugin from 'rollup-plugin-hashbang';

import type { Plugin, TreeshakingStrategy } from '../types/plugin';



/** 📦 Plugin: treeShaking <移除未使用的代码> */
export const treeShakingPlugin = ({
    treeshake,
    name,
    silent
}: {
    treeshake?: TreeshakingStrategy
    name?: string;
    silent?: boolean;
}): Plugin => {
    return {
        name: 'tree-shaking',
        async renderChunk(code, info) {
            if (!treeshake || !/\.(cjs|js|mjs)$/.test(info.path)) return;

            const bundle = await rollup({
                input: [info.path],
                plugins: [
                    hashbangPlugin(),
                    {
                        name: 'build-mate',
                        resolveId(source) {
                            if (source === info.path) return source;
                            return false;
                        },
                        load(id) {
                            if (id === info.path) return code;
                        }
                    }
                ],
                treeshake: treeshake,
                makeAbsoluteExternalsRelative: false,
                preserveEntrySignatures: 'exports-only',
                onwarn: silent ? () => { } : undefined
            });

            const result = await bundle.generate({
                interop: 'auto',
                format: this.format,
                file: 'out.js',
                sourcemap: !!this.options.sourcemap,
                name
            });

            for (const file of result.output) {
                if (file.type === 'chunk') {
                    if (file.fileName.endsWith('out.js')) {
                        return {
                            code: file.code,
                            map: file.map
                        }
                    }
                }
            };
        }
    }
};