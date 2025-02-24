import { loadBuildMateConfig } from './load';
import { createLogger } from './log';
import { normalizeOptions } from './options';
import { version } from './version';
import { dtsTask, mainTask } from './tasks';
import type { MaybePromise } from './types/utils';
import type { Options, Format, NormalizedOptions } from './types/options';


export type { Format, Options, NormalizedOptions };


export const defineConfig = (
    options:
        | Options
        | Options[]
        | ((
            overrideOptions: Options
        ) => MaybePromise<Options | Options[]>)
) => options;

export const build = async (_options: Options) => {
    /** 🕹️ 读取加载 配置文件 */
    const config = _options.config === false
        ? {}
        : await loadBuildMateConfig(
            process.cwd(),
            _options.config === true ? undefined : _options.config
        );

    const configData = typeof config.data === 'function' ? await config.data(_options) : config.data;

    await Promise.all(
        [...(Array.isArray(configData) ? configData : [configData])].map(async item => {
            const logger = createLogger(item?.name);
            const options = await normalizeOptions(logger, item, _options);
            logger.info('CLI', `build-mate v${version} 📝`);

            if (config.path) {
            logger.info('CLI', `Using build-mate config: ${config.path} 📝`);
            };
            if (options.watch) {
                logger.info('CLI', `Running in watch mode 👓`);
            };

            await Promise.all([
                dtsTask(options, item),
                mainTask(options, logger)
            ]);
        })
    );
};