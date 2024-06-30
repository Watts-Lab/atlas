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
  paper_title?: string
  experiments: Experiment[]
}

export type KeyValuePairs = {
  [key: string]: number | string | Behavior[]
}

export type TableData = {
  headers: string[]
  rows: KeyValuePairs[]
}

export const flattenData = (
  data: Result,
  expandedExperiment: boolean,
  expandedCondition: boolean,
  expandedBehavior: boolean,
): TableData => {
  const defaultHeaders = ['id', 'file_name', 'paper_title']
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
    'behavior_type',
    'behavior_message',
  ]

  if (!data.experiments) {
    return { headers: defaultHeaders, rows: [] }
  }

  if (expandedExperiment) {
    if (expandedCondition) {
      // expandedExperiment && expandedCondition
      const headers = expandedBehavior
        ? [...defaultHeaders, ...experimentHeaders, ...conditionHeaders, ...behaviorHeaders]
        : [...defaultHeaders, ...experimentHeaders, ...conditionHeaders, 'behaviors']

      const rows = expandedBehavior
        ? data.experiments.flatMap((experiment, exp_index) =>
            experiment.conditions.flatMap((condition, con_index) =>
              condition.condition_behaviors.map((behavior, beh_index) => ({
                id: `${exp_index}-${con_index}-${beh_index}`,
                file_name: data.file_name || '',
                paper_title: data.paper_title || '',
                experiment_name: experiment.experiment_name,
                experiment_description: experiment.experiment_description,
                condition_name: condition.condition_name,
                condition_description: condition.condition_description,
                condition_type: condition.condition_type,
                condition_message: condition.condition_message,
                behavior_name: behavior.behavior_name,
                behavior_description: behavior.behavior_description,
                behavior_type: behavior.behavior_type,
                behavior_message: behavior.behavior_message,
              })),
            ),
          )
        : data.experiments.flatMap((experiment, exp_index) =>
            experiment.conditions.map((condition, con_index) => ({
              id: `${exp_index}-${con_index}`,
              file_name: data.file_name || '',
              paper_title: data.paper_title || '',
              experiment_name: experiment.experiment_name,
              experiment_description: experiment.experiment_description,
              condition_name: condition.condition_name,
              condition_description: condition.condition_description,
              condition_type: condition.condition_type,
              condition_message: condition.condition_message,
              behaviors: `${condition.condition_behaviors.length} behavior`,
            })),
          )

      return { headers, rows }
    } else {
      // expandedExperiment && !expandedCondition
      const headers = expandedBehavior
        ? [...defaultHeaders, ...experimentHeaders, 'conditions', ...behaviorHeaders]
        : [...defaultHeaders, ...experimentHeaders, 'conditions', 'behaviors']

      const rows = expandedBehavior
        ? data.experiments.flatMap((experiment, exp_index) =>
            experiment.conditions.flatMap((condition, con_index) =>
              condition.condition_behaviors.map((behavior, beh_index) => ({
                id: `${exp_index}-${con_index}-${beh_index}`,
                file_name: data.file_name || '',
                paper_title: data.paper_title || '',
                experiment_name: experiment.experiment_name,
                experiment_description: experiment.experiment_description,
                conditions: condition.condition_name,
                behavior_name: behavior.behavior_name,
                behavior_description: behavior.behavior_description,
                behavior_type: behavior.behavior_type,
                behavior_message: behavior.behavior_message,
              })),
            ),
          )
        : data.experiments.flatMap((experiment, exp_index) => ({
            id: `${exp_index}`,
            file_name: data.file_name || '',
            paper_title: data.paper_title || '',
            experiment_name: experiment.experiment_name,
            experiment_description: experiment.experiment_description,
            conditions: `${experiment.conditions.length} condition`,
            behaviors: `${experiment.conditions.reduce(
              (acc, condition) => acc + condition.condition_behaviors.length,
              0,
            )} behavior`,
          }))

      return { headers, rows }
    }
  } else {
    if (expandedCondition) {
      return {
        headers: [...defaultHeaders, 'experiments', ...conditionHeaders, 'behaviors'],
        rows: data.experiments.map((experiment, index) => ({
          id: index,
          file_name: data.file_name || '',
          paper_title: data.paper_title || '',
          experiments: experiment.experiment_name,
          conditions: experiment.conditions.length,
          behaviors: experiment.conditions.reduce(
            (acc, condition) => acc + condition.condition_behaviors.length,
            0,
          ),
        })),
      }
    } else {
      return {
        headers: [...defaultHeaders, 'experiments', 'conditions', 'behaviors'],
        rows: data.experiments.map((experiment, index) => ({
          id: index,
          file_name: data.file_name || '',
          paper_title: data.paper_title || '',
          experiments: experiment.experiment_name,
          conditions: experiment.conditions.length,
          behaviors: experiment.conditions.reduce(
            (acc, condition) => acc + condition.condition_behaviors.length,
            0,
          ),
        })),
      }
    }
  }
}
