import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ChevronLeft, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Feature } from './feature.types'
import type { InclusionCriteria, RuleNode, LogicNode } from './inclusionCriteria.types'
import {
  fetchCriteria,
  createCriteria,
  updateCriteria,
  deleteCriteria,
} from './inclusionCriteria.service'
import InclusionCriteriaBuilder from './InclusionCriteriaBuilder'

// ─── Formula summary ──────────────────────────────────────────────────────────

function summarizeFormula(node: RuleNode, depth = 0): string {
  if (depth > 2) return '…'

  if (node.type === 'field') {
    const val = node.value !== undefined ? ` "${node.value}"` : ''
    return `${node.field} ${node.operator}${val}`
  }

  if (node.type === 'array') {
    if (node.operator.startsWith('count_')) {
      return `${node.field} ${node.operator} ${node.value ?? 0}`
    }
    const sub = node.rule ? ` { ${summarizeFormula(node.rule, depth + 1)} }` : ''
    return `${node.field} [${node.operator}]${sub}`
  }

  // logic node
  const parts = node.rules.slice(0, 2).map((r) => summarizeFormula(r, depth + 1))
  if (node.rules.length > 2) parts.push(`+${node.rules.length - 2} more`)
  if (parts.length === 0) return `${node.logic} (empty)`
  return `${node.logic}: ${parts.join(', ')}`
}

// ─── Default formula ──────────────────────────────────────────────────────────

function makeDefaultFormula(): LogicNode {
  return { type: 'logic', logic: 'AND', rules: [] }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PanelView = 'list' | 'create' | 'edit'

interface InclusionCriteriaPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  criteria: InclusionCriteria[]
  availableFeatures: Feature[]
  onCriteriaChange: (criteria: InclusionCriteria[]) => void
}

// ─── InclusionCriteriaPanel ───────────────────────────────────────────────────

