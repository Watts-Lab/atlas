import { useEffect, useState } from 'react'
import Header from '../../Builder/Header'
import { Result, TableData, flattenData } from './hooks/data-handler'

// Sample usage
const result: Result = {
  file_name: 'Workflow-1',
  paper_title: 'Paper Title',
  experiments: [
    {
      experiment_name: 'Experiment 1',
      experiment_description: 'Description 1',
      conditions: [
        {
          condition_name: 'Condition 1',
          condition_description: 'Description 1',
          condition_type: 'Type 1',
          condition_message: 'Message 1',
          condition_behaviors: [
            {
              behavior_name: 'Behavior 1',
              behavior_description: 'Description 1',
              behavior_type: 'Type 1',
              behavior_message: 'Message 1',
            },
          ],
        },
        {
          condition_name: 'Condition 2',
          condition_description: 'Description 2',
          condition_type: 'Type 2',
          condition_message: 'Message 2',
          condition_behaviors: [
            {
              behavior_name: 'Behavior 2',
              behavior_description: 'Description 2',
              behavior_type: 'Type 2',
              behavior_message: 'Message 2',
            },
          ],
        },
        {
          condition_name: 'Condition 3',
          condition_description: 'Description 3',
          condition_type: 'Type 3',
          condition_message: 'Message 3',
          condition_behaviors: [
            {
              behavior_name: 'Behavior 3',
              behavior_description: 'Description 3',
              behavior_type: 'Type 3',
              behavior_message: 'Message 3',
            },
          ],
        },
      ],
    },
    {
      experiment_name: 'Experiment 2',
      experiment_description: 'ExpDescription 2',
      conditions: [
        {
          condition_name: 'exp2 Condition 1',
          condition_description: 'exp2 Description 1',
          condition_type: 'exp2 Type 1',
          condition_message: 'exp2 Message 1',
          condition_behaviors: [
            {
              behavior_name: '--',
              behavior_description: '--',
              behavior_type: '--',
              behavior_message: '--',
            },
          ],
        },
        {
          condition_name: 'exp2 Condition 2',
          condition_description: 'exp2 Description 2',
          condition_type: 'exp2 Type 2',
          condition_message: 'exp2 Message 2',
          condition_behaviors: [
            {
              behavior_name: '--',
              behavior_description: '--',
              behavior_type: '--',
              behavior_message: '--',
            },
          ],
        },
      ],
    },
  ],
}

const ArrageTable = () => {
  const [expandedExperiment, setExpandedExperiment] = useState<boolean>(false)
  const [expandedCondition, setExpandedCondition] = useState<boolean>(false)
  const [expandedBehavior, setExpandedBehavior] = useState<boolean>(false)

  const [rows, setRows] = useState<TableData>(
    flattenData(result, expandedExperiment, expandedCondition, expandedBehavior),
  )

  useEffect(() => {
    setRows(flattenData(result, expandedExperiment, expandedCondition, expandedBehavior))
    console.log(flattenData(result, expandedExperiment, expandedCondition, expandedBehavior))
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

  return (
    <>
      <Header fileName='Workflow-1' />
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
        <div className='overflow-x-auto transition-all duration-300 ease-in-out'>
          <table className='table table-xs'>
            <thead>
              <tr>
                {rows.headers.map((header, index) => (
                  <th key={index}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.rows.map((row, index) =>
                row ? (
                  <tr key={index} className='transition-all duration-300 ease-in-out'>
                    {Object.values(row).map((value, index) => (
                      <td key={index}>{value}</td>
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
