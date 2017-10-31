import {flatMap, map, sortBy} from 'lodash'
import * as postcss from 'postcss'
import {filterAST, isDeclaration, isRule} from '../lib/ast'

interface MatrixRow {
  [key: string]: number
}

interface Matrix {
  [key: string]: MatrixRow
}

function _createMatrix(rules: postcss.Rule[]): Matrix {
  const matrix: Matrix = {}

  rules.forEach(rule => {
    if (!rule.nodes) return

    const decls = rule.nodes.filter(isDeclaration) as postcss.Declaration[]
    for (let i = 0, l = decls.length; i < l; i++)
      for (let j = i + 1, k = decls.length; j < k; j++) {
        // NOTE: Do I really need to normalize the matrix? Doesn't
        // absolute count actually be valuable information?
        const decl1 = decls[i]
        const decl2 = decls[j]

        if (!matrix[decl1.prop]) matrix[decl1.prop] = {}
        matrix[decl1.prop][decl2.prop] =
          (matrix[decl1.prop][decl2.prop] || 0) + 1

        if (!matrix[decl2.prop]) matrix[decl2.prop] = {}
        matrix[decl2.prop][decl1.prop] =
          (matrix[decl2.prop][decl1.prop] || 0) + 1
      }
  })

  return matrix
}

interface VectorWeight {
  vector: number[]
  rule: postcss.Rule
  weight: number
  filename: string
}

type RuleWithFilename = [string, postcss.Rule]

function analyzeRules(rules: RuleWithFilename[]): VectorWeight[] {
  const matrix = _createMatrix(map(rules, ([_, rule]) => rule))
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
  const len = rules.length || 1
  const vectors = rules.map(([filename, rule]) => {
    if (!rule.nodes) return

    const decls = rule.nodes.filter(isDeclaration) as postcss.Declaration[]
    if (decls.length < 2) return

    const vector: number[] = []
    for (let i = 0, l = decls.length; i < l; i++)
      for (let j = i + 1, k = decls.length; j < k; j++) {
        const decl1 = decls[i]
        const decl2 = decls[j]
        vector.push(matrix[decl1.prop][decl2.prop] / len)
      }

    return {vector, rule, filename}
  })

  // We should connect these to the relevant css rule
  const weights = vectors
    .filter(vector => !!vector)
    // Normalize vectors
    .map(
      vector =>
        ({
          ...vector,
          weight: Math.sqrt(vector!.vector.reduce((a, b) => a + b * b, 0)),
        } as VectorWeight)
    )

  const sorted = sortBy(weights, (vector: VectorWeight) => -vector.weight)
  return sorted
}

function readRules(ast: postcss.Node, filename: string): RuleWithFilename[] {
  const rules = filterAST(isRule, ast as postcss.Node) as postcss.Rule[]
  return rules.map(rule => [filename, rule] as RuleWithFilename)
}

function dumbAnalyzer(asts: postcss.Node[], options) {
  const _rules = asts.map((ast, n) => readRules(ast, options.filenames[n]))
  const rules = flatMap(_rules)
  // console.log('Rules', ...rules);
  const analysis = analyzeRules(rules)
  return analysis
}

export default dumbAnalyzer
