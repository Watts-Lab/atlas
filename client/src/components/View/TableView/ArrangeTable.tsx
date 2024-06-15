import { useEffect, useState } from 'react'
import Header from '../../Builder/Header'

interface Condition {
  [key: string]: number | string
}

interface Behavior {
  [key: string]: number | string
}

interface Experiment {
  experiment_name: string
  experiment_description: string
  conditions: Condition[]
  behavior: Behavior[]
}

interface Result {
  experiments: Experiment[]
}

// Sample usage
const result: Result = {
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
        },
        {
          condition_name: 'Condition 2',
          condition_description: 'Description 2',
          condition_type: 'Type 2',
          condition_message: 'Message 2',
        },
      ],
      behavior: [
        {
          behavior_name: 'Behavior 1',
          behavior_description: 'Description 1',
          behavior_type: 'Type 1',
          behavior_message: 'Message 1',
        },
        {
          behavior_name: 'Behavior 2',
          behavior_description: 'Description 2',
          behavior_type: 'Type 2',
          behavior_message: 'Message 2',
        },
      ],
    },
  ],
}

const ArrageTable = () => {
  const [expandedExperiment, setExpandedExperiment] = useState<boolean>(false)
  const [expandedCondition, setExpandedCondition] = useState<boolean>(false)
  const [expandedBehavior, setExpandedBehavior] = useState<boolean>(false)

  useEffect(() => {
    console.log(expandedBehavior)
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
        <ul className='menu menu-xs menu-horizontal bg-base-200 gap-3 rounded-box'>
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
      <main>
        <div className='overflow-x-auto'>
          <table className='table table-xs'>
            <thead>
              <tr>
                <th></th>
                <th>paper_id</th>
                <th>condition_name</th>
                <th>condition_description</th>
                <th>condition_type</th>
                <th>condition_message</th>
              </tr>
            </thead>
            <tbody>
              {result.experiments[0].conditions.map((row, index) => (
                <tr key={index}>
                  <th>{index}</th>
                  <td>{'hello'}</td>
                  <td>{row.condition_name}</td>
                  <td>{row.condition_description}</td>
                  <td>{row.condition_type}</td>
                  <td>{row.condition_message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  )
}

export default ArrageTable
