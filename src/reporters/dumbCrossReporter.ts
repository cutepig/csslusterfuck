/* tslint:disable no-console */
import * as postcss from 'postcss';
import {AnalyzerResults} from '../analyzers/dumbCrossAnalyzer';
import {isRule} from '../lib/ast';

function getLineNumber(rule: postcss.Rule) {
  // `rule.source.end` is also available to denote endpoint
  return `${rule.source.start!.line}:${rule.source.start!.column}`;
}

function withoutChildrenRules(rule: postcss.Rule): postcss.Rule {
  const r = postcss.rule(rule);
  r.nodes = r.nodes && r.nodes.filter(node => !isRule(node));
  return r;
}

function dumbCrossReporter(analysis: AnalyzerResults, options) {
  if (analysis.length > 0) {
    console.log('I might have found some obnoxious CSS rules:\n');
  }

  const {count} = options;
  if (isNaN(options.count) || count < 1) {
    throw new Error('You stupid! Count has to be a number from 1 to Infinity!');
  }

  analysis.slice(0, options.count).forEach(vector => {
    const {rule1, rule2, filename1, filename2, distance} = vector;

    console.log(`${filename1}#${getLineNumber(rule1)} (${distance})`);
    // TODO: Eliminate rule children
    console.log(withoutChildrenRules(rule1).toString());
    console.log(`${filename2}#${getLineNumber(rule2)}`);
    // TODO: Eliminate rule children
    console.log(withoutChildrenRules(rule2).toString());
    console.log('\n');
  });
}

export default dumbCrossReporter;
