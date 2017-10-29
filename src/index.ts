import * as fs from 'fs';
import {promisify} from 'util';
import * as postcss from 'postcss';
import {omit, flatMap, map, sortBy} from 'lodash';

const syntax = require('postcss-scss');
const multiGlob = require('multi-glob');

const readFile = promisify(fs.readFile);
const glob = promisify(multiGlob.glob);

function usage() {
  return `CSSlusterfuck
  Usage: csslusterfuck /path/to/style.scss
  `;
}

//
// AST helpers
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

//
// Analyzation matrix
function isDeclaration(node: postcss.Node): node is postcss.Declaration {
  return node.type === 'decl';
}

interface MatrixRow {
  [key: string]: number;
}

interface Matrix {
  [key: string]: MatrixRow;
}

function createMatrix(rules: postcss.Rule[]): Matrix {
  const matrix: Matrix = {};

  rules.forEach(rule => {
    if (!rule.nodes)
      return;

    const decls = rule.nodes.filter(isDeclaration) as postcss.Declaration[];
    for(let i = 0, l = decls.length; i < l; i++) {
      for(let j = i + 1, l = decls.length; j < l; j++) {
        // NOTE: Do I really need to normalize the matrix? Doesn't
        // absolute count actually be valuable information?
        const decl1 = decls[i];
        const decl2 = decls[j];
        if(!matrix[decl1.prop])
          matrix[decl1.prop] = {};
        matrix[decl1.prop][decl2.prop] = (matrix[decl1.prop][decl2.prop] || 0) + 1;
      }
    }
  });

  return matrix;
}

function sortMatrix(matrix: Matrix) {
  const sortData = flatMap(matrix, (row, prop1) => map(row, (value, prop2) => [value, prop1, prop2]));
  return sortBy(sortData, ([value]) => -value);
}

function analyzeMatrix(matrix: Matrix) {
  const sorted = sortMatrix(matrix);
  return sorted;
}

//
// Parse AST and collect Rules
function isRule(node: postcss.Node): node is postcss.Rule {
  return node.type === 'rule';
}

async function csslusterfuckFile(filename: string): Promise<any> {
  const data = await readFile(filename);
  const result = await postcss([]).process(data, {syntax});
  const rules = filterAST(isRule, result.root as postcss.Node) as postcss.Rule[];
  // console.log('Rules', ...rules);
  const matrix = createMatrix(rules)
  // console.log('Matrix', matrix);
  const analysis = analyzeMatrix(matrix);
  console.log('Analysis', analysis);
}

//
// Entry point
function csslusterfuck(filenames: string[]): Promise<postcss.Root[]> {
  const promises = filenames.map(csslusterfuckFile);
  return Promise.all(promises);
}

glob(process.argv[2])
  .then(csslusterfuck)
  .catch((err: Error) => console.log(err.message));
