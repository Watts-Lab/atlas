export type Feature = {
  id: string
  feature_name: string
  feature_description: string
  feature_identifier: string
  feature_identifier_spaced: string
  trail: string
  selected?: boolean
}

// export interface Feature {
//   id: string
//   feature_identifier: string
//   feature_identifier_spaced: string
//   feature_name: string
//   feature_description: string
//   selected: boolean
//   trail: string
//   feature_type?: 'parent' | 'text' | 'number' | 'enum'
//   enum_options?: string[]
// }

export type NewFeature = Omit<Feature, 'id' | 'trail'> & {
  feature_name: string
  feature_description: string
  feature_identifier: string
  feature_parent: string
  feature_type: 'parent' | 'text' | 'number' | 'enum' | 'boolean'
  gpt_interface: {
    type: 'string' | 'number' | 'boolean' | 'array'
    description: string
    enum?: string[]
  }
}

// export interface NewFeature {
//   feature_name: string
//   feature_description: string
//   feature_identifier: string
//   feature_parent: string
//   feature_type: 'parent' | 'text' | 'number' | 'enum'
//   gpt_interface: {
//     type: 'string' | 'number' | 'boolean'
//     description: string
//     enum?: string[]
//   }
//   enum_options?: string[]
// }
