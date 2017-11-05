/* tslint:disable no-console */
import * as args from 'args';
import * as fs from 'fs';
import * as multiGlob from 'multi-glob';
import {promisify} from 'util';
import dumbAnalyzer from './analyzers/dumbAnalyzer';
import dumbCrossAnalyzer from './analyzers/dumbCrossAnalyzer';
import csslusterfuck from './index';
import dumbCrossReporter from './reporters/dumbCrossReporter';
import dumbReporter from './reporters/dumbReporter';

const readFile = promisify(fs.readFile);
const glob = promisify(multiGlob.glob);

args
  .option(
    'mode',
    `I've only bothered to implement 'dumb' and 'dumb-cross' modes. Try those.`,
    'dumb'
  )
  .option('unnormalized', 'Analyzation values will not be normalized')
  .option(['n', 'count'], 'Number of rules to show', 10);

function errorReporter(error) {
  console.error(`${error.message}\n`, error.stack);
}

type AnalyzerType = 'dumb' | 'dumb-cross';

function getAnalyzer(mode: AnalyzerType) {
  switch (mode) {
    case 'dumb':
      return dumbAnalyzer;
    case 'dumb-cross':
      return dumbCrossAnalyzer;
    default:
      return dumbAnalyzer;
  }
}

function getReporter(mode: AnalyzerType) {
  switch (mode) {
    case 'dumb':
      return dumbReporter;
    case 'dumb-cross':
      return dumbCrossReporter;
    default:
      return dumbReporter;
  }
}

async function cli(filenames, options) {
  if (!filenames.length) throw new Error(`I'm sorry, what was that again?`);

  const _options = {
    unnormalized: Boolean(options.unnormalized),
    count: +options.count,
    analyzer: getAnalyzer(options.mode),
    filenames,
  };

  const sources = await Promise.all<string>(
    filenames.map(filename => readFile(filename))
  );
  const analysis = await csslusterfuck(sources, _options);
  const reporter = getReporter(options.mode);

  return reporter(analysis, _options);
}

const argv = args.parse(process.argv, {name: 'csslusterfuck'});

if (!args.raw._.length) {
  args.showHelp();
  process.exit();
}

glob(args.raw._)
  .then(filenames => cli(filenames, argv))
  .catch(errorReporter);
