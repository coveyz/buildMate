import { defineConfig } from '@coveyz/build-mate';

export default defineConfig({
    name: 'build-mate',
    target: 'node16.14',
    dts: {
        resolve: true,
        entry: './src/index.ts',
    },
    outDir: 'build-mate'
});