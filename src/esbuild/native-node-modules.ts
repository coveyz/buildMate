import path from 'path';
import { Plugin as EsbuildPlugin } from 'esbuild';


/** 📦 nativeNodeModules <处理 .node文件的解析和加载> */
export const nativeNodeModules = (): EsbuildPlugin => {
    return {
        name: 'native-node-modules',
        setup(build) {
            // 如果在 "file" 命名空间中的模块内导入 ".node" 文件，
            // 将其解析为绝对路径，并将其放入 "node-file" 虚拟命名空间中。
            //📦 插件在 file 命名空间解析 .node -> 解析成绝对路径， 放入node-file 空间
            build.onResolve({ filter: /\.node$/, namespace: 'file' }, args => {
                const resolvedId = require.resolve(args.path, {
                    paths: [args.resolveDir]
                });
                if (resolvedId.endsWith('.node')) {
                    return {
                        path: resolvedId,
                        namespace: 'node-file'
                    }
                }
                return {
                    path: resolvedId
                }
            });

            // 位于 "node-file" 虚拟命名空间中的文件在输出目录中调用
            // esbuild 对 ".node" 文件路径的 "require()"。
            //📦 插件在 node-file 空间中的文件，调用 esbuild 对 .node文件路径的 require()
            build.onLoad({ filter: /.*/, namespace: 'node-file' }, args => {
                return {
                    contents: `
                        import path from ${JSON.stringify(args.path)};
                        try { module.exports = require(path) }                        
                        catch{}
                    `,
                    resolveDir: path.dirname(args.path)
                }
            });

            // 如果在 "node-file" 命名空间中的模块内导入 ".node" 文件，
            // 将其放入 "file" 命名空间，以便 esbuild 的默认加载行为来处理。
            // 它已经是一个绝对路径，因为我们在上面已经将其解析为绝对路径。
            //📦 插件在 node-file 空间中的模块内导入 .node文件，放入file空间
            build.onResolve({filter: /\.node$/, namespace: 'node-file'}, args => {
                return {
                    path: args.path,
                    namespace: 'file'
                }
            });

            const opts = build.initialOptions;
            opts.loader = opts.loader || {};
            opts.loader['.node'] = 'file'; //设置 .node 文件的加载器为 file
        }
    }
};

