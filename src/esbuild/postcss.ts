import fs from 'fs';
import { transform } from 'esbuild';
import type { Plugin as EsbuildPlugin, Loader } from 'esbuild';
import type { Result } from 'postcss-load-config';

import { getPostcss } from '../utils';
import type { NormalizedOptions } from '../types/options';



/** 📦 postcssPlugin <postcss> */
export const postcssPlugin = ({
    css,
    inject,
    cssLoader
}: {
    css?: Map<string, string>
    inject?: NormalizedOptions['injectStyle']
    cssLoader?: Loader
}): EsbuildPlugin => {
    return {
        name: 'postcss',
        setup(build) {
            let configCache: Result;

            const getPostcssConfig = async () => {
                const loadConfig = require('postcss-load-config');
                if (configCache) return configCache;

                try {
                    const result = await loadConfig({}, process.cwd());
                    configCache = result;
                    return result;
                } catch (error: any) {
                    if (error.message.includes(`No Postcss Config found in`)) {
                        const result = { plugins: [], options: {} };
                        return result;
                    };
                    throw error;
                };
            };

            //📦 注入 样式
            build.onResolve({ filter: /^#style-inject$/ }, () => {
                return {
                    path: '#style-inject',
                    namespace: 'style-inject'
                }
            });
            build.onLoad({ filter: /^#style-inject$/ }, () => {
                return {
                    contents: `
                        export default function styleInject(css, { insertAt } = {}) {
                            if (!css || typeof document === 'undefined') return;
                            const head = document.head || document.getElementsByTagName('head')[0];
                            const style = document.createElement('style');
                            style.type = 'text/css';

                            if (insertAt === 'top') {
                                if (head.firstChild) {
                                    head.insertBefore(style, head.firstChild);
                                } else {
                                    head.appendChild(style);
                                }
                            } else {
                                head.appendChild(style);
                            }

                            if (style.styleSheet) {
                                style.styleSheet.cssText = css;
                            } else {
                                style.appendChild(document.createTextNode(css));
                            }
                        }
                    `,
                    loader: 'js'
                };
            });

            //📦 处理 css 文件
            build.onLoad({ filter: /\.css$/ }, async (args) => {
                let contents: string;
                if (css && args.path.endsWith('.svelte.css')) {
                    contents = css.get(args.path)!;
                } else {
                    contents = await fs.promises.readFile(args.path, 'utf-8');
                };

                // load postcss config
                const { plugins, options } = await getPostcssConfig();

                if (plugins && plugins.length > 0) {
                    const postcss = getPostcss();
                    if (!postcss) {
                        return {
                            errors: [
                                {
                                    text: `postcss is not installed`
                                }
                            ]
                        }
                    };
                    // transform css
                    const result = await postcss
                        .default(plugins)
                        .process(contents, { ...options, from: args.path });

                    contents = result.css;
                };

                if (inject) {
                    contents = (
                        await transform(contents, {
                            minify: build.initialOptions.minify,
                            minifyIdentifiers: build.initialOptions.minifyIdentifiers,
                            minifySyntax: build.initialOptions.minifySyntax,
                            minifyWhitespace: build.initialOptions.minifyWhitespace,
                            logLevel: build.initialOptions.logLevel,
                            loader: 'css'
                        })).code;

                    contents = typeof inject === 'function'
                        ? inject(JSON.stringify(contents), args.path)
                        : `import styleInject from '#style-inject';styleInject(${JSON.stringify(
                            contents
                        )})`

                    return {
                        contents,
                        loader: 'js'
                    };
                };

                return {
                    contents,
                    loader: cssLoader ?? 'css'
                }
            });
        },
    }
}