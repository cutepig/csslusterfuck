import {flatMap, sortBy} from 'lodash';
import * as postcss from 'postcss';
import {filterAST, isDeclaration, isRule} from '../lib/ast';

type RuleWithFilename = [string, postcss.Rule];

function ruleDistance(rule1: postcss.Rule, rule2: postcss.Rule): number {
  if (!rule1.nodes || !rule2.nodes) return 0;

  const decls1 = rule1.nodes.filter(isDeclaration) as postcss.Declaration[];
  const decls2 = rule2.nodes.filter(isDeclaration) as postcss.Declaration[];

  const vector: number[] = [];
  for (let i = 0, l = decls1.length; i < l; i++) {
    for (let j = 0, k = decls2.length; j < k; j++) {
      const decl1 = decls1[i];
      const decl2 = decls2[j];
      if (decl1.prop === decl2.prop) {
        if (decl1.value === decl2.value) vector.push(1.0);
        else vector.push(0.5);
      }
    }
  }

  return Math.sqrt(vector.reduce((a, b) => a + b * b, 0));
}

export interface RuleDistance {
  rule1: postcss.Rule;
  rule2: postcss.Rule;
  filename1: string;
  filename2: string;
  distance: number;
}

export type AnalyzerResults = RuleDistance[];

function analyzeRules(rules: RuleWithFilename[]): AnalyzerResults {
  /* Idea here is to compare rules against each other */
  const length = rules.length;
  const distances: RuleDistance[] = [];

  for (let i = 0; i < length; i++) {
    for (let j = i + 1; j < length; j++) {
      const [filename1, rule1] = rules[i];
      const [filename2, rule2] = rules[j];
      const distance = ruleDistance(rule1, rule2);
      // NOTE: Aren't filenames included in the AST?
      distances.push({rule1, rule2, filename1, filename2, distance});
    }
  }

  return sortBy(distances, ({distance}) => -distance);
}

function readRules(ast: postcss.Node, filename: string): RuleWithFilename[] {
  const rules = filterAST(isRule, ast as postcss.Node) as postcss.Rule[];
  return rules.map(rule => [filename, rule] as RuleWithFilename);
}

function dumbCrossAnalyzer(asts: postcss.Node[], options): AnalyzerResults {
  const rules = flatMap(asts, (ast, n) => readRules(ast, options.filenames[n]));
  // console.log('rules', ...rules);
  const analysis = analyzeRules(rules);
  return analysis;
}

export default dumbCrossAnalyzer;
