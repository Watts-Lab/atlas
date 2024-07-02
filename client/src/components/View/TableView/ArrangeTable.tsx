import { useEffect, useState } from 'react'
import { Result, TableData, flattenData } from './hooks/data-handler'

type ArrageTableProps = {
  result: Result[]
}

const ArrageTable = ({ result }: ArrageTableProps) => {
  const [expandedExperiment, setExpandedExperiment] = useState<boolean>(false)
  const [expandedCondition, setExpandedCondition] = useState<boolean>(false)
  const [expandedBehavior, setExpandedBehavior] = useState<boolean>(false)

  const [rows, setRows] = useState<TableData>(
    flattenData(result, expandedExperiment, expandedCondition, expandedBehavior),
  )

  useEffect(() => {
    setRows(flattenData(result, expandedExperiment, expandedCondition, expandedBehavior))
  }, [result])

  useEffect(() => {
    setRows(flattenData(result, expandedExperiment, expandedCondition, expandedBehavior))
  }, [expandedExperiment, expandedCondition, expandedBehavior])

  const changeExpanded = (type: string) => {
    switch (type) {
      case 'experiment':
        setExpandedExperiment((prevState) => !prevState)
        break
      case 'condition':
        setExpandedCondition((prevState) => !prevState)
        break
      case 'behavior':
        setExpandedBehavior((prevState) => !prevState)
        break
      default:
        break
    }
  }

  const handleMouseEnter = (colIndex: number) => {
    const firstCell = document.querySelector(`th[data-col="${colIndex}"]`)
    const lastCell = document.querySelector(`tbody tr:last-child td[data-col="${colIndex}"]`)
    const cells = document.querySelectorAll(
      `td[data-col="${colIndex}"], th[data-col="${colIndex}"]`,
    )
    firstCell?.classList.add('hover-column-first')
    lastCell?.classList.add('hover-column-last')
    cells.forEach((cell) => cell.classList.add('hover-column'))
  }

  const handleMouseLeave = (colIndex: number) => {
    const firstCell = document.querySelector(`th[data-col="${colIndex}"]`)
    const lastCell = document.querySelector(`tbody tr:last-child td[data-col="${colIndex}"]`)
    const cells = document.querySelectorAll(
      `td[data-col="${colIndex}"], th[data-col="${colIndex}"]`,
    )
    firstCell?.classList.remove('hover-column-first')
    lastCell?.classList.remove('hover-column-last')
    cells.forEach((cell) => cell.classList.remove('hover-column'))
  }

  const handleExport = () => {
    const tableData = flattenData(result, expandedExperiment, expandedCondition, expandedBehavior)

    const escapeCsvValue = (value: string | number | null) => {
      if (typeof value === 'string') {
        // Escape double quotes by doubling them
        value = value.replace(/"/g, '""')
        // Wrap the value in double quotes if it contains a comma, newline, or double quote
        if (value.includes(',') || value.includes('\n') || value.includes('"')) {
          value = `"${value}"`
        }
      }
      if (value === null) {
        value = '--'
      }
      return value
    }

    const csvData = [
      tableData.headers.map(escapeCsvValue),
      ...tableData.rows.map((row) => Object.values(row).map(escapeCsvValue)),
    ]

    const csvContent = 'data:text/csv;charset=utf-8,' + csvData.map((e) => e.join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)

    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)

    const fileName = 'data.csv'
    link.setAttribute('download', fileName)
    link.setAttribute('target', '_blank') // Open in new tab

    document.body.appendChild(link) // Required for FF
    link.click()
    document.body.removeChild(link)
  }

  return (
    <>
      <div className='navbar bg-base-100 flex flex-col sm:flex-row'>
        <div className='navbar-start z-10 pl-5'>
          <div className='flex-none'>
            <span className='normal-case text-xl '>
              ATLAS {`  `}
              <span className='text-xs'>
                drag and drop a pdf{' '}
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  fill='none'
                  viewBox='0 0 24 24'
                  strokeWidth={1.5}
                  stroke='currentColor'
                  className='size-6 h-4 w-4 inline-block ml-1'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3V15'
                  />
                </svg>
              </span>
            </span>
          </div>
        </div>
        <div className='navbar-center text-center'>
          <div className='flex flex-row justify-center '>
            <ul className='menu menu-xs menu-horizontal bg-base-200 gap-1 rounded p-2'>
              <li>
                <a
                  onClick={() => changeExpanded('experiment')}
                  className={expandedExperiment ? 'bg-success hover:bg-green-600' : ''}
                >
                  Experiment
                </a>
              </li>
              <li>
                <a
                  onClick={() => changeExpanded('condition')}
                  className={expandedCondition ? 'bg-success hover:bg-green-600' : ''}
                >
                  Condition
                </a>
              </li>
              <li>
                <a
                  onClick={() => changeExpanded('behavior')}
                  className={expandedBehavior ? 'bg-success hover:bg-green-600' : ''}
                >
                  Behavior
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className='navbar-end z-10'>
          <button onClick={handleExport} className='btn btn-ghost badge badge-xs badge-primary'>
            Export .csv
          </button>
        </div>
      </div>
      <div className='overflow-x-auto'>
        <table className='table table-xs table-hover'>
          <thead>
            <tr>
              {rows.headersGroup.map((header, index) => (
                <th
                  key={`${index}-group`}
                  className={index % 2 === 0 ? 'bg-slate-300' : 'bg-gray-300'}
                  colSpan={header.span}
                >
                  {header.name}
                </th>
              ))}
            </tr>
            <tr>
              {rows.headers.map((header, index) => (
                <th
                  key={index}
                  data-col={index}
                  onMouseEnter={() => handleMouseEnter(index)}
                  onMouseLeave={() => handleMouseLeave(index)}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.rows.map((row, rowIndex) =>
              row ? (
                <tr key={rowIndex} className='hover:bg-gray-100'>
                  {Object.values(row).map((value, colIndex) => (
                    <td
                      key={colIndex}
                      data-col={colIndex}
                      onMouseEnter={() => handleMouseEnter(colIndex)}
                      onMouseLeave={() => handleMouseLeave(colIndex)}
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              ) : null,
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default ArrageTable