export default function InclusionCriteriaPanel({
  open,
  onOpenChange,
  projectId,
  criteria,
  availableFeatures,
  onCriteriaChange,
}: InclusionCriteriaPanelProps) {
  // ── View state ──────────────────────────────────────────────────────────────
  const [view, setView] = useState<PanelView>('list')
  const [editingCriterion, setEditingCriterion] = useState<InclusionCriteria | null>(null)

  // ── Draft form state ────────────────────────────────────────────────────────
  const [draftName, setDraftName] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [draftFormula, setDraftFormula] = useState<RuleNode>(makeDefaultFormula)

  // ── Async state ─────────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // ── Stable ref to avoid stale closures in effects ──────────────────────────
  const onCriteriaChangeRef = useRef(onCriteriaChange)
  useEffect(() => {
    onCriteriaChangeRef.current = onCriteriaChange
  })

  // ── Fetch criteria whenever the dialog opens ────────────────────────────────
  useEffect(() => {
    if (!open) return

    let cancelled = false
    setIsLoading(true)

    fetchCriteria(projectId)
      .then((data) => {
        if (!cancelled) onCriteriaChangeRef.current(data)
      })
      .catch(() => {
        // Silently fall back to the prop data already in state.
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, projectId])

  // ── Reset view to list when dialog closes ───────────────────────────────────
  useEffect(() => {
    if (!open) {
      setView('list')
      setEditingCriterion(null)
      setDeleteConfirmId(null)
    }
  }, [open])

  // ─── Navigation helpers ───────────────────────────────────────────────────

  const openCreate = () => {
    setEditingCriterion(null)
    setDraftName('')
    setDraftDescription('')
    setDraftFormula(makeDefaultFormula())
    setDeleteConfirmId(null)
    setView('create')
  }

  const openEdit = (criterion: InclusionCriteria) => {
    setEditingCriterion(criterion)
    setDraftName(criterion.name)
    setDraftDescription(criterion.description)
    setDraftFormula(criterion.formula)
    setDeleteConfirmId(null)
    setView('edit')
  }

  const backToList = () => {
    setView('list')
    setEditingCriterion(null)
  }

  // ─── Save (create or update) ──────────────────────────────────────────────

  const handleSave = async () => {
    if (!draftName.trim()) {
      toast.error('Criterion name is required')
      return
    }

    setIsSaving(true)
    try {
      if (view === 'create') {
        const created = await createCriteria(
          projectId,
          draftName.trim(),
          draftDescription.trim(),
          draftFormula,
        )
        onCriteriaChange([...criteria, created])
        toast.success('Criterion created')
      } else if (view === 'edit' && editingCriterion) {
        const updated = await updateCriteria(projectId, editingCriterion.id, {
          name: draftName.trim(),
          description: draftDescription.trim(),
          formula: draftFormula,
        })
        onCriteriaChange(criteria.map((c) => (c.id === updated.id ? updated : c)))
        toast.success('Criterion updated')
      }
      backToList()
    } catch {
      toast.error('Failed to save criterion')
    } finally {
      setIsSaving(false)
    }
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  const handleDelete = async (criterionId: string) => {
    setIsDeleting(true)
    try {
      await deleteCriteria(projectId, criterionId)
      onCriteriaChange(criteria.filter((c) => c.id !== criterionId))
      setDeleteConfirmId(null)
      toast.success('Criterion deleted')
    } catch {
      toast.error('Failed to delete criterion')
    } finally {
      setIsDeleting(false)
    }
  }

  // ─── Derived ──────────────────────────────────────────────────────────────

  const isFormView = view === 'create' || view === 'edit'
  const canSave = draftName.trim().length > 0 && !isSaving

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[720px] max-h-[88vh] flex flex-col gap-0 p-0 overflow-hidden'>
        {/* ── Header ── */}
        <DialogHeader className='shrink-0 border-b px-5 py-3'>
          <div className='flex items-center gap-2 min-w-0'>
            {isFormView && (
              <Button
                type='button'
                variant='ghost'
                size='xs'
                onClick={backToList}
                className='-ml-1 shrink-0'
                disabled={isSaving}
              >
                <ChevronLeft className='size-4' />
              </Button>
            )}

            <DialogTitle className='text-base leading-tight truncate'>
              {view === 'list'
                ? 'Inclusion Criteria'
                : view === 'create'
                  ? 'New Criterion'
                  : `Edit: ${editingCriterion?.name ?? ''}`}
            </DialogTitle>

            {view === 'list' && (
              <Button
                type='button'
                size='xs'
                className='ml-auto shrink-0'
                onClick={openCreate}
                disabled={isLoading}
              >
                <Plus className='size-3.5' />
                New Criterion
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* ── Body ── */}
        <div className='flex-1 overflow-y-auto px-5 py-4 min-h-0'>
          {/* ── List view ── */}
          {view === 'list' && (
            <>
              {isLoading ? (
                <div className='flex items-center justify-center py-12 text-muted-foreground gap-2'>
                  <Loader2 className='size-5 animate-spin' />
                  <span className='text-sm'>Loading criteria…</span>
                </div>
              ) : criteria.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-14 gap-2 text-muted-foreground'>
                  <p className='text-sm font-medium'>No inclusion criteria defined yet.</p>
                  <p className='text-xs'>Create one to start filtering results in the grid.</p>
                  <Button type='button' size='sm' className='mt-3' onClick={openCreate}>
                    <Plus className='size-3.5' />
                    New Criterion
                  </Button>
                </div>
              ) : (
                <ul className='space-y-2'>
                  {criteria.map((criterion) => (
                    <li
                      key={criterion.id}
                      className='flex items-start gap-3 rounded-lg border bg-card px-4 py-3'
                    >
                      {/* Info */}
                      <div className='flex-1 min-w-0 space-y-1'>
                        <div className='flex items-center gap-2 flex-wrap'>
                          <span className='font-medium text-sm leading-tight'>
                            {criterion.name}
                          </span>
                          {criterion.description && (
                            <span className='text-xs text-muted-foreground truncate max-w-[260px]'>
                              — {criterion.description}
                            </span>
                          )}
                        </div>
                        <Badge
                          variant='outline'
                          className='font-mono text-xs max-w-full truncate block w-fit'
                          title={summarizeFormula(criterion.formula)}
                        >
                          {summarizeFormula(criterion.formula)}
                        </Badge>
                      </div>

                      {/* Actions */}
                      <div className='flex items-center gap-1 shrink-0 pt-0.5'>
                        {deleteConfirmId === criterion.id ? (
                          <div className='flex items-center gap-1.5'>
                            <span className='text-xs text-muted-foreground'>Delete?</span>
                            <Button
                              type='button'
                              variant='destructive'
                              size='xs'
                              onClick={() => handleDelete(criterion.id)}
                              disabled={isDeleting}
                              className='h-7'
                            >
                              {isDeleting ? <Loader2 className='size-3.5 animate-spin' /> : 'Yes'}
                            </Button>
                            <Button
                              type='button'
                              variant='outline'
                              size='xs'
                              onClick={() => setDeleteConfirmId(null)}
                              disabled={isDeleting}
                              className='h-7'
                            >
                              No
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Button
                              type='button'
                              variant='ghost'
                              size='xs'
                              onClick={() => openEdit(criterion)}
                              className='h-7 w-7 p-0 text-muted-foreground hover:text-foreground'
                              title='Edit criterion'
                            >
                              <Pencil className='size-3.5' />
                            </Button>
                            <Button
                              type='button'
                              variant='ghost'
                              size='xs'
                              onClick={() => setDeleteConfirmId(criterion.id)}
                              className='h-7 w-7 p-0 text-muted-foreground hover:text-destructive'
                              title='Delete criterion'
                            >
                              <Trash2 className='size-3.5' />
                            </Button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {/* ── Create / Edit form view ── */}
          {isFormView && (
            <div className='space-y-5'>
              {/* Name */}
              <div className='space-y-1.5'>
                <label htmlFor='criterion-name' className='text-sm font-medium'>
                  Name <span className='text-destructive'>*</span>
                </label>
                <Input
                  id='criterion-name'
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder='e.g. Human participants only'
                  disabled={isSaving}
                  autoFocus
                />
              </div>

              {/* Description */}
              <div className='space-y-1.5'>
                <label htmlFor='criterion-desc' className='text-sm font-medium'>
                  Description{' '}
                  <span className='text-xs text-muted-foreground font-normal'>(optional)</span>
                </label>
                <Input
                  id='criterion-desc'
                  value={draftDescription}
                  onChange={(e) => setDraftDescription(e.target.value)}
                  placeholder='Brief explanation of what this criterion filters…'
                  disabled={isSaving}
                />
              </div>

              {/* Formula builder */}
              <div className='space-y-1.5'>
                <label className='text-sm font-medium'>Formula</label>
                <p className='text-xs text-muted-foreground'>
                  Build the inclusion rule below. A result passes when the root condition is
                  satisfied.
                </p>
                <InclusionCriteriaBuilder
                  formula={draftFormula}
                  onChange={setDraftFormula}
                  availableFeatures={availableFeatures}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Footer (form actions) ── */}
        {isFormView && (
          <div className='shrink-0 border-t px-5 py-3 flex items-center justify-end gap-2 bg-background'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={backToList}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type='button' size='sm' onClick={handleSave} disabled={!canSave}>
              {isSaving && <Loader2 className='size-4 animate-spin' />}
              {view === 'create' ? 'Create' : 'Save Changes'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
