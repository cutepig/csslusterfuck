import * as fs from 'fs';
import {promisify} from 'util';
// import * as process from 'process';
import * as postcss from 'postcss';
// import * as syntax from 'postcss-scss';
const syntax = require('postcss-scss');

const readFile = promisify(fs.readFile);

function usage() {
  return `Clusterfuck
  Usage: clusterfuck /path/to/style.scss
  `;
}

async function clusterfuck(filename?: string): Promise<postcss.Root> {
  if (!filename)
    throw Error(usage());

  const data = await readFile(filename)
  const result = await postcss([]).process(data, {syntax});
  const root = result.root as postcss.Root;
  return root;
}

clusterfuck(process.argv[2])
  .then(ast => console.log(ast))
  .catch(err => console.log(err.message));
