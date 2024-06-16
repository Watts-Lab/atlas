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
        {
          condition_name: 'Condition 3',
          condition_description: 'Description 3',
          condition_type: 'Type 3',
          condition_message: 'Message 3',
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
    {
      experiment_name: 'Experiment 2',
      experiment_description: 'ExpDescription 2',
      conditions: [
        {
          condition_name: 'exp2 Condition 1',
          condition_description: 'exp2 Description 1',
          condition_type: 'exp2 Type 1',
          condition_message: 'exp2 Message 1',
        },
        {
          condition_name: 'exp2 Condition 2',
          condition_description: 'exp2 Description 2',
          condition_type: 'exp2 Type 2',
          condition_message: 'exp2 Message 2',
        },
      ],
      behavior: [],
    },
  ],
}

type KeyValuePairs = {
  [key: string]: number | string
}

type TableData = {
  headers: string[]
  rows: KeyValuePairs[]
}

const flattenData = (
  data: Result,

  expandedExperiment: boolean,

  expandedCondition: boolean,

  expandedBehavior: boolean,
): TableData => {
  if (!expandedExperiment && !expandedCondition && !expandedBehavior) {
    const experimentData = data.experiments.map((experiment, index) => {
      return {
        id: index + 1,
        paper_id: 'A_67a_2021_BehaviouralNudgesIncrease',
        paper_title: 'paper title',
        experiments: experiment.experiment_name,
        conditions: `${experiment.conditions.length} conditions found`,
        behaviors: `${experiment.behavior.length} behaviors found`,
      }
    })

    return { headers: Object.keys(experimentData[0]), rows: experimentData }
  }

  if (expandedExperiment && !expandedCondition && !expandedBehavior) {
    const experimentData = data.experiments.map((experiment, index) => {
      return {
        id: index + 1,
        paper_id: 'A_67a_2021_BehaviouralNudgesIncrease',
        paper_title: 'paper title',
        experiment_name: experiment.experiment_name,
        experiment_description: experiment.experiment_description,
        conditions: experiment.conditions.length,
        behaviors: experiment.behavior.length,
      }
    })

    return { headers: Object.keys(experimentData[0]), rows: experimentData }
  }

  const detailedData: KeyValuePairs[] = []

  data.experiments.forEach((experiment, expIndex) => {
    if (expandedCondition) {
      experiment.conditions.forEach((condition) => {
        detailedData.push({
          id: expIndex + 1,
          paper_id: 'A_67a_2021_BehaviouralNudgesIncrease',
          experiment_name: experiment.experiment_name,
          experiment_description: experiment.experiment_description,
          condition_name: condition.condition_name,
          condition_description: condition.condition_description,
          condition_type: condition.condition_type,
          condition_message: condition.condition_message,
        })
      })
    }

    if (expandedBehavior) {
      experiment.behavior.forEach((behavior) => {
        detailedData.push({
          id: expIndex + 1,
          paper_id: 'A_67a_2021_BehaviouralNudgesIncrease',
          experiment_name: experiment.experiment_name,
          experiment_description: experiment.experiment_description,
          behavior_name: behavior.behavior_name,
          behavior_description: behavior.behavior_description,
          behavior_type: behavior.behavior_type,
          behavior_message: behavior.behavior_message,
        })
      })
    }
  })

  return {
    headers: detailedData.length ? Object.keys(detailedData[0]) : [],

    rows: detailedData.length ? detailedData : [{}],
  }
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
        if (expandedBehavior) setExpandedBehavior(false)
        break
      case 'behavior':
        setExpandedBehavior((prevState) => !prevState)
        if (expandedCondition) setExpandedCondition(false)
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
      <main>
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
