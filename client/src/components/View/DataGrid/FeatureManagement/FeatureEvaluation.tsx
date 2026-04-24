import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Plus,
  RefreshCw,
  Upload,
  FileText,
  Check,
  ChevronDown,
  Trophy,
  Activity,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Feature } from '../feature.types'
import { generateTrail } from './featureUtils'
import api from '@/service/api'
import { toast } from 'sonner'
import { AgGridReact } from 'ag-grid-react'
import { AllCommunityModule, ModuleRegistry, provideGlobalGridOptions } from 'ag-grid-community'
import { flattenObject } from '../../TableView/hooks/data-handler'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-balham.css'

ModuleRegistry.registerModules([AllCommunityModule])
provideGlobalGridOptions({ theme: 'legacy' })

interface Paper {
  id: string
  title: string
  file_hash?: string
}

interface FeatureEvaluationProps {
  feature: {
    id?: string
    name: string
    identifier: string
    prompt: string
    type: string
    description: string
    enum_options?: string[] | null
  }
  availableFeatures: Feature[]
}

interface EvaluationResult {
  id: string
  paper: string
  [key: string]: string | number | undefined
}

export const FeatureEvaluation: React.FC<FeatureEvaluationProps> = ({
  feature,
  availableFeatures,
}) => {
  const [papers, setPapers] = useState<Paper[]>([])
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null)
  const [featureStack, setFeatureStack] = useState<Feature[]>([])
  const [results, setResults] = useState<EvaluationResult[]>([])
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [accuracyScores, setAccuracyScores] = useState<Record<string, number>>({})
  const [comparisonSearchOpen, setComparisonSearchOpen] = useState(false)

  // Fetch papers on mount
  useEffect(() => {
    const fetchPapers = async () => {
      try {
        const response = await api.get('/user/papers?page=1&page_size=50')
        if (response.data && response.data.papers) {
          setPapers(
            response.data.papers.map(
              (paper: { id: string; title: string; file_hash: string; updated_at: string }) => ({
                id: paper.id,
                title: paper.title,
                file_hash: paper.file_hash,
                uploaded_at: paper.updated_at,
              }),
            ),
          )
        }
      } catch (error) {
        console.error('Failed to fetch papers:', error)
      }
    }
    fetchPapers()
  }, [])

  const handlePaperUpload = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/pdf'
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement
      const file = target.files?.[0]
      if (!file) return

      const formData = new FormData()
      formData.append('files[]', file)
      formData.append('strategy_type', 'json_schema')

      try {
        const tId = toast.loading('Uploading and processing paper...')
        const response = await api.post('/add_paper', formData)
        if (response.status === 200) {
          toast.dismiss(tId)
          toast.success('Paper uploaded!')
          // Fetch papers again to get the new one
          const papersResp = await api.get('/papers')
          setPapers(papersResp.data)
          // Optionally select the last paper
          if (papersResp.data.length > 0) {
            setSelectedPaper(papersResp.data[papersResp.data.length - 1])
          }
        }
      } catch {
        toast.error('Failed to upload paper')
      }
    }
    input.click()
  }

  const handleRunEvaluation = async () => {
    if (!selectedPaper) {
      toast.error('Please select a paper first')
      return
    }

    setIsEvaluating(true)
    const tId = toast.loading('Running extraction...')

    try {
      /**
       * EXPECTED API RESPONSE (multi-dimensional):
       * { results: [{ _paper_id: "...", paper: [{title}],
       *   feature: [{nested}, {data}] }] }
       * Arrays → multiple rows, nested keys → prefixed
       */
      const payload = {
        paper_id: selectedPaper.id,
        features: [feature, ...featureStack],
      }
      console.log('Sending tuning request:', payload)

      // Simulate API delay and result
      await new Promise((resolve) => setTimeout(resolve, 2000))

      //  Mock nested response (like user's JSON: paper[{title}], dataset[{...}])
      // Use the actual identifier from the feature being defined
      const rootIdent = feature.identifier || 'new_feature'
      const mockResults = [
        {
          _paper_id: selectedPaper.id,
          paper: selectedPaper.title,
          [rootIdent]: 'Extracted Value A',
          ...featureStack.reduce(
            (acc, f, idx) => ({
              ...acc,
              [f.feature_identifier]:
                idx % 2 === 0 ? `Comparison for ${f.feature_name}` : 'Another Value',
            }),
            {},
          ),
        },
        {
          _paper_id: selectedPaper.id,
          paper: selectedPaper.title,
          [rootIdent]: 'Extracted Value B',
          ...featureStack.reduce(
            (acc, f, idx) => ({
              ...acc,
              [f.feature_identifier]:
                idx % 2 === 0 ? `Comparison for ${f.feature_name}` : 'Another Value',
            }),
            {},
          ),
        },
        {
          _paper_id: selectedPaper.id,
          paper: selectedPaper.title,
          [rootIdent]: 'Extracted Value C',
          ...featureStack.reduce(
            (acc, f, idx) => ({
              ...acc,
              [f.feature_identifier]:
                idx % 2 === 0 ? `Comparison for ${f.feature_name}` : 'Another Value',
            }),
            {},
          ),
        },
      ]

      // We don't need to flatten if we already have an array of rows, 
      // but we keep it for consistency if featureStack has nested stuff
      const flattenedResults = flattenObject(mockResults, [])
      setResults(flattenedResults as EvaluationResult[])
      toast.success('Extraction complete!', { id: tId })
    } catch (error) {
      console.error(error)
      toast.error('Extraction failed', { id: tId })
    } finally {
      setIsEvaluating(false)
    }
  }

  const toggleFeatureInStack = (f: Feature) => {
    setFeatureStack((prev) =>
      prev.find((item) => item.id === f.id)
        ? prev.filter((item) => item.id !== f.id)
        : [...prev, f],
    )
  }

  const onCellValueChanged = useCallback((params: any) => {
    const { colId, newValue, data } = params
    if (colId?.endsWith('_truth')) {
      const field = colId.replace('_truth', '')
      const actualValue = String(data[field] || '')
        .toLowerCase()
        .trim()
      const truthValue = String(newValue || '')
        .toLowerCase()
        .trim()

      if (truthValue === '') {
        setAccuracyScores((prev) => {
          const next = { ...prev }
          delete next[field]
          return next
        })
        return
      }

      const isCorrect = actualValue === truthValue
      setAccuracyScores((prev) => ({
        ...prev,
        [field]: isCorrect ? 1 : 0,
      }))
    }
  }, [])

  const colDefs = useMemo(() => {
    if (results.length === 0) return []
    const baseKeys = Object.keys(results[0]).filter((k) => k !== 'paper' && !k.endsWith('_truth'))

    const paperCol: any = {
      field: 'paper',
      headerName: 'Paper',
      pinned: 'left',
      width: 150,
    }

    const featureCols = baseKeys.flatMap((k) => {
      const cols: any[] = [
        {
          field: k,
          headerName: k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, ' '),
          flex: 1,
          cellClass: (params: any) => {
            const score = accuracyScores[k]
            if (score === 1) return 'bg-green-100/50'
            const rowData = params.data as EvaluationResult
            if (score === 0 && rowData[k + '_truth']) return 'bg-red-100/50'
            return ''
          },
          cellRenderer: k === feature.identifier ? (params: any) => {
            return (
              <div className="flex items-center justify-between w-full h-full group">
                <span className="truncate">{params.value}</span>
                <button
                  onClick={() => params.node.setDataValue(`${k}_truth`, params.value)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-primary/10 rounded transition-opacity"
                  title="Copy to Ground Truth"
                >
                  <Check className="w-4 h-4 text-primary" />
                </button>
              </div>
            )
          } : undefined
        },
      ]

      // Add corresponding truth column only for the current feature being defined
      if (k === feature.identifier) {
        cols.push({
          field: k + '_truth',
          headerName: 'Ground Truth (' + k + ')',
          flex: 1,
          editable: true,
          cellStyle: { backgroundColor: 'rgba(59, 130, 246, 0.05)' },
        })
      }

      return cols
    })

    return [paperCol, ...featureCols]
  }, [results, accuracyScores])

  return (
    <div className='h-full bg-muted/30 overflow-hidden flex flex-col min-w-0'>
      <div className='p-4 border-b bg-background/50 flex items-center justify-between shrink-0'>
        <div>
          <h4 className='font-semibold text-lg'>Tuning & Evaluation</h4>
          <p className='text-xs text-muted-foreground'>
            Test your feature against real papers and compare with others.
          </p>
        </div>
        <div className='flex gap-2'>
          <Button size='sm' variant='outline' className='gap-2' onClick={handlePaperUpload}>
            <Upload className='w-4 h-4' />
            Upload PDF
          </Button>
          <Button
            size='sm'
            className='gap-2'
            disabled={
              isEvaluating ||
              !selectedPaper ||
              !feature.name.trim() ||
              (feature.type !== 'parent' && !feature.prompt.trim())
            }
            onClick={handleRunEvaluation}
          >
            <RefreshCw className={`w-4 h-4 ${isEvaluating ? 'animate-spin' : ''}`} />
            Run / Refresh
          </Button>
        </div>
      </div>

      <div className='flex-1 flex flex-col min-h-0'>
        {/* Selection Context Bar */}
        <div className='p-2 bg-background border-b flex items-center gap-4 text-sm shrink-0 overflow-x-auto whitespace-nowrap'>
          <div className='flex items-center gap-2'>
            <span className='text-muted-foreground font-medium'>Test Paper:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' size='sm' className='h-8 gap-2 font-normal border'>
                  <FileText className='w-4 h-4 text-primary' />
                  <span className='max-w-[150px] truncate'>
                    {selectedPaper ? selectedPaper.title : 'Select Paper...'}
                  </span>
                  <ChevronDown className='w-4 h-4 opacity-50' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align='start'
                className='w-[300px] max-h-[400px] overflow-y-auto'
              >
                <DropdownMenuLabel>Choose a paper for evaluation</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {papers.map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    onClick={() => setSelectedPaper(p)}
                    className='flex items-center justify-between'
                  >
                    <span className='truncate'>{p.title}</span>
                    {selectedPaper?.id === p.id && <Check className='w-4 h-4 text-primary' />}
                  </DropdownMenuItem>
                ))}
                {papers.length === 0 && (
                  <div className='p-2 text-xs text-center text-muted-foreground'>
                    No papers found
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className='h-4 w-[1px] bg-border mx-1' />

          <div className='flex items-center gap-2'>
            <span className='text-muted-foreground font-medium'>Existing feature to include:</span>
            <div className='flex items-center gap-1.5'>
              {featureStack.map((f) => (
                <Badge key={f.id} variant='secondary' className='pl-2 pr-1 h-7 gap-1 group'>
                  <span className='truncate max-w-[100px]'>{f.feature_name}</span>
                  {f.version && <span className='text-[10px] opacity-60'>({f.version})</span>}
                  <button
                    onClick={() => toggleFeatureInStack(f)}
                    className='p-0.5 hover:bg-muted rounded-full opacity-50 group-hover:opacity-100'
                  >
                    <Plus className='w-3 h-3 rotate-45' />
                  </button>
                </Badge>
              ))}
              <Popover open={comparisonSearchOpen} onOpenChange={setComparisonSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-7 w-7 p-0 rounded-full border border-dashed'
                  >
                    <Plus className='w-4 h-4' />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-[300px] p-0' align='start'>
                  <Command>
                    <CommandInput placeholder='Search features...' />
                    <CommandList>
                      <CommandEmpty>No features found.</CommandEmpty>
                      <CommandGroup heading='Add feature for comparison'>
                        {availableFeatures
                          .filter(
                            (f: Feature) =>
                              !featureStack.find((s: Feature) => s.id === f.id) &&
                              f.id !== feature.id,
                          )
                          .map((f: Feature) => (
                            <CommandItem
                              key={f.id}
                              value={`${f.feature_name} ${f.feature_identifier} ${f.feature_description}`}
                              onSelect={() => {
                                toggleFeatureInStack(f)
                                setComparisonSearchOpen(false)
                              }}
                              className='flex flex-col items-start gap-1 py-2 cursor-pointer'
                            >
                              <div className='flex items-center gap-2 w-full'>
                                <span className='font-medium truncate flex-1'>{f.feature_name}</span>
                                {f.version && (
                                  <Badge variant='secondary' className='text-[10px] h-4 px-1'>
                                    {f.version}
                                  </Badge>
                                )}
                              </div>
                              <div className='text-[10px] text-muted-foreground font-mono opacity-70'>
                                {generateTrail(f.feature_identifier)}
                              </div>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Results Grid */}
        <div className='flex-1 relative'>
          {results.length > 0 ? (
            <div className='ag-theme-balham h-full w-full'>
              <AgGridReact
                rowData={results}
                columnDefs={colDefs}
                defaultColDef={{
                  resizable: true,
                  sortable: true,
                  filter: true,
                  minWidth: 100,
                }}
                onCellValueChanged={onCellValueChanged}
              />
            </div>
          ) : (
            <div className='absolute inset-0 flex flex-col items-center justify-center text-center p-12 text-muted-foreground'>
              <Activity className='w-16 h-16 mb-4 opacity-10' />
              <h5 className='text-lg font-medium text-foreground mb-1'>No evaluation data yet</h5>
              <p className='max-w-xs mb-6'>
                {selectedPaper
                  ? "Click 'Run / Refresh' to extract information from the selected paper."
                  : 'Start by selecting a paper to evaluate your feature prompt.'}
              </p>
              {!selectedPaper && (
                <Button onClick={handlePaperUpload} variant='outline' className='gap-2'>
                  <Upload className='w-4 h-4' />
                  Upload First PDF
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Accuracy Dashboard (Footer) */}
        {results.length > 0 && (
          <div className='p-3 border-t bg-background flex items-center justify-between shrink-0'>
            <div className='flex items-center gap-6'>
              <div className='flex items-center gap-2'>
                <Trophy className='w-4 h-4 text-yellow-500' />
                <span className='text-sm font-medium'>Accuracy Score:</span>
                <Badge variant='outline' className='bg-green-50 text-green-700 border-green-200'>
                  {Object.keys(accuracyScores).length > 0
                    ? Math.round(
                        (Object.values(accuracyScores).reduce((a, b) => a + b, 0) /
                          Object.keys(accuracyScores).length) *
                          100,
                      ) + '%'
                    : 'N/A'}
                </Badge>
              </div>
              <p className='text-[10px] text-muted-foreground max-w-[300px] leading-tight'>
                Edit cells in the grid to provide ground truth and see live accuracy updates.
              </p>
            </div>
            <div className='text-xs text-muted-foreground'>
              Evaluating <b>{featureStack.length + 1}</b> features on <b>1</b> paper
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
