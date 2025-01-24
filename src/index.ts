import { loadBuildMateConfig } from './load';
import { createLogger } from './log';
import { normalizeOptions } from './options';
import { version } from '../package.json';
import { dtsTask } from './tasks';
import type { MaybePromise } from './types/utils';
import type { Options } from './types/options';

export type { Options };



export const defineConfig = (
    options:
        | Options
        | Options[]
        | ((
            overrideOptions: Options
        ) => MaybePromise<Options | Options[]>)
) => options;

export const build = async (_options: Options) => {
    // console.log('🕹️-beforeBuild-options=>', _options);

    /** 🕹️ 读取加载 配置文件 */
    const config = _options.config === false
        ? {}
        : await loadBuildMateConfig(
            process.cwd(),
            _options.config === true ? undefined : _options.config
        );
    // console.log('🕹️-buildMate-config=>', config);

    const configData = typeof config.data === 'function' ? await config.data(_options) : config.data;
    // console.log('🕹️-buildMate-configData=>', configData);

    await Promise.all(
        [...(Array.isArray(configData) ? configData : [configData])].map(async item => {
            // console.log('🕹️-buildMate-item=>', item);
            const logger = createLogger(item?.name);
            const options = await normalizeOptions(logger, item, _options);
            // console.log('🕹️-buildMate-options=>', options);

            logger.info('CLI', `build-mate v${version} 📝`);

            if (config.path) {
                logger.info('CLI', `Using build-mate config: ${config.path} 📝`);
            };
            if (options.watch) {
                logger.info('CLI', `Running in watch mode 👓`);
            };


            await Promise.all([dtsTask(options, item)]);
        })
    );
};