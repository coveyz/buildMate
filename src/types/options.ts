export type BrowserTarget =
    | 'chrome'
    | 'deno'
    | 'edge'
    | 'firefox'
    | 'hermes'
    | 'ie'
    | 'ios'
    | 'node'
    | 'opera'
    | 'rhino'
    | 'safari';
export type BrowserTargetWithVersion =
    | `${BrowserTarget}${number}`
    | `${BrowserTarget}${number}.${number}`
    | `${BrowserTarget}${number}.${number}.${number}`;
export type EsTarget =
    | 'es3'
    | 'es5'
    | 'es6'
    | 'es2015'
    | 'es2016'
    | 'es2017'
    | 'es2018'
    | 'es2019'
    | 'es2020'
    | 'es2021'
    | 'es2022'
    | 'esnext';

export type Target = BrowserTarget | BrowserTargetWithVersion | EsTarget;

export type Format = 'cjs' | 'iife' | 'esm';

export type Entry = string[] | Record<string, string>;



export type Options = {
    name?: string;
    entry?: Entry;
    format?: Format | Format[];
    target?: Target | Target[];
    /** Don't bundle these modules */
    external?: (string | RegExp)[];
};