import { writeFile } from 'fs/promises';
import path from 'path';
import consola from 'consola';

import pkg from '../package.json';

const getVersion = () => {
    const tagVersion = process.env.TAG_VERSION;

    if (tagVersion) {
        return tagVersion.startsWith('v') ? tagVersion.slice(1) : tagVersion;
    } else {
        return pkg.version;
    };
}

const version = getVersion();

const main = async () => {
    consola.info(`build-mate version:${version}`);

    const versionFilePath = path.resolve(__dirname, '../src/version.ts');

    await writeFile(versionFilePath, `export const version = '${version}'\n`);
};

main();