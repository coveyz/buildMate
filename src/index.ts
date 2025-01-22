import { loadBuildMateConfig } from './load';
import type { Options } from './types/options';


export const build = async (_options: Options) => {
    console.log('beforeBuild-options=>', _options);

    /** 🕹️ 读取加载 配置文件 */
    const config = _options.config === false
        ? {}
        : await loadBuildMateConfig(
            process.cwd(),
            _options.config === true ? undefined : _options.config
        );
    console.log('buildMate-config=>', config);

};