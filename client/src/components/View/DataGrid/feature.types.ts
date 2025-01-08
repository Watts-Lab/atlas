export type Feature = {
  id: string
  feature_name: string
  feature_description: string
  feature_identifier: string
  trail: string
  selected?: boolean
}

export type NewFeature = Omit<Feature, 'id' | 'trail'> & {
  feature_name: string
  feature_identifier: string
  feature_description: string
  gpt_interface: {
    type: 'string' | 'number' | 'boolean'
    description: string
    enum?: string[]
  }
}
