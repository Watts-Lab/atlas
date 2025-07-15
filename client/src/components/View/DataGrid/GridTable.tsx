import { useEffect, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import {
  ColDef,
  AllCommunityModule,
  ModuleRegistry,
  provideGlobalGridOptions,
  ICellRendererParams,
} from 'ag-grid-community'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-balham.css'

import { flattenObject } from '../TableView/hooks/data-handler'
import { Feature } from './feature.types'
import { Trash2, TrashIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

ModuleRegistry.registerModules([AllCommunityModule])
provideGlobalGridOptions({ theme: 'legacy' })

export interface GridTableProps {
  data: Record<string, unknown>[]
  availableFeatures: Feature[]
  accuracyScores: Record<string, number> | null
  onDeletePapers: (ids: string[]) => Promise<void>
}

function findArrayKeys(
  obj: Record<string, unknown>[] | Record<string, unknown>,
  prefix = '',
): string[] {
  const out = new Set<string>()
  if (Array.isArray(obj)) {
    obj.forEach((o) => findArrayKeys(o, prefix).forEach((k) => out.add(k)))
    return [...out]
  }
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k
    if (Array.isArray(v)) {
      out.add(full)
      if (v[0] && typeof v[0] === 'object') findArrayKeys(v[0], full).forEach((kk) => out.add(kk))
    } else if (v && typeof v === 'object') {
      findArrayKeys(v as Record<string, unknown>, full).forEach((kk) => out.add(kk))
    }
  }
  return [...out]
}

const TrashRenderer = (props: ICellRendererParams) => {
  const { id } = props.data
  const { deletePaper } = props.context

  return (
    <button
      title='Delete this paper'
      onClick={() => deletePaper(id)}
      className='p-1 text-red-600 hover:text-red-800 flex items-center justify-center w-full h-full'
    >
      <Trash2 size={16} />
    </button>
  )
}

const GridTable = ({ data, availableFeatures, accuracyScores, onDeletePapers }: GridTableProps) => {
  const [expanded, setExpanded] = useState<string[]>([])
  const [available, setAvailable] = useState<string[]>([])
  const [rowData, setRowData] = useState<Record<string, unknown>[]>([])
  const [colDefs, setColDefs] = useState<ColDef[]>()
  const [deleted, setDeleted] = useState<Set<string>>(new Set())
  const [init, setInit] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const deletePaper = (id: string) => setDeleted((prev) => new Set(prev).add(String(id)))

  const handleDeleteForever = async () => {
    if (deleted.size === 0) return

    setIsDeleting(true)
    try {
      await onDeletePapers(Array.from(deleted))
      setDeleted(new Set())
    } catch (error) {
      console.error('Error deleting papers:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const hdrCls = (s: number) =>
    s < 0.2
      ? 'bg-red-400/75'
      : s < 0.4
        ? 'bg-orange-400/75'
        : s < 0.6
          ? 'bg-yellow-400/75'
          : s < 0.8
            ? 'bg-green-300/75'
            : 'bg-green-600/75'

  useEffect(() => {
    if (!data.length) return
    const arrs = findArrayKeys(data)
    setAvailable(arrs)
    if (!init) {
      setExpanded(arrs) // start fully collapsed
      setInit(true)
    }
  }, [data, init])

  useEffect(() => {
    let rows = flattenObject(data, expanded)
    rows = rows.filter((r) => !deleted.has(String(r.id)))

    setRowData(rows)
    if (!rows.length) return

    const keys = [...new Set(rows.flatMap(Object.keys))]

    const tip: { [key: string]: string } = availableFeatures
      .filter((f) => f.selected)
      .reduce((a, f) => ({ ...a, [f.feature_identifier_spaced]: f.feature_description }), {})

    const dataCols: ColDef[] = keys.map((k) => {
      if (k === 'task_id' || k === 'status') return { field: k, hide: true }

      const score = accuracyScores?.[k]
      const base: ColDef = { field: k, headerTooltip: tip[k] ?? k }
      return score === undefined
        ? base
        : { ...base, cellClass: hdrCls(score), headerClass: hdrCls(score) }
    })

    const deleteCol: ColDef = {
      headerName: '',
      colId: 'delete',
      pinned: 'left',
      width: 60,
      suppressHeaderMenuButton: true,
      suppressMovable: true,
      sortable: false,
      filter: false,
      cellRenderer: TrashRenderer,
      field: 'id',
      spanRows: ({ valueA, valueB }) => valueA === valueB,
    }

    setColDefs([deleteCol, ...dataCols])
  }, [data, expanded, availableFeatures, accuracyScores, deleted])

  const toggle = (p: string) =>
    setExpanded((e) => (e.includes(p) ? e.filter((k) => k !== p) : [...e, p]))

  const nice = (p: string) =>
    p
      .split('.')
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(' → ')

  return (
    <main className='h-screen w-screen flex flex-col'>
      {deleted.size > 0 && (
        <div className='fixed bottom-4 left-4 z-10'>
          <Button
            onClick={handleDeleteForever}
            disabled={isDeleting}
            className='bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-md flex items-center gap-2 shadow-lg transition-colors'
          >
            <TrashIcon size={16} />
            {isDeleting ? 'Deleting...' : `Delete ${deleted.size} Forever`}
          </Button>
        </div>
      )}

      {available.length > 0 && (
        <div className='p-4 bg-gray-50 border-b border-gray-200'>
          <div className='flex items-center  mb-2'>
            <h3 className='text-sm font-medium'>Array feature visibility</h3>
            <div className='text-xs text-gray-500 ml-4'>
              💡 Click to expand arrays and show all items, or keep collapsed to show summary counts
            </div>
          </div>
          <div className='flex flex-wrap gap-2'>
            {available.map((k) => (
              <button
                key={k}
                onClick={() => toggle(k)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  expanded.includes(k)
                    ? 'bg-orange-100 text-orange-800 border border-orange-300'
                    : 'bg-green-100  text-green-800  border border-green-300 hover:bg-green-200'
                }`}
              >
                {expanded.includes(k) ? '📁' : '📂'} {nice(k)}
                <span className='ml-1 text-xs'>
                  ({expanded.includes(k) ? 'collapsed' : 'expanded'})
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className='ag-theme-balham flex-1'>
        <AgGridReact
          rowData={rowData}
          columnDefs={colDefs}
          context={{ deletePaper }}
          enableCellSpan={true}
          suppressDragLeaveHidesColumns
          suppressGroupChangesColumnVisibility='suppressHideOnGroup'
          tooltipShowDelay={100}
        />
      </div>
    </main>
  )
}

export default GridTable
