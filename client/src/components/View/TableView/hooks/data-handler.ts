export interface Condition {
  [key: string]: number | string | Behavior[]
  behaviors: Behavior[]
}

export interface Behavior {
  [key: string]: number | string
}

export interface Experiment {
  name: string
  description: string
  participant_source: string
  participant_source_category: string
  units_randomized: string
  units_analyzed: string
  sample_size_randomized: number
  sample_size_analyzed: number
  sample_size_notes: string
  adults: string
  age_mean: number | string | null
  age_sd: number | string | null
  female_perc: number | string | null
  male_perc: number | string | null
  gender_other: number | string | null
  language: string
  language_secondary: string
  compensation: string
  demographics_conditions: string
  population_other: string
  conditions: Condition[]
}

export interface Result {
  file_name?: string
  experiments: Experiment[]
}

export type KeyValuePairs = {
  [key: string]: number | string | null
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
  const experimentHeaders = [
    'experiment_name',
    'experiment_description',
    'participant_source',
    'participant_source_category',
    'units_randomized',
    'units_analyzed',
    'sample_size_randomized',
    'sample_size_analyzed',
    'sample_size_notes',
    'adults',
    'age_mean',
    'age_sd',
    'female_perc',
    'male_perc',
    'gender_other',
    'language',
    'language_secondary',
    'compensation',
    'demographics_conditions',
    'population_other',
  ]

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
              condition.behaviors.map((behavior, beh_index) => ({
                id: `${experiment_id}-${exp_index}-${con_index}-${beh_index}`,
                file_name: data.file_name || '',
                experiment_name: experiment.name,
                experiment_description: experiment.description,
                participant_source: experiment.participant_source,
                participant_source_category: experiment.participant_source_category,
                units_randomized: experiment.units_randomized,
                units_analyzed: experiment.units_analyzed,
                sample_size_randomized: experiment.sample_size_randomized,
                sample_size_analyzed: experiment.sample_size_analyzed,
                sample_size_notes: experiment.sample_size_notes,
                adults: experiment.adults,
                age_mean: experiment.age_mean,
                age_sd: experiment.age_sd,
                female_perc: experiment.female_perc,
                male_perc: experiment.male_perc,
                gender_other: experiment.gender_other,
                // white_perc: experiment.white_perc,
                // black_perc: experiment.black_perc,
                // hispanic_perc: experiment.hispanic_perc,
                // asian_perc: experiment.asian_perc,
                // other_ethnicity_perc: experiment.other_ethnicity_perc,
                language: experiment.language,
                language_secondary: experiment.language_secondary,
                compensation: experiment.compensation,
                demographics_conditions: experiment.demographics_conditions,
                population_other: experiment.population_other,
                condition_name: condition.name,
                condition_description: condition.description,
                condition_type: condition.type,
                condition_message: condition.message,
                behavior_name: behavior.name,
                behavior_description: behavior.description,
                behavior_priority: behavior.priority,
                behavior_focal: behavior.focal,
              })),
            ),
          ) as KeyValuePairs[])
        : (data.experiments.flatMap((experiment, exp_index) =>
            experiment.conditions.map((condition, con_index) => ({
              id: `${experiment_id}-${exp_index}-${con_index}`,
              file_name: data.file_name || '',
              experiment_name: experiment.name,
              experiment_description: experiment.description,
              participant_source: experiment.participant_source,
              participant_source_category: experiment.participant_source_category,
              units_randomized: experiment.units_randomized,
              units_analyzed: experiment.units_analyzed,
              sample_size_randomized: experiment.sample_size_randomized,
              sample_size_analyzed: experiment.sample_size_analyzed,
              sample_size_notes: experiment.sample_size_notes,
              adults: experiment.adults,
              age_mean: experiment.age_mean,
              age_sd: experiment.age_sd,
              female_perc: experiment.female_perc,
              male_perc: experiment.male_perc,
              gender_other: experiment.gender_other,
              //   white_perc: experiment.white_perc,
              //   black_perc: experiment.black_perc,
              //   hispanic_perc: experiment.hispanic_perc,
              //   asian_perc: experiment.asian_perc,
              //   other_ethnicity_perc: experiment.other_ethnicity_perc,
              language: experiment.language,
              language_secondary: experiment.language_secondary,
              compensation: experiment.compensation,
              demographics_conditions: experiment.demographics_conditions,
              population_other: experiment.population_other,
              condition_name: condition.name,
              condition_description: condition.description,
              condition_type: condition.type,
              condition_message: condition.message,
              behaviors: `${condition.behaviors.length} behavior`,
            })),
          ) as KeyValuePairs[])

      const headersGroup = expandedBehavior
        ? [
            { name: 'Paper', span: 2 },
            { name: 'Experiments', span: experimentHeaders.length },
            { name: 'Conditions', span: 4 },
            { name: 'Behaviors', span: 4 },
          ]
        : [
            { name: 'Paper', span: 2 },
            { name: 'Experiments', span: experimentHeaders.length },
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
              condition.behaviors.map((behavior, beh_index) => ({
                id: `${experiment_id}-${exp_index}-${con_index}-${beh_index}`,
                file_name: data.file_name || '',
                experiment_name: experiment.name,
                experiment_description: experiment.description,
                participant_source: experiment.participant_source,
                participant_source_category: experiment.participant_source_category,
                units_randomized: experiment.units_randomized,
                units_analyzed: experiment.units_analyzed,
                sample_size_randomized: experiment.sample_size_randomized,
                sample_size_analyzed: experiment.sample_size_analyzed,
                sample_size_notes: experiment.sample_size_notes,
                adults: experiment.adults,
                age_mean: experiment.age_mean,
                age_sd: experiment.age_sd,
                female_perc: experiment.female_perc,
                male_perc: experiment.male_perc,
                gender_other: experiment.gender_other,
                // white_perc: experiment.white_perc,
                // black_perc: experiment.black_perc,
                // hispanic_perc: experiment.hispanic_perc,
                // asian_perc: experiment.asian_perc,
                // other_ethnicity_perc: experiment.other_ethnicity_perc,
                language: experiment.language,
                language_secondary: experiment.language_secondary,
                compensation: experiment.compensation,
                demographics_conditions: experiment.demographics_conditions,
                population_other: experiment.population_other,
                conditions: condition.name,
                behavior_name: behavior.name,
                behavior_description: behavior.description,
                behavior_priority: behavior.priority,
                behavior_focal: behavior.focal,
              })),
            ),
          ) as KeyValuePairs[])
        : data.experiments.flatMap((experiment, exp_index) => ({
            id: `${experiment_id}-${exp_index}`,
            file_name: data.file_name || '',
            experiment_name: experiment.name,
            experiment_description: experiment.description,
            participant_source: experiment.participant_source,
            participant_source_category: experiment.participant_source_category,
            units_randomized: experiment.units_randomized,
            units_analyzed: experiment.units_analyzed,
            sample_size_randomized: experiment.sample_size_randomized,
            sample_size_analyzed: experiment.sample_size_analyzed,
            sample_size_notes: experiment.sample_size_notes,
            adults: experiment.adults,
            age_mean: experiment.age_mean,
            age_sd: experiment.age_sd,
            female_perc: experiment.female_perc,
            male_perc: experiment.male_perc,
            gender_other: experiment.gender_other,
            // white_perc: experiment.white_perc,
            // black_perc: experiment.black_perc,
            // hispanic_perc: experiment.hispanic_perc,
            // asian_perc: experiment.asian_perc,
            // other_ethnicity_perc: experiment.other_ethnicity_perc,
            language: experiment.language,
            language_secondary: experiment.language_secondary,
            compensation: experiment.compensation,
            demographics_conditions: experiment.demographics_conditions,
            population_other: experiment.population_other,
            conditions: `${experiment.conditions.length} condition`,
            behaviors: `${experiment.conditions.reduce(
              (acc, condition) => acc + condition.behaviors.length,
              0,
            )} behavior`,
          }))
      const headersGroup = expandedBehavior
        ? [
            { name: 'Paper', span: 2 },
            { name: 'Experiments', span: experimentHeaders.length },
            { name: 'Conditions', span: 1 },
            { name: 'Behaviors', span: 4 },
          ]
        : [
            { name: 'Paper', span: 2 },
            { name: 'Experiments', span: experimentHeaders.length },
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
              condition.behaviors.map((behavior, beh_index) => ({
                id: `${experiment_id}-${exp_index}-${con_index}-${beh_index}`,
                file_name: data.file_name || '',
                experiments: experiment.name,
                condition_name: condition.name,
                condition_description: condition.description,
                condition_type: condition.type,
                condition_message: condition.message,
                behavior_name: behavior.name,
                behavior_description: behavior.description,
                behavior_priority: behavior.priority,
                behavior_focal: behavior.focal,
              })),
            ),
          ) as KeyValuePairs[])
        : (data.experiments.flatMap((experiment, exp_index) =>
            experiment.conditions.map((condition, con_index) => ({
              id: `${experiment_id}-${exp_index}-${con_index}`,
              file_name: data.file_name || '',
              experiments: experiment.name,
              condition_name: condition.name,
              condition_description: condition.description,
              condition_type: condition.type,
              condition_message: condition.message,
              behaviors: `${condition.behaviors.length} behavior`,
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
              condition.behaviors.map((behavior, beh_index) => ({
                id: `${experiment_id}-${exp_index}-${con_index}-${beh_index}`,
                file_name: data.file_name || '',
                experiments: experiment.name,
                conditions: condition.name,
                behavior_name: behavior.name,
                behavior_description: behavior.description,
                behavior_priority: behavior.priority,
                behavior_focal: behavior.focal,
              })),
            ),
          ) as KeyValuePairs[])
        : ([
            {
              id: `${experiment_id}`,
              file_name: data.file_name || '',
              experiments: `${data.experiments.length} experiment(s)`,
              conditions: `${data.experiments.flatMap((exp) => exp.conditions).length} condition(s)`,
              behaviors: `${data.experiments.reduce(
                (acc, exp) =>
                  acc +
                  exp.conditions.reduce(
                    (condAcc, condition) => condAcc + condition.behaviors.length,
                    0,
                  ),
                0,
              )} behavior(s)`,
            },
          ] as KeyValuePairs[])

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
