import { cac } from 'cac';
import flat from 'flat';

export const main = async () => {
    const cli = cac('build-mate');
    cli
        .command('[...files]', 'Bundle files', {
            ignoreOptionDefaultValue: true,
        })
        .option('--no-config', 'Disable config file')
        .action(async (files: string[], flags) => {
            console.log('build-mate:action',{files, flags});
        });

        cli.help();
        cli.parse(process.argv, { run: false });
        cli.runMatchedCommand();
};