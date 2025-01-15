import { handleError } from './errors';
import { main } from './cli-main';

main().catch(handleError);