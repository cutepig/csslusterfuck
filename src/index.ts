import {defaults} from 'lodash';
import * as postcss from 'postcss';
import * as syntax from 'postcss-scss';
import dumbAnalyzer from './analyzers/dumbAnalyzer';

function parseSingleSource(
  source: string,
  filename: string
): Promise<postcss.Node> {
  return postcss([])
    .process(source, {
      from: filename,
      syntax,
    })
    .then(result => result.root);
}

interface CsslusterfuckOptions {
  filenames?: string[];
  unnormalized?: boolean;
  analyzer?: (asts: postcss.Node[], options: CsslusterfuckOptions) => any;
}

async function csslusterfuck(
  sources: string[],
  options: CsslusterfuckOptions
): Promise<any> {
  const _options = defaults({}, options, {
    filenames: sources.map((_, n) => `<source #${n}>`),
    unnormalized: false,
    count: 10,
    analyzer: dumbAnalyzer,
  });

  const asts = await Promise.all<postcss.Node>(
    sources.map((source, n) => parseSingleSource(source, _options.filenames[n]))
  );

  return _options.analyzer(asts, _options);
}

export default csslusterfuck;
