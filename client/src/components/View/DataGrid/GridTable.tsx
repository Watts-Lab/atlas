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
  setAvailableFeatures: React.Dispatch<React.SetStateAction<Feature[]>>
  addNewFeature: (newFeatureData: NewFeature) => void
  updateProjectFeatures: () => void
}

const GridTable = ({
  data,
  availableFeatures,
  setAvailableFeatures,
  updateProjectFeatures,
}: GridTableProps) => {
  const [rowData, setRowData] = useState<Record<string, unknown>[]>(flattenObject(data))

  const [isFeatureModalOpen, setIsFeatureModalOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (dialogRef.current?.open && !isFeatureModalOpen) {
      dialogRef.current?.close()
    } else if (!dialogRef.current?.open && isFeatureModalOpen) {
      dialogRef.current?.showModal()
    }
  }, [isFeatureModalOpen])

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

    const newColDefs: ColDef[] = allKeysArray.map((key) => {
      if (key !== 'task_id' && key !== 'status') {
        return { field: key, hide: false }
      } else {
        return { field: key, hide: true }
      }
    })

    // Add the '+' column
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
  }, [data])

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
