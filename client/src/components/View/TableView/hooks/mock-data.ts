import { Result } from './data-handler'

// Sample usage
export const check_data: Result = {
  file_name:
    'whiting-watts-2024-a-framework-for-quantifying-individual-and-collective-common-sense.pdf',
  experiments: [
    {
      conditions: [
        {
          condition_behaviors: [
            {
              behavior_description: 'Participant agreement level with claims',
              behavior_focal: 'focal',
              behavior_name: 'Agreement',
              behavior_priority: 'primary',
            },
            {
              behavior_description: 'Prediction about majority agreement',
              behavior_focal: 'not focal',
              behavior_name: 'Prediction',
              behavior_priority: 'primary',
            },
          ],
          condition_description:
            'Participants evaluated given claims based on whether they agreed with the claim and predicted if the majority would also agree.',
          condition_message: 'No',
          condition_name: 'Baseline Evaluation',
          condition_type: 'control',
        },
      ],
      experiment_description:
        'This study investigates the properties and distribution of common sense knowledge among individuals and groups. It defines commonsensicality for individual claims and people, and quantifies common sense as a clique detection problem on a bipartite belief graph of people and claims.',
      experiment_name: 'Quantifying Commonsensicality',
    },
  ],
}
