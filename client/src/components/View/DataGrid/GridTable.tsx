import { useEffect, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import {
  ColDef,
  AllCommunityModule,
  ModuleRegistry,
  provideGlobalGridOptions,
  ICellRendererParams,
  RowClassParams,
} from 'ag-grid-community'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-balham.css'

import { flattenObject } from '../TableView/hooks/data-handler'
import { Feature } from './feature.types'
import { Trash2, TrashIcon, History, RefreshCw, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

ModuleRegistry.registerModules([AllCommunityModule])
provideGlobalGridOptions({ theme: 'legacy' })

export interface GridTableProps {
  data: Record<string, unknown>[]
  availableFeatures: Feature[]
  accuracyScores: Record<string, number> | null
  onDeletePapers: (ids: string[]) => Promise<void>
  showVersions: boolean
  onToggleVersions: () => void
  reprocessPaper: (paperId: string) => void
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

const UtilsButtons = (props: ICellRendererParams) => {
  const { _paper_id, id } = props.data
  const { reprocessPaper, deletePaper } = props.context

  return (
    <>
      <div className='flex items-center justify-center w-full h-full'>
        <div className='text-right font-medium'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' className='h-8 w-8 p-0' data-no-row-click>
                <span className='sr-only'>Open menu</span>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => reprocessPaper(_paper_id)} data-no-row-click>
                <RefreshCw /> Rerun with latest features
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => deletePaper(id)} data-no-row-click>
                <Trash2 /> Hide result
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  )
}

const GridTable = ({
  data,
  availableFeatures,
  accuracyScores,
  onDeletePapers,
  showVersions,
  onToggleVersions,
  reprocessPaper,
}: GridTableProps) => {
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

    // Group rows by paper_id to find max version per paper and actual existing versions
    const paperVersionMap = new Map<
      string,
      { maxVersion: number; versions: Set<number>; rows: unknown[] }
    >()

    rows.forEach((row) => {
      const paperId = row._paper_id as string
      const version = (row._version as number) || 1

      if (!paperId) return

      if (!paperVersionMap.has(paperId)) {
        paperVersionMap.set(paperId, {
          maxVersion: version,
          versions: new Set([version]),
          rows: [],
        })
      }

      const paperData = paperVersionMap.get(paperId)!
      paperData.maxVersion = Math.max(paperData.maxVersion, version)
      paperData.versions.add(version)
      paperData.rows.push(row)
    })

    // Apply version colors with improved logic
    rows = rows.map((row) => {
      const paperId = row._paper_id as string
      const version = (row._version as number) || 1

      if (!paperId || !showVersions) {
        return row
      }

      const paperData = paperVersionMap.get(paperId)
      if (!paperData) return row

      const sortedVersions = Array.from(paperData.versions).sort((a, b) => b - a) // Descending order
      const maxVersion = sortedVersions[0]

      let versionColor = ''

      if (version === maxVersion) {
        // Latest version - no color (white)
        versionColor = ''
      } else if (sortedVersions.length > 1 && version === sortedVersions[1]) {
        // Second highest version - specific blue
        versionColor = 'bg-blue-200'
      } else {
        // All other older versions - gradient
        const versionIndex = sortedVersions.indexOf(version)
        if (versionIndex > 1) {
          const olderCount = sortedVersions.length - 2 // Excluding latest and second latest
          const relativeIndex = versionIndex - 2 // Position among older versions
          const normalized = relativeIndex / Math.max(olderCount - 1, 1)

          if (normalized <= 0.33) versionColor = 'bg-blue-300'
          else if (normalized <= 0.66) versionColor = 'bg-blue-400'
          else versionColor = 'bg-blue-500'
        }
      }

      return {
        ...row,
        _versionColor: versionColor,
      }
    })

    setRowData(rows)
    if (!rows.length) return

    const keys = [...new Set(rows.flatMap(Object.keys))]

    // Filter out version metadata fields from column display
    const filteredKeys = keys.filter(
      (k) => !['_version', '_is_latest', '_result_id', '_paper_id', '_versionColor'].includes(k),
    )

    const tip: { [key: string]: string } = availableFeatures
      .filter((f) => f.selected)
      .reduce(
        (a, f) => ({
          ...a,
          [f.feature_identifier_spaced]: `${f.feature_identifier}: ${f.feature_description}`,
        }),
        {},
      )

    const dataCols: ColDef[] = filteredKeys.map((k) => {
      if (k === 'task_id' || k === 'status') return { field: k, hide: true }

      const score = accuracyScores?.[k]
      const base: ColDef = {
        field: k,
        headerTooltip: tip[k] ?? k,
        tooltipValueGetter: (params) => String(params.value ?? ''),
        cellClass: (params) => {
          const classes = []

          // Add accuracy score class if available
          if (score !== undefined) {
            classes.push(hdrCls(score))
          }

          // Add version color if showing versions
          if (showVersions && params.data._versionColor) {
            classes.push(params.data._versionColor)
          }

          return classes.join(' ')
        },
      }

      // Add special styling for paper column to show version info
      if (k === 'paper' && showVersions) {
        return {
          ...base,
          valueGetter: (params) => {
            const paper = params.data.paper
            const version = params.data._version || 1
            const isLatest = params.data._is_latest

            // If paper is a string, it's likely the title
            if (typeof paper === 'string') {
              return isLatest ? paper : `${paper} (v${version})`
            }

            // If paper is an object with title
            if (paper && typeof paper === 'object' && 'title' in paper) {
              return isLatest ? paper.title : `${paper.title} (v${version})`
            }

            return paper
          },
          cellClass: (params) => {
            const classes = []

            if (!params.data._is_latest) {
              classes.push('text-gray-500 italic')
            }

            if (showVersions && params.data._versionColor) {
              classes.push(params.data._versionColor)
            }

            return classes.join(' ')
          },
        }
      }

      return base
    })

    const utilsCol: ColDef = {
      headerName: '',
      colId: 'utils',
      pinned: 'right',
      width: 50,
      suppressHeaderMenuButton: true,
      suppressMovable: true,
      sortable: false,
      filter: false,
      cellRenderer: UtilsButtons,
      field: '_result_id',
      spanRows: ({ valueA, valueB }) => valueA === valueB,
    }

    // Add version column when showing versions
    if (showVersions) {
      const versionCol: ColDef = {
        headerName: 'Version',
        field: '_version',
        width: 45,
        pinned: 'right',
        valueFormatter: (params) => `v${params.value || 1}`,
        cellClass: (params) => params.data._versionColor || '',
      }
      setColDefs([...dataCols, versionCol, utilsCol])
    } else {
      setColDefs([...dataCols, utilsCol])
    }
  }, [data, expanded, availableFeatures, accuracyScores, deleted, showVersions])

  const toggle = (p: string) =>
    setExpanded((e) => (e.includes(p) ? e.filter((k) => k !== p) : [...e, p]))

  const nice = (p: string) =>
    p
      .split('.')
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(' → ')

  // Add custom CSS for row coloring
  const getRowClass = (params: RowClassParams) => {
    if (!showVersions) return ''
    return params.data._versionColor || ''
  }

  // Export current table data function
  const exportCurrentTableData = () => {
    if (!rowData.length) return

    // Get the flattened data as it appears in the table
    const exportData = rowData.map((row) => {
      // Remove internal metadata fields
      const cleanedRow = { ...row }
      delete cleanedRow._versionColor
      delete cleanedRow._result_id
      delete cleanedRow._paper_id
      return cleanedRow
    })

    // Convert to CSV
    if (exportData.length === 0) return

    const headers = Object.keys(exportData[0])
    const csvContent = [
      headers.join(','),
      ...exportData.map((row) =>
        headers
          .map((header) => {
            const value = row[header]
            // Handle values that might contain commas or quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value ?? ''
          })
          .join(','),
      ),
    ].join('\n')

    // Download the CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'table_data.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Expose the export function to parent component
  useEffect(() => {
    // Add the export function to window so it can be called from parent
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).exportCurrentTableData = exportCurrentTableData
  }, [rowData])

  return (
    <main className='h-screen w-screen flex flex-col'>
      {/* History toggle button */}
      <div className='fixed bottom-4 right-4 z-10'>
        <Button
          onClick={onToggleVersions}
          className={`${
            showVersions ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'
          } text-white px-4 py-2 rounded-md flex items-center gap-2 shadow-lg transition-colors`}
        >
          <History size={16} />
          {showVersions ? 'Hide Versions' : 'Show Versions'}
        </Button>
      </div>

      {/* Delete button - move to bottom left */}
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

      {/* Version indicator */}
      {showVersions && (
        <div className='bg-blue-50 border-b border-blue-200 px-4 py-2'>
          <div className='text-sm text-blue-700'>
            <History size={16} className='inline mr-2' />
            Showing all versions. Latest is white, second latest is light blue, older versions have
            progressively darker blue backgrounds.
          </div>
        </div>
      )}

      {/* Array visibility controls */}
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
          context={{ deletePaper, reprocessPaper }}
          getRowClass={getRowClass}
          enableCellSpan={true}
          suppressDragLeaveHidesColumns
          suppressGroupChangesColumnVisibility='suppressHideOnGroup'
          tooltipShowDelay={100}
          tooltipShowMode={'whenTruncated'}
        />
      </div>
    </main>
  )
}

export default GridTable
