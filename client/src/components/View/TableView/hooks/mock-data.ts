import { Result } from './data-handler'

// Sample usage
export const check_data: Result = {
  file_name:
    'whiting-watts-2024-a-framework-for-quantifying-individual-and-collective-common-sense.pdf',
  experiments: [
    {
      adults: 'adults',
      age_mean: '--',
      age_sd: '--',
      compensation: 'Paid via Amazon Mechanical Turk',
      conditions: [
        {
          behaviors: [
            {
              description: 'Participants rate their agreement with the claim.',
              focal: 'focal',
              name: 'Agreement with Claim',
              priority: 'primary',
            },
          ],
          description: 'Claims generated through direct human input based on specific prompts.',
          message: 'Yes',
          name: 'Human-Generated Claims',
          type: 'treatment',
        },
        {
          behaviors: [
            {
              description: 'Participants rate their agreement with the claim.',
              focal: 'focal',
              name: 'Agreement with Claim',
              priority: 'primary',
            },
          ],
          description:
            'Claims generated by artificial intelligence models such as ConceptNet and Atomic.',
          message: 'Yes',
          name: 'AI-Generated Claims',
          type: 'treatment',
        },
        {
          behaviors: [
            {
              description: 'Participants rate their agreement with the claim.',
              focal: 'focal',
              name: 'Agreement with Claim',
              priority: 'primary',
            },
          ],
          description:
            'Claims extracted from natural text sources such as news articles, political emails, and aphorisms.',
          message: 'Yes',
          name: 'Claims in Natural Text',
          type: 'treatment',
        },
      ],
      demographics_conditions: 'N',
      description:
        'This study investigates the properties and commonness of common sense knowledge by analyzing human agreement on a range of claims from various sources. It aims to quantify the extent to which individual claims are perceived as commonsensical and how much these perceptions are shared among people.',
      name: 'Quantifying Common Sense',
      female_perc: '--',
      gender_other: '--',
      language: 'English',
      language_secondary: 'NA',
      male_perc: '--',
      participant_source: 'Amazon Mechanical Turk',
      participant_source_category: 'online panel',
      population_other: 'Participants are diverse in demographic and socioeconomic status.',
      sample_size_analyzed: 4407,
      sample_size_notes:
        'Each of the 4407 claims was rated by an average of 23.44 individuals out of 2046 participants.',
      sample_size_randomized: 2046,
      units_analyzed: 'claims',
      units_randomized: 'claims',
    },
  ],
}
