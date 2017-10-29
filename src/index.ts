import * as fs from 'fs';
import {promisify} from 'util';
import * as postcss from 'postcss';

const syntax = require('postcss-scss');
const multiGlob = require('multi-glob');

const readFile = promisify(fs.readFile);
const glob = promisify(multiGlob.glob);

function usage() {
  return `Clusterfuck
  Usage: clusterfuck /path/to/style.scss
  `;
}

async function clusterfuckSingleFile(filename: string): Promise<postcss.Root> {
  const data = await readFile(filename);
  const result = await postcss([]).process(data, {syntax});
  const root = result.root as postcss.Root;
  return root;
}

async function clusterfuck(filenames: string[]): Promise<postcss.Root[]> {
  const promises = filenames.map(clusterfuckSingleFile);
  return Promise.all(promises);
}

glob(process.argv[2])
  .then(clusterfuck)
  .then((ast: postcss.Root[]) => console.log(ast))
  .catch((err: Error) => console.log(err.message));
