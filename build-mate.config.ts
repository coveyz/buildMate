

// console.log('xxx');

const defineConfig = (options: any) => {
    return options;
};


export default defineConfig([
    {
        name: 'build-mate',
        entry: ['src/index.ts'],
        target: 'node16.14',
        dts: {
            resolve: true,
            entry: './src/index.ts',
        },
        outDir: "buildMate"
    },
]);