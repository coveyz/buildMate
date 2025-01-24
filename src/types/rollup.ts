import type { InputOptions, OutputOptions } from 'rollup';

export type RollupConfig = {
    inputConfig: InputOptions;
    outputConfig: OutputOptions[];
};

export type TsResolveOptions = {
    resolveOnly?: (string | RegExp)[];
    ignore?: (source: string, importer?: string) => boolean;
}