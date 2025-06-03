import { useEffect, useState } from 'react'
import { flattenObject } from '../TableView/hooks/data-handler'

import { AgGridReact } from 'ag-grid-react'
import {
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  provideGlobalGridOptions,
} from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-balham.css'

ModuleRegistry.registerModules([AllCommunityModule])
provideGlobalGridOptions({ theme: 'legacy' })

import SelectFeatures from './SelectFeatures'
import { Feature, NewFeature } from './feature.types'
import api from '@/service/api'
import { toast } from 'sonner'

export type GridTableProps = {
  data: Record<string, unknown>[]
  availableFeatures: Feature[]
  accuracyScores: Record<string, number> | null
  setAvailableFeatures: React.Dispatch<React.SetStateAction<Feature[]>>
  updateProjectFeatures: () => void
  projectId: string
}

const GridTable = ({
  data,
  availableFeatures,
  accuracyScores,
  setAvailableFeatures,
  updateProjectFeatures,
  projectId,
}: GridTableProps) => {
  const [rowData, setRowData] = useState<Record<string, unknown>[]>(flattenObject(data))

  const [isFeatureModalOpen, setIsFeatureModalOpen] = useState(false)

  function getHeaderColorClass(score: number): string {
    if (score < 0.2) return 'bg-red-400/75'
    if (score < 0.4) return 'bg-orange-400/75'
    if (score < 0.6) return 'bg-yellow-400/75'
    if (score < 0.8) return 'bg-green-300/75'
    return 'bg-green-600/75'
  }

  // Enhanced addNewFeature function that handles API calls
  const handleAddNewFeature = async (newFeatureData: NewFeature) => {
    try {
      // First, create the feature via API
      const response = await api.post('/features', {
        feature_name: newFeatureData.feature_name,
        feature_description: newFeatureData.feature_description,
        feature_identifier: newFeatureData.feature_identifier,
        gpt_interface: newFeatureData.gpt_interface,
        feature_type: newFeatureData.feature_type,
        feature_parent: newFeatureData.feature_parent.replace('.parent', ''),
      })

      console.log('Feature created:', response.status, response.data)

      if (response.status !== 201) {
        throw new Error('Failed to create feature')
      }

      // Create the new feature object for local state
      const newFeature: Feature = {
        id: response.data.feature.id,
        feature_identifier: response.data.feature.feature_identifier,
        feature_identifier_spaced: response.data.feature.feature_identifier.replace(/\./g, ' '),
        feature_name: response.data.feature.feature_name,
        feature_description: response.data.feature.feature_description,
        selected: true, // Automatically select the new feature
        trail: newFeatureData.feature_parent
          ? `${newFeatureData.feature_parent} → ${newFeatureData.feature_name}`
          : newFeatureData.feature_name,
        ...(newFeatureData.gpt_interface.enum && {
          enum_options: newFeatureData.gpt_interface.enum,
        }),
      }

      // Update local state
      setAvailableFeatures((prevFeatures) => [...prevFeatures, newFeature])

      // Optionally, immediately add to project
      await addFeatureToProject(response.data.feature.id)
    } catch (error) {
      console.error('Error creating feature:', error)
      throw error
    }
  }

  // Function to add feature to project
  const addFeatureToProject = async (featureId: string) => {
    const selectedFeatures = availableFeatures.filter((feature) => feature.selected)

    await api
      .post(`/projects/${projectId}/features`, {
        project_id: projectId,
        feature_ids: [...selectedFeatures.map((feature) => feature.id), featureId],
      })
      .then((response) => {
        if (response.status === 201) {
          toast.success('New features added to project successfully')
        } else {
          toast.error('Error adding new feature')
        }
      })
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
          headerTooltip: descriptionDict[key] ?? key,
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
          isFeatureModalOpen={isFeatureModalOpen}
          setIsFeatureModalOpen={setIsFeatureModalOpen}
          updateProjectFeatures={updateProjectFeatures}
          addNewFeature={handleAddNewFeature}
        />
      )}
      <main className='h-screen w-screen flex'>
        <div className='ag-theme-balham flex-1'>
          <AgGridReact
            rowData={rowData}
            columnDefs={colDefs}
            suppressDragLeaveHidesColumns={true}
            suppressGroupChangesColumnVisibility='suppressHideOnGroup'
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
      <button
        className='px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90'
        onClick={() => setIsFeatureModalOpen(true)}
      >
        +
      </button>
    </div>
  )
}
