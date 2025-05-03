import { useEffect, useRef, useState } from 'react'
import { ColDef } from 'ag-grid-community'
import { flattenObject } from '../TableView/hooks/data-handler'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-balham.css'

import { AgGridReact } from 'ag-grid-react'

import SelectFeatures from './SelectFeatures'
import { Feature, NewFeature } from './feature.types'

export type GridTableProps = {
  data: Record<string, unknown>[]
  availableFeatures: Feature[]
  accuracyScores: Record<string, number> | null
  setAvailableFeatures: React.Dispatch<React.SetStateAction<Feature[]>>
  addNewFeature: (newFeatureData: NewFeature) => void
  updateProjectFeatures: () => void
}

const GridTable = ({
  data,
  availableFeatures,
  accuracyScores,
  setAvailableFeatures,
  updateProjectFeatures,
}: GridTableProps) => {
  const [rowData, setRowData] = useState<Record<string, unknown>[]>(flattenObject(data))

  const [isFeatureModalOpen, setIsFeatureModalOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(document.createElement('dialog'))
  useEffect(() => {
    if (dialogRef.current?.open && !isFeatureModalOpen) {
      dialogRef.current?.close()
    } else if (!dialogRef.current?.open && isFeatureModalOpen) {
      dialogRef.current?.showModal()
    }
  }, [isFeatureModalOpen])

  function getHeaderColorClass(score: number): string {
    if (score < 0.2) return 'bg-red-400/75'
    if (score < 0.4) return 'bg-orange-400/75'
    if (score < 0.6) return 'bg-yellow-400/75'
    if (score < 0.8) return 'bg-green-300/75'
    return 'bg-green-600/75'
  }

  useEffect(() => {
    const row = flattenObject(data)
    setRowData(row)
    if (!row.length) {
      return
    }

    const allKeys = new Set<string>()
    row.forEach((obj) => {
      Object.keys(obj).forEach((key) => allKeys.add(key))
    })
    const allKeysArray = Array.from(allKeys)

    const descriptionDict = availableFeatures
      .filter((f) => f.selected)
      .reduce(
        (acc: Record<string, string>, f) => {
          acc[f.feature_identifier_spaced] = f.feature_description
          return acc
        },
        {} as Record<string, string>,
      )

    const newColDefs: ColDef[] = allKeysArray.map((key) => {
      if (key !== 'task_id' && key !== 'status') {
        // colorize the column based on score
        const value = accuracyScores ? accuracyScores[key] : undefined
        if (!value) {
          return {
            field: key,
            hide: false,
            headerTooltip: descriptionDict[key] ?? key,
          }
        }

        const score = Math.max(0, Math.min(1, value))

        return {
          field: key,
          cellClass: getHeaderColorClass(score),
          headerClass: getHeaderColorClass(score),
          hide: false,
        } as ColDef
      } else {
        return { field: key, hide: true }
      }
    })

    newColDefs.push({
      headerName: '',
      field: 'add',
      headerComponent: CustomHeader,
      headerComponentParams: {
        setIsFeatureModalOpen: setIsFeatureModalOpen,
      },
      pinned: 'right',
      width: 50,
      suppressHeaderMenuButton: true,
      sortable: false,
      filter: false,
    })

    setColDefs(newColDefs)
  }, [data, accuracyScores, availableFeatures])

  const [colDefs, setColDefs] = useState<ColDef[]>()

  return (
    <>
      {isFeatureModalOpen && (
        <SelectFeatures
          availableFeatures={availableFeatures}
          setAvailableFeatures={setAvailableFeatures}
          dialogRef={dialogRef}
          setIsFeatureModalOpen={setIsFeatureModalOpen}
          updateProjectFeatures={updateProjectFeatures}
        />
      )}
      <main className='h-screen w-screen flex'>
        <div className='ag-theme-balham flex-1'>
          <AgGridReact
            rowData={rowData}
            columnDefs={colDefs}
            suppressDragLeaveHidesColumns={true}
            suppressMakeColumnVisibleAfterUnGroup={true}
            suppressRowGroupHidesColumns={true}
            tooltipShowDelay={100}
          />
        </div>
      </main>
    </>
  )
}

export default GridTable

const CustomHeader = ({
  setIsFeatureModalOpen,
}: {
  setIsFeatureModalOpen: React.Dispatch<React.SetStateAction<boolean>>
}) => {
  return (
    <div className='custom-header'>
      <button className='btn btn-xs' onClick={() => setIsFeatureModalOpen(true)}>
        +
      </button>
    </div>
  )
}
