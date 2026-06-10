import api from '../../../service/api'
import type { InclusionCriteria, RuleNode } from './inclusionCriteria.types'

export async function fetchCriteria(projectId: string): Promise<InclusionCriteria[]> {
  const res = await api.get(`/projects/${projectId}/inclusion-criteria`)
  return res.data.criteria as InclusionCriteria[]
}

export async function createCriteria(
  projectId: string,
  name: string,
  description: string,
  formula: RuleNode,
): Promise<InclusionCriteria> {
  const res = await api.post(`/projects/${projectId}/inclusion-criteria`, {
    name,
    description,
    formula,
  })
  return res.data.criteria as InclusionCriteria
}

export async function updateCriteria(
  projectId: string,
  criteriaId: string,
  updates: Partial<{ name: string; description: string; formula: RuleNode }>,
): Promise<InclusionCriteria> {
  const res = await api.put(`/projects/${projectId}/inclusion-criteria/${criteriaId}`, updates)
  return res.data.criteria as InclusionCriteria
}

export async function deleteCriteria(projectId: string, criteriaId: string): Promise<void> {
  await api.delete(`/projects/${projectId}/inclusion-criteria/${criteriaId}`)
}
