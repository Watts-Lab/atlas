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
  task_id: string
  status: 'success' | 'failed' | 'inprogress'
  file_name: string
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

export const flattenData = (
  data: Result[],
  expandedExperiment: boolean,
  expandedCondition: boolean,
  expandedBehavior: boolean,
): TableData => {
  if (data.length === 0) {
    return {
      headers: [...defaultHeaders, ...experimentHeaders, ...conditionHeaders, ...behaviorHeaders],
      rows: [],
      headersGroup: [],
    }
  }

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
  if (!data.experiments) {
    return {
      headers: defaultHeaders,
      rows: [],
      headersGroup: [
        { name: 'Paper', span: 2 },
        { name: 'Experiments', span: experimentHeaders.length },
        { name: 'Conditions', span: 4 },
        { name: 'Behaviors', span: 4 },
      ],
    }
  }

  if (expandedExperiment) {
    if (expandedCondition) {
      const headers = expandedBehavior
        ? [...defaultHeaders, ...experimentHeaders, ...conditionHeaders, ...behaviorHeaders]
        : [...defaultHeaders, ...experimentHeaders, ...conditionHeaders, 'behaviors']

      const rows = expandedBehavior
        ? (data.experiments.flatMap((experiment, exp_index) =>
            experiment.conditions.flatMap((condition, con_index) =>
              condition.behaviors.map((behavior, beh_index) => ({
                id: `${experiment_id}-${exp_index}-${con_index}-${beh_index}`,
                file_name: data.status === 'inprogress' ? data.task_id : data.file_name,
                status: data.status,
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
              file_name: data.status === 'inprogress' ? data.task_id : data.file_name,
              status: data.status,
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
                file_name: data.status === 'inprogress' ? data.task_id : data.file_name,
                status: data.status,
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
            file_name: data.status === 'inprogress' ? data.task_id : data.file_name,
            status: data.status,
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
                file_name: data.status === 'inprogress' ? data.task_id : data.file_name,
                status: data.status,
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
              file_name: data.status === 'inprogress' ? data.task_id : data.file_name,
              status: data.status,
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
                file_name: data.status === 'inprogress' ? data.task_id : data.file_name,
                status: data.status,
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
              file_name: data.status === 'inprogress' ? data.task_id : data.file_name,
              status: data.status,
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

export function flattenObject(
  obj: Record<string, unknown> | Record<string, unknown>[],
  pathsToCollapse: string[] = [],
  currentPath = '',
): Record<string, unknown>[] {
  // ------------- convenience helpers ---------------------------------
  const joinPath = (p: string, k: string) => (p ? `${p}.${k}` : k)

  /** prefix (“experiments accuracy” …) every key of `row` with `prefix`   */
  const prefixKeys = (row: Record<string, unknown>, prefix: string) =>
    Object.fromEntries(Object.entries(row).map(([k, v]) => [`${prefix} ${k}`, v]))

  // ------------- handle an ARRAY --------------------------------------
  if (Array.isArray(obj)) {
    return obj.flatMap((item) => flattenObject(item, pathsToCollapse, currentPath))
  }

  // ------------- handle an OBJECT -------------------------------------
  let rows: Record<string, unknown>[] = [{}] // start with one empty row

  for (const [key, value] of Object.entries(obj)) {
    const fullPath = joinPath(currentPath, key)

    // ---------- value is an ARRAY ----------------------------------
    if (Array.isArray(value)) {
      if (pathsToCollapse.includes(fullPath)) {
        // collapse ⇒ one cell with the count
        rows.forEach((r) => (r[key] = `${value.length} ${key}`))
      } else {
        // expand ⇒ one row per element
        const childRows =
          value.length === 0
            ? [{}]
            : value.flatMap((elem) => flattenObject(elem, pathsToCollapse, fullPath))

        rows = rows.flatMap((r) => childRows.map((cr) => ({ ...r, ...prefixKeys(cr, key) })))
      }
      continue
    }

    // ---------- value is a NESTED OBJECT ---------------------------
    if (value && typeof value === 'object') {
      const childRows = flattenObject(value as Record<string, unknown>, pathsToCollapse, fullPath)

      rows = rows.flatMap((r) => childRows.map((cr) => ({ ...r, ...prefixKeys(cr, key) })))
      continue
    }

    // ---------- value is PRIMITIVE ---------------------------------
    rows.forEach((r) => (r[key] = value))
  }

  return rows
}

export function nestFlatKeys(flatObj: Record<string, unknown>) {
  const nested: Record<string, unknown> = {}

  for (const [key, val] of Object.entries(flatObj)) {
    const segments = key.split(' ')
    let curr = nested

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i].endsWith('_truth')
        ? segments[i].slice(0, -6) // remove "_truth"
        : segments[i]

      if (i === segments.length - 1) {
        curr[segment] = val
      } else {
        if (curr[segment] == null) {
          curr[segment] = {}
        }
        curr = curr[segment] as Record<string, unknown>
      }
    }
  }

  return nested
}
