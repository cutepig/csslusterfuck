/* tslint:disable no-console */
import * as postcss from 'postcss';

function getLineNumber(rule: postcss.Rule) {
  // `rule.source.end` is also available to denote endpoint
  return `${rule.source.start!.line}:${rule.source.start!.column}`;
}

function dumbReporter(analysis, options) {
  if (analysis.length > 0) {
    console.log('I might have found some obnoxious CSS rules:\n');
  }

  const {count} = options;
  if (isNaN(options.count) || count < 1) {
    throw new Error('You stupid! Count has to be a number from 1 to Infinity!');
  }

  analysis.slice(0, +options.count).forEach(vector => {
    const rule: postcss.Rule = vector.rule;
    console.log(`${vector.filename}#${getLineNumber(rule)} (${vector.weight})`);
    // TODO: Eliminate rule children
    console.log(rule.toString());
  });
}

export default dumbReporter;
