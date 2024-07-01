import { Result } from './data-handler'

// Sample usage
export const check_data: Result = {
  file_name: 'Workflow-1',
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
              behavior_priority: 'Type 1',
              behavior_focal: 'Message 1',
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
              behavior_priority: 'Type 2',
              behavior_focal: 'Message 2',
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
              behavior_priority: 'Type 3',
              behavior_focal: 'Message 3',
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
          condition_messalsge: 'exp2 Message 1',
          condition_behaviors: [
            {
              behavior_name: '--',
              behavior_description: '--',
              behavior_priority: '--',
              behavior_focal: '--',
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
              behavior_priority: '--',
              behavior_focal: '--',
            },
          ],
        },
      ],
    },
  ],
}
