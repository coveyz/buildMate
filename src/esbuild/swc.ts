import path from 'path';
import { JscConfig } from '@swc/core';
import { Plugin as EsbuildPlugin } from 'esbuild';

import { localRequire } from '../utils';
import type { Logger } from '../types/log';

/** 📦 swcPlugin <使用swc生成装饰器元数据> */
export const swcPlugin = ({
    logger
}: {
    logger: Logger
}): EsbuildPlugin => {
    return {
        name: 'swc',
        setup(build) {
            const swc: typeof import('@swc/core') = localRequire('@swc/core');
            if (!swc) {
                logger.warn(
                    build.initialOptions.format!,
                    `you have tsconfigDecoratorMetaData enabled but @swc/core was not installed, skipping swc plugin`
                );
                return;
            };
            
            // 控制代码压缩和混淆过程中是否 保留函数和类的名称， 方便调试和错误跟踪
            build.initialOptions.keepNames = true;

            build.onLoad({ filter: /\.[jt]sx?$/ }, async (args) => {
                const isTs = /\.tsx?$/.test(args.path);

                const jsc: JscConfig = {
                    parser: {
                        syntax: isTs ? 'typescript' : 'ecmascript',
                        decorators: true
                    },
                    transform: {
                        legacyDecorator: true,
                        decoratorMetadata: true
                    },
                    keepClassNames: true,
                    target: 'es2020'
                };

                const result = await swc.transformFile(args.path, {
                    jsc,
                    sourceMaps: true,
                    configFile: true,
                    swcrc: true
                });

                let code = result.code;
                if (result.map) {
                    const map: { sources: string[] } = JSON.parse(result.map);
                    //确保 源路径 是相对路径
                    map.sources = map.sources.map((source) => {
                        return path.isAbsolute(source)
                            ? path.relative(path.dirname(args.path), source)
                            : source
                    });

                    code += `//# sourceMappingURL=data:application/json;base64,${Buffer.from(
                        JSON.stringify(map)
                    ).toString('base64')}`
                };

                return {
                    contents: code
                }
            });
        }
    }
}