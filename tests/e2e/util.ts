import { pathToFileURL } from 'node:url';
import path from 'node:path';

export const singleUrl = pathToFileURL(path.resolve('dist-single/index.html')).href;
