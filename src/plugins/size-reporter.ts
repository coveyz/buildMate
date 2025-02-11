import { reportSize } from '../lib/report-size';
import type { Plugin } from '../types/plugin';

/** 📦 Plugin: sizeReporter <体积分析> */
export const sizeReporter = (): Plugin => {
    return {
        name: 'size-reporter',
        buildEnd({ writtenFiles }) {
            reportSize(
                this.logger,
                this.format,
                writtenFiles.reduce((acc, cur) => { 
                    return {
                        ...acc,
                        [cur.name]: cur.size
                    }
                }, {})
            )
        }
    }
}