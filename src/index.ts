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

function _createMatrix(rules: postcss.Rule[]): Matrix {
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

        if(!matrix[decl2.prop])
          matrix[decl2.prop] = {};
        matrix[decl2.prop][decl1.prop] = (matrix[decl2.prop][decl1.prop] || 0) + 1;
      }
    }
  });

  return matrix;
}

type VectorWeight = {
  vector: number[];
  rule: postcss.Rule;
  weight: number;
  filename: string;
}

type RuleWithFilename = [string, postcss.Rule];

function analyzeRules(rules: RuleWithFilename[]): VectorWeight[] {
  const matrix = _createMatrix(map(rules, ([_, rule]) => rule));
  // Not sure if I even need to sort these..
  // const sorted = _sortMatrix(matrix);
  // ...Just go over the rules again, check it's values against the matrix
  // Collect decl vectors from rule, for instance [decl1, decl2, decl3]
  // Create index vectors from different permuations to get [[prop1 prop2] [prop1 prop3] [prop2 prop3]]
  // Map those into a vector of [value1 value2 value3] and compute vector length
  // Ok this is now implemented, but what then?
  // Now we would have the enhance the decl vector by trying different permutations
  // And we would have to test the rules against other rules to show what are the
  // similar blocks, showing those rules with the set of properties used
  const vectors = rules.map(([filename, rule]) => {
    if (!rule.nodes)
      return;

    const decls = rule.nodes.filter(isDeclaration) as postcss.Declaration[];
    if (decls.length < 2)
      return;

    const vector = [];
    for(let i = 0, l = decls.length; i < l; i++) {
      for(let j = i + 1, l = decls.length; j < l; j++) {
        const decl1 = decls[i];
        const decl2 = decls[j];
        vector.push(matrix[decl1.prop][decl2.prop]);
      }
    }

    return {vector, rule, filename};
  })

  // We should connect these to the relevant css rule
  const weights = vectors
    .filter(rules => !!rules)
    // Normalize vectors
    .map(vector => ({
      ...vector,
      weight: Math.sqrt(vector!.vector.reduce((a, b) => a + b * b, 0))
    } as VectorWeight));

  const sorted = sortBy(weights, (vector: VectorWeight) => -vector.weight);
  return sorted;
}

//
// Parse AST and collect Rules
function isRule(node: postcss.Node): node is postcss.Rule {
  return node.type === 'rule';
}

function getLineNumber(rule: postcss.Rule) {
  return `${rule.source.start!.line}:${rule.source.start!.column}-${rule.source.end!.line}:${rule.source.end!.column}`;
}


async function readRules(filename: string): Promise<RuleWithFilename[]> {
  const data = await readFile(filename);
  const result = await postcss([]).process(data, {syntax});
  const rules = filterAST(isRule, result.root as postcss.Node) as postcss.Rule[];
  return rules.map(rule => [filename, rule] as RuleWithFilename);
}

//
// Entry point
async function csslusterfuck(filenames: string[]) {
  const _rules = await Promise.all(filenames.map(readRules)) as [[[string, postcss.Rule]]];
  const rules = flatMap(_rules);
  // console.log('Rules', ...rules);
  const analysis = analyzeRules(rules);

  analysis.slice(0, 10).forEach((vector) => {
    const rule: postcss.Rule = vector.rule;
    console.log(`(${Math.round(vector.weight)}) ${vector.filename}#${getLineNumber(rule)} '${rule.selector}'`);
  });
}

glob(process.argv[2])
  .then(csslusterfuck)
  .catch((err: Error) => console.log(err.message, err));
