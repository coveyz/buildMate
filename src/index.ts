import { loadBuildMateConfig } from './load';
import { createLogger } from './log';
import type { Options } from './types/options';


export const build = async (_options: Options) => {
    // console.log('🕹️-beforeBuild-options=>', _options);

    /** 🕹️ 读取加载 配置文件 */
    const config = _options.config === false
        ? {}
        : await loadBuildMateConfig(
            process.cwd(),
            _options.config === true ? undefined : _options.config
        );
    console.log('🕹️-buildMate-config=>', config);

    const configData = typeof config.data === 'function' ? await config.data(_options) : config.data;
    // console.log('🕹️-buildMate-configData=>', configData);

    await Promise.all(
        [...(Array.isArray(configData) ? configData : [configData])].map(async item => {
            console.log('🕹️-buildMate-item=>', item);

        })
    );
};