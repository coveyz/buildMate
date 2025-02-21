import { PrettyError } from '../errors';
import { localRequire } from '../utils';
import type { Plugin } from '../types/plugin';

/** 📦 Plugin: es5Target <es5 目标代码 转换> */
export const es5 = (): Plugin => {
    let enable = false;

    return {
        name: 'es5-target',
        esbuildOptions(options) {
            if (options.target === 'es5') {
                options.target = 'es2020';
                enable = true;
            }
        },
        async renderChunk(code, info) {
            if (!enable || !/\.(cjs|js)$/.test(info.path)) return;

            const swc: typeof import('@swc/core') = localRequire('@swc/core');

            if (!swc) {
                throw new PrettyError(
                    '@swc/core is required for es5 target, please install it width `npm install @swc/core`'
                )
            };
            
            const result = await swc.transform(code, {
                filename: info.path,
                sourceMaps: this.options.sourcemap,
                // minify: !!this.options.minify,
                minify: Boolean(this.options.minify),
                jsc: {
                    target: 'es5',
                    parser: {
                        syntax: 'ecmascript'
                    },
                    minify: 
                        this.options.minify === true
                            ? {
                                // 是否启用 压缩
                                compress: false, 
                                // 混淆
                                mangle: { 
                                    reserved: this.options.globalName 
                                        ? [this.options.globalName]
                                        : []
                                }
                            }
                            : undefined
                }
            });

            console.log('result=>', result);

            return {
                code: result.code,
                map: result.map
            };
        }
    }
}