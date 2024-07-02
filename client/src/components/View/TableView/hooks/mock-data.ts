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
      experiment_name: 'Quantifying Commonsensicality',
      experiment_description:
        "This study aimed to define and quantify common sense both at the individual and collective levels. It employed a bipartite graph model to evaluate how 'commonsensical' certain claims were perceived by a sample of human participants.",
      participant_source: 'Amazon Mechanical Turk (mTurk)',
      participant_source_category: 'online panel',
      units_randomized: 'individuals',
      units_analyzed: 'individuals',
      sample_size_randomized: 2046,
      sample_size_analyzed: 2046,
      sample_size_notes:
        'Each participant rated 50 randomly chosen claims from a corpus of 4,407 claims.',
      adults: 'adults',
      age_mean: '--',
      age_sd: '--',
      female_perc: '--',
      male_perc: '--',
      gender_other: '--',
      language: 'English',
      language_secondary: 'NA',
      compensation: 'monetary payment based on standard mTurk rates',
      demographics_conditions: 'N',
      population_other:
        'Participants were chosen to ensure diversity across several demographic attributes such as age, race, gender, education, income, marital status, and political leaning.',
    },
  ],
}
