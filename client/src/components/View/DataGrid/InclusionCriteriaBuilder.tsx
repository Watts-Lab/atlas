import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, X } from 'lucide-react'
import type { Feature } from './feature.types'
import type {
  ArrayNode,
  ArrayOperator,
  FieldNode,
  RuleNode,
  ScalarOperator,
} from './inclusionCriteria.types'

// ─── Operator tables ──────────────────────────────────────────────────────────

const OPERATORS_BY_TYPE: Record<Feature['feature_type'], string[]> = {
  text: ['eq', 'ne', 'contains', 'starts_with', 'exists'],
  number: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'exists'],
  boolean: ['eq', 'ne'],
  enum: ['eq', 'ne', 'exists'],
  parent: ['count_eq', 'count_gte', 'count_gt', 'count_lte', 'count_lt'],
}

const OPERATOR_LABELS: Record<string, string> = {
  eq: 'equals',
  ne: 'not equals',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  contains: 'contains',
  starts_with: 'starts with',
  exists: 'exists',
  count_eq: 'count =',
  count_gte: 'count ≥',
  count_gt: 'count >',
  count_lte: 'count ≤',
  count_lt: 'count <',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip .parent suffix and leading "paper." prefix so paths are relative to paper[0]. */
function normalizeIdent(identifier: string): string {
  let id = identifier
  if (id.endsWith('.parent')) id = id.slice(0, -7)
  if (id.startsWith('paper.')) id = id.slice(6)
  if (id === 'paper') id = ''
  return id
}

const uid = (): string => Math.random().toString(36).slice(2, 9)

/** Recursively build nested ArrayNodes from an array of path segments. */
function buildArrayChain(
  pathParts: string[],
  innerRule: RuleNode,
  arrayOp: 'any' | 'all',
): RuleNode {
  if (pathParts.length === 0) return innerRule
  const [first, ...rest] = pathParts
  return {
    type: 'array',
    field: first,
    operator: arrayOp,
    rule: buildArrayChain(rest, innerRule, arrayOp),
  } satisfies ArrayNode
}

// ─── Condition row model ──────────────────────────────────────────────────────

interface ConditionRow {
  /** React key */
  id: string
  featureId: string
  /** Operator key, e.g. "eq", "count_gte" */
  operator: string
  /** Always a string in the UI; converted to the correct type on output */
  value: string
  /** For nested leaf features: traverse the parent array(s) with any/all */
  arrayOperator: 'any' | 'all'
}

// ─── Build RuleNode from ConditionRow ─────────────────────────────────────────

function buildRule(cond: ConditionRow, features: Feature[]): RuleNode | null {
  const feature = features.find((f) => f.id === cond.featureId)
  if (!feature) return null

  const ident = normalizeIdent(feature.feature_identifier)
  if (!ident) return null

  const segments = ident.split('.')

  // ── Parent feature → count rule ──────────────────────────────────────────
  if (feature.feature_type === 'parent') {
    const op = cond.operator as ArrayOperator
    if (!op.startsWith('count_')) return null

    const arrayField = segments[segments.length - 1]
    const countNode: ArrayNode = {
      type: 'array',
      field: arrayField,
      operator: op,
      value: Number(cond.value) || 0,
    }
    // If the parent array is itself nested (e.g. experiments.conditions), wrap outer arrays
    if (segments.length > 1) {
      return buildArrayChain(segments.slice(0, -1), countNode, cond.arrayOperator)
    }
    return countNode
  }

  // ── Leaf feature → field rule (possibly wrapped in array traversal) ───────
  const fieldName = segments[segments.length - 1]

  let typedValue: string | number | boolean | undefined = cond.value
  if (feature.feature_type === 'number') {
    typedValue = cond.value !== '' ? Number(cond.value) : undefined
  } else if (feature.feature_type === 'boolean') {
    typedValue = cond.value === 'True' || cond.value === 'true'
  }

  const leafNode: FieldNode = {
    type: 'field',
    field: fieldName,
    operator: cond.operator as ScalarOperator,
    value: cond.operator === 'exists' ? undefined : typedValue,
  }

  if (segments.length === 1) return leafNode

  return buildArrayChain(segments.slice(0, -1), leafNode, cond.arrayOperator)
}

// ─── Parse RuleNode back to ConditionRow (best-effort) ───────────────────────

function findLeafField(rule: RuleNode): FieldNode | null {
  if (rule.type === 'field') return rule
  if (rule.type === 'array' && rule.rule) return findLeafField(rule.rule)
  return null
}

function collectArrayFields(rule: ArrayNode): string[] {
  const fields: string[] = [rule.field]
  if (rule.rule && rule.rule.type === 'array') {
    fields.push(...collectArrayFields(rule.rule))
  }
  return fields
}

function ruleToCondition(rule: RuleNode, features: Feature[]): ConditionRow | null {
  // ── Bare FieldNode (top-level scalar) ─────────────────────────────────────
  if (rule.type === 'field') {
    const feature = features.find((f) => {
      if (f.feature_type === 'parent') return false
      const ident = normalizeIdent(f.feature_identifier)
      const parts = ident.split('.')
      return parts.length === 1 && parts[0] === rule.field
    })
    if (!feature) return null
    return {
      id: uid(),
      featureId: feature.id,
      operator: rule.operator,
      value: rule.value !== undefined ? String(rule.value) : '',
      arrayOperator: 'any',
    }
  }

  if (rule.type === 'array') {
    const op = rule.operator

    // ── Flat count (e.g. { field:"experiments", op:"count_gte", value:1 }) ──
    if (op.startsWith('count_')) {
      const feature = features.find((f) => {
        if (f.feature_type !== 'parent') return false
        return normalizeIdent(f.feature_identifier) === rule.field
      })
      if (!feature) return null
      return {
        id: uid(),
        featureId: feature.id,
        operator: op,
        value: String(rule.value ?? 0),
        arrayOperator: 'any',
      }
    }

    if ((op === 'any' || op === 'all') && rule.rule) {
      const inner = rule.rule

      // ── Nested count (e.g. any(experiments) → count_gte(conditions, 2)) ──
      if (inner.type === 'array' && inner.operator.startsWith('count_')) {
        const fullPath = rule.field + '.' + inner.field
        const feature = features.find((f) => {
          if (f.feature_type !== 'parent') return false
          return normalizeIdent(f.feature_identifier) === fullPath
        })
        if (!feature) return null
        return {
          id: uid(),
          featureId: feature.id,
          operator: inner.operator,
          value: String(inner.value ?? 0),
          arrayOperator: op as 'any' | 'all',
        }
      }

      // ── Nested leaf field ─────────────────────────────────────────────────
      const leaf = findLeafField(inner)
      if (!leaf) return null

      const arrayPath = collectArrayFields(rule)
      const fullPath = [...arrayPath, leaf.field].join('.')

      const feature = features.find((f) => {
        if (f.feature_type === 'parent') return false
        return normalizeIdent(f.feature_identifier) === fullPath
      })
      if (!feature) return null

      return {
        id: uid(),
        featureId: feature.id,
        operator: leaf.operator,
        value: leaf.value !== undefined ? String(leaf.value) : '',
        arrayOperator: op as 'any' | 'all',
      }
    }
  }

  return null
}

function formulaToState(
  formula: RuleNode,
  features: Feature[],
): { logic: 'AND' | 'OR'; conditions: ConditionRow[] } {
  if (formula.type === 'logic' && (formula.logic === 'AND' || formula.logic === 'OR')) {
    return {
      logic: formula.logic,
      conditions: formula.rules
        .map((r) => ruleToCondition(r, features))
        .filter((c): c is ConditionRow => c !== null),
    }
  }
  const single = ruleToCondition(formula, features)
  return { logic: 'AND', conditions: single ? [single] : [] }
}

// ─── ConditionRowEditor ───────────────────────────────────────────────────────

interface ConditionRowEditorProps {
  condition: ConditionRow
  onChange: (patch: Partial<ConditionRow>) => void
  onRemove: () => void
  projectFeatures: Feature[]
  /** Shown as a small badge before the row (e.g. "AND" / "OR") for rows after the first */
  logicLabel?: string
}

function ConditionRowEditor({
  condition,
  onChange,
  onRemove,
  projectFeatures,
  logicLabel,
}: ConditionRowEditorProps) {
  const feature = projectFeatures.find((f) => f.id === condition.featureId)
  const isParent = feature?.feature_type === 'parent'
  const normalizedIdent = feature ? normalizeIdent(feature.feature_identifier) : ''
  /** True when the field is inside an array (needs any/all traversal) */
  const isNested = normalizedIdent.split('.').length > 1
  const operators = feature ? OPERATORS_BY_TYPE[feature.feature_type] : ['eq']

  const handleFeatureChange = (featureId: string) => {
    const f = projectFeatures.find((x) => x.id === featureId)
    if (!f) return
    const ops = OPERATORS_BY_TYPE[f.feature_type]
    const newOp = ops.includes(condition.operator) ? condition.operator : ops[0]
    onChange({ featureId, operator: newOp, value: '' })
  }

  const parentFeatures = projectFeatures.filter((f) => f.feature_type === 'parent')
  const leafFeatures = projectFeatures.filter((f) => f.feature_type !== 'parent')

  return (
    <div className='flex items-center gap-2 flex-wrap rounded-lg border bg-muted/30 px-3 py-2 min-h-[42px]'>
      {/* AND / OR badge for non-first rows */}
      {logicLabel && (
        <Badge variant='outline' className='font-mono text-xs shrink-0 min-w-[38px] justify-center'>
          {logicLabel}
        </Badge>
      )}

      {/* ── Field selector ────────────────────────────────────────────── */}
      <Select value={condition.featureId || ''} onValueChange={handleFeatureChange}>
        <SelectTrigger className='w-52 h-8 text-xs' size='sm'>
          <SelectValue placeholder='Select field…' />
        </SelectTrigger>
        <SelectContent>
          {projectFeatures.length === 0 && (
            <div className='py-4 text-center text-xs text-muted-foreground'>
              No features assigned to this project yet.
            </div>
          )}

          {parentFeatures.length > 0 && (
            <SelectGroup>
              <SelectLabel className='text-xs'>Arrays (count / traverse)</SelectLabel>
              {parentFeatures.map((f) => (
                <SelectItem key={f.id} value={f.id} className='text-xs'>
                  {f.trail || f.feature_name}
                </SelectItem>
              ))}
            </SelectGroup>
          )}

          {parentFeatures.length > 0 && leafFeatures.length > 0 && <SelectSeparator />}

          {leafFeatures.length > 0 && (
            <SelectGroup>
              <SelectLabel className='text-xs'>Fields</SelectLabel>
              {leafFeatures.map((f) => (
                <SelectItem key={f.id} value={f.id} className='text-xs'>
                  {f.trail || f.feature_name}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>

      {/* ── any / all toggle for nested features ─────────────────────── */}
      {feature && isNested && (
        <div
          className='inline-flex rounded border overflow-hidden text-xs font-semibold shrink-0'
          title='Traverse the parent array: match ANY item, or require ALL items to satisfy this condition'
        >
          {(['any', 'all'] as const).map((op) => (
            <button
              key={op}
              type='button'
              onClick={() => onChange({ arrayOperator: op })}
              className={`px-2.5 py-1 transition-colors focus:outline-none ${
                condition.arrayOperator === op
                  ? 'bg-blue-600 text-white'
                  : 'bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              {op}
            </button>
          ))}
        </div>
      )}

      {/* ── Operator selector ─────────────────────────────────────────── */}
      {feature && (
        <Select
          value={condition.operator}
          onValueChange={(op) =>
            onChange({ operator: op, value: op === 'exists' ? '' : condition.value })
          }
        >
          <SelectTrigger className='w-32 h-8 text-xs' size='sm'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {operators.map((op) => (
              <SelectItem key={op} value={op} className='text-xs'>
                {OPERATOR_LABELS[op] ?? op}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* ── Value input ───────────────────────────────────────────────── */}
      {feature && condition.operator !== 'exists' && (
        <>
          {feature.feature_type === 'boolean' && (
            <Select value={condition.value} onValueChange={(v) => onChange({ value: v })}>
              <SelectTrigger className='w-28 h-8 text-xs' size='sm'>
                <SelectValue placeholder='Value…' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='Yes' className='text-xs'>
                  Yes / True
                </SelectItem>
                <SelectItem value='No' className='text-xs'>
                  No / False
                </SelectItem>
              </SelectContent>
            </Select>
          )}

          {feature.feature_type === 'enum' && (
            <Select value={condition.value} onValueChange={(v) => onChange({ value: v })}>
              <SelectTrigger className='w-36 h-8 text-xs' size='sm'>
                <SelectValue placeholder='Value…' />
              </SelectTrigger>
              <SelectContent>
                {feature.feature_enum_options.map((opt) => (
                  <SelectItem key={opt} value={opt} className='text-xs'>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {feature.feature_type !== 'boolean' && feature.feature_type !== 'enum' && (
            <Input
              className='w-28 h-8 text-xs'
              type={feature.feature_type === 'number' || isParent ? 'number' : 'text'}
              min={isParent ? 0 : undefined}
              value={condition.value}
              onChange={(e) => onChange({ value: e.target.value })}
              placeholder={isParent ? '0' : 'Value…'}
            />
          )}
        </>
      )}

      {/* ── Remove button ─────────────────────────────────────────────── */}
      <Button
        type='button'
        variant='ghost'
        size='icon'
        onClick={onRemove}
        className='h-7 w-7 ml-auto shrink-0 text-muted-foreground hover:text-destructive'
        title='Remove condition'
      >
        <X className='size-3.5' />
      </Button>
    </div>
  )
}

// ─── Main builder ─────────────────────────────────────────────────────────────

interface InclusionCriteriaBuilderProps {
  formula: RuleNode
  onChange: (f: RuleNode) => void
  /** All features for the project; the builder filters internally to selected ones */
  availableFeatures: Feature[]
}

export default function InclusionCriteriaBuilder({
  formula,
  onChange,
  availableFeatures,
}: InclusionCriteriaBuilderProps) {
  // Only show features assigned to this project
  const projectFeatures = availableFeatures.filter((f) => f.selected)

  // Internal state — initialized once from the formula prop, then self-managed
  const [logic, setLogic] = useState<'AND' | 'OR'>(
    () => formulaToState(formula, projectFeatures).logic,
  )
  const [conditions, setConditions] = useState<ConditionRow[]>(
    () => formulaToState(formula, projectFeatures).conditions,
  )

  // Rebuild and emit the formula whenever conditions or logic change
  useEffect(() => {
    const rules = conditions
      .map((c) => buildRule(c, projectFeatures))
      .filter((r): r is RuleNode => r !== null)

    onChange({ type: 'logic', logic, rules })
  }, [conditions, logic])

  const addCondition = () =>
    setConditions((prev) => [
      ...prev,
      { id: uid(), featureId: '', operator: 'eq', value: '', arrayOperator: 'any' },
    ])

  const removeCondition = (id: string) => setConditions((prev) => prev.filter((c) => c.id !== id))

  const updateCondition = (id: string, patch: Partial<ConditionRow>) =>
    setConditions((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))

  return (
    <div className='space-y-3'>
      {/* AND / OR header — only when 2+ conditions */}
      {conditions.length > 1 && (
        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
          <span>Match</span>
          <div className='inline-flex rounded-md border overflow-hidden text-xs font-semibold'>
            {(['AND', 'OR'] as const).map((op) => (
              <button
                key={op}
                type='button'
                onClick={() => setLogic(op)}
                className={`px-3 py-1.5 transition-colors focus:outline-none ${
                  logic === op
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                {op}
              </button>
            ))}
          </div>
          <span>of the following conditions:</span>
        </div>
      )}

      {/* Empty state */}
      {conditions.length === 0 && (
        <p className='text-sm text-muted-foreground italic py-2'>
          No conditions yet — click &ldquo;Add Condition&rdquo; to get started.
        </p>
      )}

      {/* Condition rows */}
      <div className='space-y-2'>
        {conditions.map((cond, index) => (
          <ConditionRowEditor
            key={cond.id}
            condition={cond}
            onChange={(patch) => updateCondition(cond.id, patch)}
            onRemove={() => removeCondition(cond.id)}
            projectFeatures={projectFeatures}
            logicLabel={index > 0 ? logic : undefined}
          />
        ))}
      </div>

      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={addCondition}
        className='gap-1.5 text-xs'
      >
        <Plus className='size-3' />
        Add Condition
      </Button>
    </div>
  )
}
