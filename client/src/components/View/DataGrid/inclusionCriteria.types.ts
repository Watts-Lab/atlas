// ─── Rule node types (discriminated union) ───────────────────────────────────

export type LogicOperator = 'AND' | 'OR' | 'NOT'
export type ScalarOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'starts_with'
  | 'exists'
export type ArrayOperator =
  | 'any'
  | 'all'
  | 'count_eq'
  | 'count_gt'
  | 'count_gte'
  | 'count_lt'
  | 'count_lte'

export type LogicNode = {
  type: 'logic'
  logic: LogicOperator
  rules: RuleNode[]
}

export type ArrayNode = {
  type: 'array'
  field: string // simple field name (last segment), e.g. "experiments"
  operator: ArrayOperator
  value?: number // used by count_* operators
  rule?: RuleNode // used by any / all operators
}

export type FieldNode = {
  type: 'field'
  field: string // simple field name, e.g. "participants_research"
  operator: ScalarOperator
  value?: string | number | boolean
}

export type RuleNode = LogicNode | ArrayNode | FieldNode

// ─── Eval result ─────────────────────────────────────────────────────────────

/** passes=true → pass, passes=false → fail, passes=null → field missing / unknown */
export type EvalResult = {
  passes: boolean | null
  reason?: string
  field?: string
  operator?: string
  value?: unknown
  actualValue?: unknown
  children?: EvalResult[]
  label?: string // human-readable description for the tooltip breakdown
}

// ─── Persisted criterion ─────────────────────────────────────────────────────

export type InclusionCriteria = {
  id: string
  name: string
  description: string
  formula: RuleNode
  created_at: string
  updated_at: string
}
