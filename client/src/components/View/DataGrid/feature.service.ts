import api from '../../../service/api'
import { Feature, NewFeature } from './feature.types'

export const fetchFeatures = async (): Promise<Feature[]> => {
  const response = await api.get('/features')
  return response.data.features.map(
    (feature: {
      id: string
      feature_name: string
      feature_description: string
      feature_identifier: string
    }) => {
      let trail = feature.feature_identifier
      if (trail.endsWith('.parent')) {
        trail = trail.replace('.parent', '')
      }
      // reverse trail : trail.split('.').reverse().join(' ← ')
      // trail = trail.replace(/\./g, ' → ')
      trail = trail.split('.').reverse().join(' ← ')
      return {
        id: feature.id,
        feature_name: feature.feature_name,
        feature_description: feature.feature_description,
        feature_identifier: feature.feature_identifier,
        trail,
        selected: false,
      }
    },
  )
}

export const addFeature = async (feature: NewFeature): Promise<Feature> => {
  const response = await api.post('/features', feature)
  const addedFeature = response.data.feature
  return {
    ...addedFeature,
    trail: addedFeature.feature_identifier.replace(/\./g, ' → '),
  }
}
