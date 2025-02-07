import { cac } from 'cac';

import { slash, ensureArray } from './utils';
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
        .action(async (files: string[], flags) => {
            console.log('build-mate:action', { files, flags });
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
            //TODO: dts, dtsResolve,dtsOnly
            //TODO: inject
            //TODO: define
            //TODO: loader
            // console.log('🕹️options=>', options);
            await build(options);
        });

    cli.help();
    cli.parse(process.argv, { run: false });
    await cli.runMatchedCommand();
};