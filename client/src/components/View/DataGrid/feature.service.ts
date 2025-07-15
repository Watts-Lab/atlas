import { useEffect, useState } from 'react'
import api from '../../../service/api'
import { Feature, NewFeature } from './feature.types'

export const featureTypeMap: Record<'string' | 'number' | 'array' | 'integer', string> = {
  string: 'text',
  number: 'number',
  array: 'parent',
  integer: 'number',
}

export const fetchFeatures = async (): Promise<Feature[]> => {
  const response = await api.get('/features')
  return response.data.features.map(
    (feature: {
      id: string
      feature_name: string
      feature_description: string
      feature_identifier: string
      feature_type: 'string' | 'number' | 'array' | 'integer'
      feature_prompt: string
      feature_enum_options: string[]
      created_by: 'user' | 'provider'
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
        feature_type:
          (feature.feature_enum_options?.length ?? 0) > 0 &&
          featureTypeMap[feature.feature_type] === 'text'
            ? 'enum'
            : featureTypeMap[feature.feature_type] || 'text',
        feature_prompt: feature.feature_prompt,
        feature_enum_options: feature.feature_enum_options || [],
        feature_identifier_spaced: feature.feature_identifier.replace(/\./g, ' '),
        trail,
        selected: false,
        created_by: feature.created_by,
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
