

// console.log('xxx');

const defineConfig = (options: any) => {
    return options;
};


export default defineConfig({
    name: 'build-mate',
    target: 'node16.14',
    dts: {
        resolve: true,
        entry: './src/index.ts',
    },
});