import { MinifyOptions } from 'terser';

import { PrettyError } from '../errors';
import type { Plugin } from '../types/plugin';
import type { Options, Format } from '../types/options';
import type { Logger } from '../types/log';



/** 📦 Plugin: terserPlugin <压缩优化> */
export const terserPlugin = ({
    minifyOptions,
    format,
    terserOptions,
    globalName,
    logger
}: {
    minifyOptions: Options['minify'],
    format: Format,
    terserOptions?: MinifyOptions,
    globalName?: Options['globalName']
    logger: Logger
}): Plugin => {
    return {
        name: 'terser',
        async renderChunk(code, info) {
            if (minifyOptions !== 'terser' || !/\.(cjs|js|mjs)$/.test(info.path)) return;

            const terser: typeof import('terser') = await import('terser');
            if (!terser) {
                throw new PrettyError(
                    'terser is required for terser minification. please install with `npm install terser -D`'
                )
            };

            const { minify } = terser;
            const defaultOptions: MinifyOptions = {};

            if (format === 'esm') {
                defaultOptions.module = true;
            } else if (format === 'iife' && globalName !== undefined) {
                defaultOptions.toplevel = true;
            };

            try {
                const minifiedOutput = await minify(
                    { [info.path]: code },
                    { ...defaultOptions, ...terserOptions }
                );
                logger.info('TERSER', 'Minify with terser 🚀');

                if (!minifiedOutput.code) {
                    logger.error('TERSER', 'Failed to minify with terser ❌');
                };

                logger.success('TERSER', 'Terser Minify success ✅');

                return { code: minifiedOutput.code!, map: minifiedOutput.map };
            } catch (error) {
                logger.error('TERSER', 'Failed to minify with terser ❌');
                logger.error('TERSER', error);
            };

            return { code, map: info.map };
        }
    }
}