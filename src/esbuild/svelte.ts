import path from 'path';
import fs from 'fs';
import { transform } from 'esbuild';
import type { Plugin as EsbuildPlugin } from 'esbuild';

import { localRequire } from '../utils';

const useSvelteCssExtension = (p: string) =>
    p.replace(/\.svelte$/, '.svelte.css')

export const sveltePlugin = ({
    css
}: {
    css?: Map<string, string>
}): EsbuildPlugin => {
    return {
        name: 'svelte',
        setup(build) {
            let svelte: typeof import('svelte/compiler');
            let sveltePreprocessor: typeof import('svelte-preprocess').default;

            build.onResolve({ filter: /\.svelte\.css$/ }, async (args) => {
                return {
                    path: path.relative(
                        process.cwd(),
                        path.join(args.resolveDir, args.path)
                    ),
                    namespace: 'svelte-css'
                }
            });

            build.onLoad({ filter: /\.svelte$/ }, async (args) => {
                svelte = svelte || localRequire('svelte/compiler');
                sveltePreprocessor = sveltePreprocessor || localRequire('svelte-preprocess');

                if (!svelte) {
                    return {
                        errors: [{
                            text: 'You need to install "svelte" in your project',
                        }]
                    }
                };
                const source = await fs.promises.readFile(args.path, 'utf-8'),
                    fileName = path.relative(process.cwd(), args.path);
                const convertMessage = ({ message, start, end }: any) => {
                    let location;

                    if (start && end) {
                        const lineText = source.split(/\r\n|\r|\n/g)[start.line - 1];
                        const lineEnd = start.line === end.line ? end.column : lineText.length;

                        location = {
                            file: fileName,
                            line: start.line,
                            column: start.column,
                            length: lineEnd - start.column,
                            lineText
                        };
                    };

                    return { text: message, location }
                };

                try {
                    const preprocess = await svelte.preprocess(
                        source,
                        sveltePreprocessor
                            ? sveltePreprocessor({
                                sourceMap: true,
                                typescript: {
                                    compilerOptions: {
                                        preserveValueImports: true,
                                    },
                                }
                            })
                            : {
                                async script({ content, attributes }) {
                                    if (attributes.lang !== 'ts') return { code: content };
                                    const { code, map } = await transform(content, {
                                        sourcefile: args.path,
                                        loader: 'ts',
                                        sourcemap: true,
                                        tsconfigRaw: {
                                            compilerOptions: {
                                                preserveValueImports: true,
                                            }
                                        },
                                        logLevel: build.initialOptions.logLevel
                                    });

                                    return { code, map };
                                }
                            },
                        {
                            filename: args.path
                        }
                    );
                    const result = svelte.compile(preprocess.code, {
                        filename: fileName,
                        css: 'external',
                    })
                    let contents = result.js.code;

                    if (css && result.css?.code) {
                        const cssPath = useSvelteCssExtension(fileName);
                        css.set(cssPath, result.css.code);
                        // Directly prepend the `import` statement as sourcemap doesn't matter for now
                        // If that's need we should use `magic-string`
                        contents =
                            `import '${useSvelteCssExtension(path.basename(args.path))}';` +
                            contents
                    };
                    return {
                        contents,
                        warnings: result.warnings.map(convertMessage),
                    }
                } catch (error) {
                    return { errors: [convertMessage(error)] };
                }

            });
        }
    }
};

