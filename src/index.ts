import * as fs from 'fs';
import {promisify} from 'util';
import * as postcss from 'postcss';
import {omit} from 'lodash';

const syntax = require('postcss-scss');
const multiGlob = require('multi-glob');

const readFile = promisify(fs.readFile);
const glob = promisify(multiGlob.glob);

function usage() {
  return `CSSlusterfuck
  Usage: csslusterfuck /path/to/style.scss
  `;
}

interface ASTWalker {
  (node: postcss.Node): void;
}

function walkAST(fn: ASTWalker, node: postcss.Node): void {
  fn(node);
  switch (node.type) {
    case 'root':
    case 'rule':
    case 'atrule':
      if (node.nodes)
        node.nodes.forEach(child => walkAST(fn, child));
      // Intentional fall-through
    case 'decl':
    case 'comment':
  }
}

interface ASTFilter extends ASTWalker {
  (node: postcss.Node): boolean;
}

function filterAST(fn: ASTFilter, node: postcss.Node) {
  const nodes: postcss.Node[] = [];

  walkAST(_filterAST, node);

  return nodes;

  function _filterAST(node: postcss.Node) {
    if (fn(node))
      nodes.push(node);
  }
}

function isRule(node: postcss.Node): node is postcss.Rule {
  return node.type === 'rule';
}

async function csslusterfuckFile(filename: string): Promise<any> {
  const data = await readFile(filename);
  const result = await postcss([]).process(data, {syntax});
  const nodes = filterAST(isRule, result.root as postcss.Node) as postcss.Rule[];
  console.log('Rules', ...nodes);
}

function csslusterfuck(filenames: string[]): Promise<postcss.Root[]> {
  const promises = filenames.map(csslusterfuckFile);
  return Promise.all(promises);
}

glob(process.argv[2])
  .then(csslusterfuck)
  .catch((err: Error) => console.log(err.message));
