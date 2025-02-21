
import type { Plugin } from '../types/plugin';

/** 📦 Plugin: cjsInterop <CommonJS模块兼容性支持> */
export const cjsInterop = (): Plugin => {
    return {
        name: 'cjs-interop',
        renderChunk(code, info) {
            if (
                !this.options.cjsInterop ||
                this.format !== 'cjs' ||
                info.type !== 'chunk' ||
                !/\.(js|cjs)$/.test(info.path) ||
                !info.entryPoint ||
                info.exports?.length !== 1 ||
                info.exports[0] !== 'default'
            ) {
                return;
            };

            return {
                code: `${code}\nmodule.exports = exports.default`,
                map: info.map
            }
        }
    }
}