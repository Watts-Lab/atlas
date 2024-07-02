export interface Condition {
  [key: string]: number | string | Behavior[]
  condition_behaviors: Behavior[]
}

export interface Behavior {
  [key: string]: number | string
}

export interface Experiment {
  experiment_name: string
  experiment_description: string
  conditions: Condition[]
}

export interface Result {
  file_name?: string
  experiments: Experiment[]
}

export type KeyValuePairs = {
  [key: string]: number | string
}

export type TableData = {
  headers: string[]
  headersGroup: { name: string; span: number }[]
  rows: KeyValuePairs[]
}

export const flattenData = (
  data: Result[],
  expandedExperiment: boolean,
  expandedCondition: boolean,
  expandedBehavior: boolean,
): TableData => {
  const out = data.map((result, index) =>
    flattenExperiment(result, index, expandedExperiment, expandedCondition, expandedBehavior),
  )

  const headers = out[0].headers
  const headersGroup = out[0].headersGroup
  const rows = out.flatMap((tableData) => tableData.rows)

  return { headers, headersGroup, rows }
}

export const flattenExperiment = (
  data: Result,
  experiment_id: number,
  expandedExperiment: boolean,
  expandedCondition: boolean,
  expandedBehavior: boolean,
): TableData => {
  const defaultHeaders = ['id', 'file_name']
  const experimentHeaders = ['experiment_name', 'experiment_description']
  const conditionHeaders = [
    'condition_name',
    'condition_description',
    'condition_type',
    'condition_message',
  ]
  const behaviorHeaders = [
    'behavior_name',
    'behavior_description',
    'behavior_priority',
    'behavior_focal',
  ]

  if (!data.experiments) {
    return { headers: defaultHeaders, rows: [], headersGroup: [] }
  }

  if (expandedExperiment) {
    if (expandedCondition) {
      // expandedExperiment && expandedCondition
      const headers = expandedBehavior
        ? [...defaultHeaders, ...experimentHeaders, ...conditionHeaders, ...behaviorHeaders]
        : [...defaultHeaders, ...experimentHeaders, ...conditionHeaders, 'behaviors']

      const rows = expandedBehavior
        ? (data.experiments.flatMap((experiment, exp_index) =>
            experiment.conditions.flatMap((condition, con_index) =>
              condition.condition_behaviors.map((behavior, beh_index) => ({
                id: `${experiment_id}-${exp_index}-${con_index}-${beh_index}`,
                file_name: data.file_name || '',
                experiment_name: experiment.experiment_name,
                experiment_description: experiment.experiment_description,
                condition_name: condition.condition_name,
                condition_description: condition.condition_description,
                condition_type: condition.condition_type,
                condition_message: condition.condition_message,
                behavior_name: behavior.behavior_name,
                behavior_description: behavior.behavior_description,
                behavior_priority: behavior.behavior_priority,
                behavior_focal: behavior.behavior_focal,
              })),
            ),
          ) as KeyValuePairs[])
        : (data.experiments.flatMap((experiment, exp_index) =>
            experiment.conditions.map((condition, con_index) => ({
              id: `${experiment_id}-${exp_index}-${con_index}`,
              file_name: data.file_name || '',
              experiment_name: experiment.experiment_name,
              experiment_description: experiment.experiment_description,
              condition_name: condition.condition_name,
              condition_description: condition.condition_description,
              condition_type: condition.condition_type,
              condition_message: condition.condition_message,
              behaviors: `${condition.condition_behaviors.length} behavior`,
            })),
          ) as KeyValuePairs[])

      const headersGroup = expandedBehavior
        ? [
            { name: 'Paper', span: 2 },
            { name: 'Experiments', span: 2 },
            { name: 'Conditions', span: 4 },
            { name: 'Behaviors', span: 4 },
          ]
        : [
            { name: 'Paper', span: 2 },
            { name: 'Experiments', span: 2 },
            { name: 'Conditions', span: 4 },
            { name: 'Behaviors', span: 1 },
          ]

      return { headers, rows, headersGroup }
    } else {
      // expandedExperiment && !expandedCondition
      const headers = expandedBehavior
        ? [...defaultHeaders, ...experimentHeaders, 'conditions', ...behaviorHeaders]
        : [...defaultHeaders, ...experimentHeaders, 'conditions', 'behaviors']

      const rows = expandedBehavior
        ? (data.experiments.flatMap((experiment, exp_index) =>
            experiment.conditions.flatMap((condition, con_index) =>
              condition.condition_behaviors.map((behavior, beh_index) => ({
                id: `${experiment_id}-${exp_index}-${con_index}-${beh_index}`,
                file_name: data.file_name || '',

                experiment_name: experiment.experiment_name,
                experiment_description: experiment.experiment_description,
                conditions: condition.condition_name,
                behavior_name: behavior.behavior_name,
                behavior_description: behavior.behavior_description,
                behavior_priority: behavior.behavior_priority,
                behavior_focal: behavior.behavior_focal,
              })),
            ),
          ) as KeyValuePairs[])
        : data.experiments.flatMap((experiment, exp_index) => ({
            id: `${experiment_id}-${exp_index}`,
            file_name: data.file_name || '',
            experiment_name: experiment.experiment_name,
            experiment_description: experiment.experiment_description,
            conditions: `${experiment.conditions.length} condition`,
            behaviors: `${experiment.conditions.reduce(
              (acc, condition) => acc + condition.condition_behaviors.length,
              0,
            )} behavior`,
          }))
      const headersGroup = expandedBehavior
        ? [
            { name: 'Paper', span: 2 },
            { name: 'Experiments', span: 2 },
            { name: 'Conditions', span: 1 },
            { name: 'Behaviors', span: 4 },
          ]
        : [
            { name: 'Paper', span: 2 },
            { name: 'Experiments', span: 2 },
            { name: 'Conditions', span: 1 },
            { name: 'Behaviors', span: 1 },
          ]

      return { headers, rows, headersGroup }
    }
  } else {
    if (expandedCondition) {
      // !expandedExperiment && expandedCondition
      const headers = expandedBehavior
        ? [...defaultHeaders, 'experiments', ...conditionHeaders, ...behaviorHeaders]
        : [...defaultHeaders, 'experiments', ...conditionHeaders, 'behaviors']

      const rows = expandedBehavior
        ? (data.experiments.flatMap((experiment, exp_index) =>
            experiment.conditions.flatMap((condition, con_index) =>
              condition.condition_behaviors.map((behavior, beh_index) => ({
                id: `${experiment_id}-${exp_index}-${con_index}-${beh_index}`,
                file_name: data.file_name || '',
                experiments: experiment.experiment_name,
                condition_name: condition.condition_name,
                condition_description: condition.condition_description,
                condition_type: condition.condition_type,
                condition_message: condition.condition_message,
                behavior_name: behavior.behavior_name,
                behavior_description: behavior.behavior_description,
                behavior_priority: behavior.behavior_priority,
                behavior_focal: behavior.behavior_focal,
              })),
            ),
          ) as KeyValuePairs[])
        : (data.experiments.flatMap((experiment, exp_index) =>
            experiment.conditions.map((condition, con_index) => ({
              id: `${experiment_id}-${exp_index}-${con_index}`,
              file_name: data.file_name || '',
              experiments: experiment.experiment_name,
              condition_name: condition.condition_name,
              condition_description: condition.condition_description,
              condition_type: condition.condition_type,
              condition_message: condition.condition_message,
              behaviors: `${condition.condition_behaviors.length} behavior`,
            })),
          ) as KeyValuePairs[])

      const headersGroup = expandedBehavior
        ? [
            { name: 'Paper', span: 2 },
            { name: 'Experiments', span: 1 },
            { name: 'Conditions', span: 4 },
            { name: 'Behaviors', span: 4 },
          ]
        : [
            { name: 'Paper', span: 2 },
            { name: 'Experiments', span: 1 },
            { name: 'Conditions', span: 4 },
            { name: 'Behaviors', span: 1 },
          ]
      return { headers, rows, headersGroup }
    } else {
      // !expandedExperiment && !expandedCondition
      const headers = expandedBehavior
        ? [...defaultHeaders, 'experiments', 'conditions', ...behaviorHeaders]
        : [...defaultHeaders, 'experiments', 'conditions', 'behaviors']

      const rows = expandedBehavior
        ? (data.experiments.flatMap((experiment, exp_index) =>
            experiment.conditions.flatMap((condition, con_index) =>
              condition.condition_behaviors.map((behavior, beh_index) => ({
                id: `${experiment_id}-${exp_index}-${con_index}-${beh_index}`,
                file_name: data.file_name || '',
                experiments: experiment.experiment_name,
                conditions: condition.condition_name,
                behavior_name: behavior.behavior_name,
                behavior_description: behavior.behavior_description,
                behavior_priority: behavior.behavior_priority,
                behavior_focal: behavior.behavior_focal,
              })),
            ),
          ) as KeyValuePairs[])
        : (data.experiments.flatMap((experiment, exp_index) => ({
            id: `${experiment_id}-${exp_index}`,
            file_name: data.file_name || '',
            experiments: experiment.experiment_name,
            conditions: `${experiment.conditions.length} condition`,
            behaviors: `${experiment.conditions.reduce(
              (acc, condition) => acc + condition.condition_behaviors.length,
              0,
            )} behavior`,
          })) as KeyValuePairs[])

      const headersGroup = expandedBehavior
        ? [
            { name: 'Paper', span: 2 },
            { name: 'Experiments', span: 1 },
            { name: 'Conditions', span: 1 },
            { name: 'Behaviors', span: 4 },
          ]
        : [
            { name: 'Paper', span: 2 },
            { name: 'Experiments', span: 1 },
            { name: 'Conditions', span: 1 },
            { name: 'Behaviors', span: 1 },
          ]

      return { headers, rows, headersGroup }
    }
  }
}
