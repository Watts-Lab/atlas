import { useEffect, useState } from 'react'
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
      trail = trail.replace(/\./g, ' → ')
      // trail = trail.split('.').reverse().join(' ← ')
      return {
        id: feature.id,
        feature_name: feature.feature_name,
        feature_description: feature.feature_description,
        feature_identifier: feature.feature_identifier,
        feature_identifier_spaced: feature.feature_identifier.replace(/\./g, ' '),
        trail,
        selected: false,
      }
    },
  )
}

export function useFeatures() {
  const [features, setFeatures] = useState<Feature[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadFeatures = async () => {
      setLoading(true)
      const loadedFeatures = await fetchFeatures()
      setFeatures(loadedFeatures)
      setLoading(false)
    }
    loadFeatures()
  }, [])

  return { features, loading }
}

export const addFeature = async (feature: NewFeature): Promise<Feature> => {
  const response = await api.post('/features', feature)
  const addedFeature = response.data.feature
  return {
    ...addedFeature,
    trail: addedFeature.feature_identifier.replace(/\./g, ' → '),
  }
}
