import type { RuleNode, LogicNode, ArrayNode, FieldNode, EvalResult } from './inclusionCriteria.types'

/**
 * Evaluate an inclusion-criteria formula against one raw result object.
 * The evaluator root context is result.paper[0].
 *
 * Returns EvalResult with passes=null when a required field is missing.
 */
export function evaluateCriteria(
  result: Record<string, unknown>,
  formula: RuleNode,
): EvalResult {
  const paperArr = result.paper
  const paper = Array.isArray(paperArr) ? (paperArr[0] as Record<string, unknown>) : (paperArr as Record<string, unknown>)
  if (!paper) return { passes: null, reason: 'No paper data in result' }
  return evaluateNode(formula, paper)
}

function evaluateNode(node: RuleNode, ctx: Record<string, unknown>): EvalResult {
  if (node.type === 'logic') return evaluateLogic(node, ctx)
  if (node.type === 'array') return evaluateArray(node, ctx)
  return evaluateField(node, ctx)
}

// ─── Logic ───────────────────────────────────────────────────────────────────

function evaluateLogic(node: LogicNode, ctx: Record<string, unknown>): EvalResult {
  const children = node.rules.map((r) => evaluateNode(r, ctx))

  if (node.logic === 'AND') {
    const anyFalse = children.some((c) => c.passes === false)
    const anyNull = children.some((c) => c.passes === null)
    return {
      passes: anyFalse ? false : anyNull ? null : true,
      label: `All of the following (AND)`,
      children,
    }
  }

  if (node.logic === 'OR') {
    const anyTrue = children.some((c) => c.passes === true)
    const allFalse = children.every((c) => c.passes === false)
    return {
      passes: anyTrue ? true : allFalse ? false : null,
      label: `Any of the following (OR)`,
      children,
    }
  }

  // NOT — single child
  const child = children[0]
  return {
    passes: child.passes === null ? null : !child.passes,
    label: `Not`,
    children,
  }
}

// ─── Array ───────────────────────────────────────────────────────────────────

function evaluateArray(node: ArrayNode, ctx: Record<string, unknown>): EvalResult {
  const raw = ctx[node.field]
  const base = { field: node.field, operator: node.operator }

  if (raw === undefined || raw === null) {
    return { ...base, passes: null, reason: `Field "${node.field}" is missing` }
  }
  if (!Array.isArray(raw)) {
    return { ...base, passes: null, reason: `Field "${node.field}" is not an array` }
  }

  const arr = raw as Record<string, unknown>[]

  // Count operators
  if (node.operator === 'count_eq')
    return { ...base, passes: arr.length === node.value, actualValue: arr.length, label: `${node.field} count = ${node.value} (actual: ${arr.length})` }
  if (node.operator === 'count_gte')
    return { ...base, passes: arr.length >= (node.value ?? 0), actualValue: arr.length, label: `${node.field} count ≥ ${node.value} (actual: ${arr.length})` }
  if (node.operator === 'count_gt')
    return { ...base, passes: arr.length > (node.value ?? 0), actualValue: arr.length, label: `${node.field} count > ${node.value} (actual: ${arr.length})` }
  if (node.operator === 'count_lte')
    return { ...base, passes: arr.length <= (node.value ?? 0), actualValue: arr.length, label: `${node.field} count ≤ ${node.value} (actual: ${arr.length})` }
  if (node.operator === 'count_lt')
    return { ...base, passes: arr.length < (node.value ?? 0), actualValue: arr.length, label: `${node.field} count < ${node.value} (actual: ${arr.length})` }

  // any / all — need a sub-rule
  if (!node.rule) {
    return { ...base, passes: null, reason: 'Missing sub-rule for any/all' }
  }

  const children = arr.map((item, i) => ({
    ...evaluateNode(node.rule!, item),
    label: evaluateNode(node.rule!, item).label ?? `${node.field}[${i}]`,
  }))

  if (node.operator === 'any') {
    const passes = children.some((c) => c.passes === true)
      ? true
      : children.every((c) => c.passes === false)
        ? false
        : null
    return { ...base, passes, label: `any ${node.field} matches`, children }
  }

  // all
  const passes =
    arr.length === 0
      ? false
      : children.every((c) => c.passes === true)
        ? true
        : children.some((c) => c.passes === false)
          ? false
          : null
  return { ...base, passes, label: `all ${node.field} match`, children }
}

// ─── Field (scalar) ──────────────────────────────────────────────────────────

function evaluateField(node: FieldNode, ctx: Record<string, unknown>): EvalResult {
  const raw = ctx[node.field]
  const base = { field: node.field, operator: node.operator, value: node.value }

  if (node.operator === 'exists') {
    const passes = raw !== undefined && raw !== null && raw !== ''
    return { ...base, passes, actualValue: raw, label: `${node.field} exists` }
  }

  if (raw === undefined || raw === null) {
    return { ...base, passes: null, reason: `Field "${node.field}" is missing`, actualValue: raw }
  }

  const actualStr = String(raw).toLowerCase().trim()
  const expectedStr = node.value !== undefined ? String(node.value).toLowerCase().trim() : ''
  const actualNum = Number(raw)
  const expectedNum = Number(node.value)
  const numericOk = !isNaN(actualNum) && !isNaN(expectedNum)

  let passes: boolean | null = null
  switch (node.operator) {
    case 'eq':          passes = actualStr === expectedStr; break
    case 'ne':          passes = actualStr !== expectedStr; break
    case 'gt':          passes = numericOk ? actualNum > expectedNum : null; break
    case 'gte':         passes = numericOk ? actualNum >= expectedNum : null; break
    case 'lt':          passes = numericOk ? actualNum < expectedNum : null; break
    case 'lte':         passes = numericOk ? actualNum <= expectedNum : null; break
    case 'contains':    passes = actualStr.includes(expectedStr); break
    case 'starts_with': passes = actualStr.startsWith(expectedStr); break
  }

  return {
    ...base,
    passes,
    actualValue: raw,
    label: `${node.field} ${node.operator} "${node.value}" (actual: "${raw}")`,
  }
}
