import { cac } from 'cac';

import { slash, ensureArray } from './utils';
import { version } from '../package.json';
import type { Options, Format } from './types/options';


export const main = async (options: Options = {}) => {
    const cli = cac('build-mate');
    cli
        .command('[...files]', 'Bundle files', {
            ignoreOptionDefaultValue: true,
        })
        .option('--entry.* <file>', 'Use a key-value pair as entry files')
        .option('--format <format>', 'Bundle format, "cjs", "iife", "esm"', {
            default: 'cjs',
        })
        .option('--target <target>', 'Bundle target. "es20XX", "esnext"', {
            default: 'es2017'
        })
        .option(
            '--external <name>',
            'Mark specific packages / package.json (dependencies and peerDependencies) as external',
        )
        .option('--config <config>', 'Use a custom config file')
        .option('--no-config', 'Disable config file')
        .option('--watch [path]',
            'Watch mode, if path is not specified, it watches the current folder "." . Repeat "--watch" for more than one path'
        )
        .option('--ignore-watch <path>', 'Ignore custom paths in watch mode')
        .option('--dts [entry]', 'Generate declaration file')
        .option('--dts-resolve', 'Resolve externals types used for d.ts files')
        .option('--dts-only', 'Emit declaration files only')
        .option('--inject <file>', 'Replace a global variable with an import from another file')
        .option('--define.* <value>', 'Define compile-time constants')
        .option('--loader <ext=loader>', 'Specify the loader for a file extension')
        .action(async (files: string[], flags) => {
            const { build } = await import('.');

            Object.assign(options, {
                ...flags
            });

            if (!options.entry && files.length > 0) {
                options.entry = files.map((file) => slash(file));
            };
            if (flags.format) {
                const format = ensureArray(flags.format) as Format[];
                options.format = format;
            };
            if (flags.target) {
                options.target = flags.target.indexOf(',') >= 0
                    ? flags.target.split(',')
                    : flags.target;
            }
            if (flags.external) {
                const external = ensureArray(flags.external);
                options.external = external;
            }
            if (flags.dts || flags.dtsResolve || flags.dtsOnly) {
                options.dts = {};
                if (typeof flags.dts === 'string') {
                    options.dts.entry = flags.dts;
                };
                if (flags.dtsResolve) {
                    options.dts.resolve = flags.dtsResolve
                }
                if (flags.dtsOnly) {
                    options.dts.only = true;
                }
            };
            if (flags.inject) {
                const inject = ensureArray(flags.inject);
                options.inject = inject;
            };
            if (flags.define) {
                const { flatten } = await import('flat');
                const define: Record<string, string> = flatten(flags.define);
                options.define = define;
            };
            if (flags.loader) {
                const loader = ensureArray(flags.loader);
                options.loader = loader.reduce((acc,cur) => {
                    const part = cur.split('=');
                    return {
                        ...acc,
                        [part[0]]: part[1]
                    }
                }, {})
            };

            await build(options);
        });

    cli.help();
    cli.version(version);
    cli.parse(process.argv, { run: false });
    await cli.runMatchedCommand();
};