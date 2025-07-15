export type Feature = {
  id: string
  feature_name: string
  feature_description: string
  feature_identifier: string
  feature_type: 'text' | 'number' | 'boolean' | 'enum' | 'parent'
  feature_prompt: string
  feature_enum_options: string[]
  feature_identifier_spaced: string
  trail: string
  selected?: boolean
  created_by: 'user' | 'provider'
}

export type NewFeature = {
  feature_name: string
  feature_identifier: string
  feature_parent: string
  feature_description: string
  feature_type: 'text' | 'number' | 'boolean' | 'enum' | 'parent'
  feature_prompt: string
  enum_options?: string[]
}
