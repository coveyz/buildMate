import process from 'process';
import path from 'path';
import * as colors from 'colorette';
import { findWorkspacePackages } from '@pnpm/find-workspace-packages';

import type { Project } from '@pnpm/find-workspace-packages';


const projectRoot = path.resolve(__dirname, '..')

export const getWorkSpacePackages = () => findWorkspacePackages(projectRoot);

export const errorAndExit = (err: Error) => {
    console.log(colors['red'](err?.message));
    process.exit(1);
};

const main = async () => {
    const tagVersion = process.env.TAG_VERSION || '0.0.0-beta1',
        gitHead = process.env.GIT_HEAD;

    if (!tagVersion || !gitHead) {
        errorAndExit(new Error(
            'No tag version or git head 🤓, make sure that you set the environment variable $TAG_VERSION \n'
        ));
    };

    const versionRegex = /^v?(\d+\.\d+\.\d+(-beta\d+)?)$/;

    if (!versionRegex.test(tagVersion)) {
        errorAndExit(new Error(
            'Invalid tag version format. It should be in the format "x.y.z" or "vx.y.z".\n'
        ))
    };

    const sanitizedVersion = tagVersion.startsWith('v') ? tagVersion.slice(1) : tagVersion;

    console.log(colors.blue('Updating package.json for build-mate 🚀'));

    const pkg = Object.fromEntries(
        (await getWorkSpacePackages()).map(pkg => [pkg.manifest.name!, pkg])
    );

    const buildMate = pkg['@coveyz/build-mate'];

    const writeVersion = async (project: Project) => {
        await project.writeProjectManifest({
            ...project.manifest,
            version: sanitizedVersion,
            gitHead
        } as any)
    };

    try {
        writeVersion(buildMate);
    } catch (error) {
        errorAndExit(error);
    };

    console.log(colors.green(`$GIT_HEAD: ${gitHead}`));
    console.log(colors.green('Updated package.json success for build-mate 🎉'));

};

main();