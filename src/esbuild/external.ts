import { tsconfigPathsToRegExp, match } from 'bundle-require';
import type { Plugin as EsbuildPlugin } from 'esbuild';



// Must not start with "/" or "./" or "../" or "C:\" or be the exact strings ".." or "."
const NON_NODE_MODULE_RE = /^[A-Z]:[\\\/]|^\.{0,2}[\/]|^\.{1,2}$/

/** 📦 externalPlugin <处理模块外部依赖> */
export const externalPlugin = ({
    external,
    noExternal,
    skipNodeModulesBundle,
    tsconfigResolvePaths
}: {
    external?: (string | RegExp)[];
    noExternal?: (string | RegExp)[];
    skipNodeModulesBundle?: boolean;
    tsconfigResolvePaths?: Record<string, string[]>;
}): EsbuildPlugin => {
    return {
        name: 'external',
        setup(build) {
            if (skipNodeModulesBundle) {
                const resolvePatterns = tsconfigPathsToRegExp(
                    tsconfigResolvePaths || {}
                );

                build.onResolve({ filter: /.*/ }, (args) => {
                    if (match(args.path, noExternal)) return;
                    if (match(args.path, resolvePatterns)) return;
                    if (match(args.path, external)) {
                        return { external: true }
                    };
                    // 排除任何看起来像 Node 模块的其他导入
                    if (!NON_NODE_MODULE_RE.test(args.path)) {
                        return {
                            path: args.path,
                            external: true
                        }
                    };
                })
            } else {
                build.onResolve({ filter: /.*/ }, (args) => {
                    if (match(args.path, noExternal)) return;
                    if (match(args.path, external)) {
                        return { external: true }
                    }
                });
            };
        }
    }
};