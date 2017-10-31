/* tslint:disable no-console */
import * as args from 'args'
import * as fs from 'fs'
import * as multiGlob from 'multi-glob'
import * as postcss from 'postcss'
import {promisify} from 'util'
import csslusterfuck from './index'

const readFile = promisify(fs.readFile)
const glob = promisify(multiGlob.glob)

args
  .option(
    'mode',
    `I've only bothered to implement 'dumb' mode. Try that.`,
    'dumb'
  )
  .option('unnormalized', 'Analyzation values will not be normalized')
  .option(['n', 'count'], 'Number of rules to show', 10)

function getLineNumber(rule: postcss.Rule) {
  // `rule.source.end` is also available to denote endpoint
  return `${rule.source.start!.line}:${rule.source.start!.column}`
}

function reportSuccess(analysis, options) {
  if (analysis.length > 0)
    console.log('I might have found some obnoxious CSS rules:\n')

  const {count} = options
  if (isNaN(options.count) || count < 1)
    throw new Error('You stupid! Count has to be a number from 1 to Infinity!')

  analysis.slice(0, +options.count).forEach(vector => {
    const rule: postcss.Rule = vector.rule
    console.log(`${vector.filename}#${getLineNumber(rule)} (${vector.weight})`)
    // TODO: Eliminate rule children
    console.log(rule.toString())
  })
}

function reportError(error) {
  console.error(`${error.message}\n`)
}

async function cli(filenames, options) {
  if (!filenames.length) throw new Error(`I'm sorry, what was that again?`)

  const _options = {
    ...options,
    count: +options.count,
    n: options.n,
    filenames,
  }

  const sources = await Promise.all<string>(
    filenames.map(filename => readFile(filename))
  )
  const result = csslusterfuck(sources, _options)
  return result
}

const argv = args.parse(process.argv, {name: 'csslusterfuck'})

if (!args.raw._.length) {
  args.showHelp()
  process.exit()
}

glob(args.raw._)
  .then(filenames => cli(filenames, argv))
  .then(data => reportSuccess(data, argv))
  .catch(reportError)
