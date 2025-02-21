import path from 'path';
import fs from 'fs';
import { builtinModules } from 'module';
import createDebug from 'debug';
import _resolve from 'resolve';
import type { PluginImpl } from 'rollup';

import type { TsResolveOptions } from '../types/rollup';



const debug = createDebug('build-mate:ts-resolve');

/** 🏖️ 解析模块路径 */
const resolveModule = (
    id: string, opts: _resolve.AsyncOpts
): Promise<string | null> => {
    return new Promise((resolve, reject) => {
        _resolve(id, opts, (err, res) => {
            // @ts-expect-error error code is not typed
            if (err?.code === 'MODULE_NOT_FOUND') return resolve(null);
            if (err) return reject(err);
            resolve(res || null);
        });
    });
};

/** 🏖️ ts 路径解析 */
export const tsResolvePlugin: PluginImpl<TsResolveOptions> = ({
    resolveOnly, ignore
} = {}) => {
    const resolveExtensions = ['.d.ts', '.ts'];

    return {
        name: 'ts-resolve',
        async resolveId(source, importer) {
            debug('resolveId source: %s', source);
            debug('resolveId importer: %s', importer);

            if (!importer) return null;
            if (/\0/.test(source)) return null;
            // 忽略内置模块
            if (builtinModules.includes(source)) return false;
            if (ignore && ignore(source, importer)) {
                debug('ignored %s', source);
                return null;
            };
            /** 🏖️ 仅解析特定模块 */
            if (resolveOnly) {
                const shouldResolve = resolveOnly.some((item) => {
                    if (typeof item === 'string') return item === source;
                    return item.test(source);
                });
                if (!shouldResolve) {
                    debug('skipped by matching resolveOnly: %s', source);
                    return null;
                }
            }
            /** 🏖️ 处理 相对&绝对路径 */
            if (path.isAbsolute(source)) {
                debug('skipped absolute path: %s', source);
                return null
            };
            const basedir = importer
                ? await fs.promises.realpath(path.dirname(importer))
                : process.cwd();

            if (source[0] === '.') {
                return resolveModule(source, {
                    basedir,
                    extensions: resolveExtensions,
                })
            };

            /** 🏖️ 解析 其他模块 */
            let id: string | null = null;
            if (!importer) {
                id = await resolveModule(`./${source}`, {
                    basedir,
                    extensions: resolveExtensions,
                });
            };
            if (!id) {
                id = await resolveModule(source, {
                    basedir,
                    extensions: resolveExtensions,
                    packageFilter(pkg) {
                        pkg.main = pkg.types || pkg.typings;
                        return pkg;
                    },
                    paths: ['node_modules', 'node_modules/@types'],
                });
            };

            if (id) {
                debug('resolved %s to %s', source, id);
                return id;
            };

            debug('mark %s as external', source);

            return false;
        }
    }
}