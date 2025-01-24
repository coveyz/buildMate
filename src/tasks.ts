import path from 'path'
import { Worker } from 'worker_threads';

import type { NormalizedOptions, Options } from './types/options';


/** 📝 处理 typescript 声明文件的生成 */
export const dtsTask = async (options: NormalizedOptions, item?: Options) => {
    // console.log('📝-buildMate-dtsTask-options=>', options);
    if (options.dts) {
        await new Promise<void>((resolve, reject) => {
            const worker = new Worker(path.join(__dirname, './rollup.js'));
            worker.postMessage({
                configName: item?.name,
                options: {
                    ...options, //functions cannot be cloned
                    banner: undefined,
                    footer: undefined,
                    esbuildPlugins: undefined,
                    esbuildOptions: undefined,
                    plugins: undefined,
                    treeshake: undefined,
                    onSuccess: undefined,
                    outExtension: undefined
                }
            });
            worker.on('message', (data) => {
                if (data === 'error') {
                    reject(new Error('error occured in dts build'));
                } else if (data === 'success') {
                    resolve();
                } else {
                    const { type, text } = data;
                    if (type === 'log') {
                        console.log(text);
                    } else if (type === 'error') {
                        console.error(text);
                    }
                }
            });

        })
    };
};