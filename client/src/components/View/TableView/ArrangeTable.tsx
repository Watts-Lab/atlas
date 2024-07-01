import { useEffect, useState } from 'react'
import { Result, TableData, flattenData } from './hooks/data-handler'

type ArrageTableProps = {
  result: Result
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

  return (
    <>
      <div className='flex flex-row justify-center pb-3'>
        <ul className='menu menu-xs menu-horizontal bg-base-200 gap-1 rounded-box'>
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
      <main className='h-screen w-screen px-4'>
        <div className='overflow-x-auto'>
          <table className='table table-xs table-hover'>
            <thead>
              <tr>
                {rows.headersGroup.map((header, index) => (
                  <th
                    key={`${index}-group`}
                    className={index % 2 === 0 ? 'bg-slate-200' : 'bg-slate-100'}
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
      </main>
    </>
  )
}

export default ArrageTable
