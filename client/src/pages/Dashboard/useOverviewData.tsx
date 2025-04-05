import { Papers } from '@/components/View/DataGrid/PapersTable'
import { Projects } from '@/components/View/DataGrid/ProjectsTable'
import api from '@/service/api'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Custom hook to handle fetching of projects and papers data.
 * @param pageSize default number of items to fetch per page
 * @returns { projects, papers, isLoadingProjects, isLoadingPapers }
 */
export default function useOverviewData(pageSize: number = 50) {
  const [projects, setProjects] = useState<Projects[]>([])
  const [papers, setPapers] = useState<Papers[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(false)
  const [isLoadingPapers, setIsLoadingPapers] = useState<boolean>(false)

  const navigate = useNavigate()

  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoadingProjects(true)
      try {
        const response = await api.get(`/v1/projects`)
        if (response.status !== 200) {
          throw new Error('Network response was not ok')
        }
        setProjects(
          response.data.project.map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (project: { id: string; title: string; description: string; papers: any[] }) => {
              return {
                id: project.id,
                name: project.title,
                description: project.description,
                paper_count: project.papers.length,
              } as Projects
            },
          ),
        )
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoadingProjects(false)
      }
    }

    fetchProjects()
  }, [])

  const refetchProjects = useCallback(async () => {
    setIsLoadingProjects(true)
    try {
      const response = await api.get(`/v1/projects`)
      if (response.status !== 200) {
        throw new Error('Network response was not ok')
      }
      setProjects(
        response.data.project.map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (project: { id: string; title: string; description: string; papers: any[] }) => {
            return {
              id: project.id,
              name: project.title,
              description: project.description,
              paper_count: project.papers.length,
            } as Projects
          },
        ),
      )
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoadingProjects(false)
    }
  }, [])

  useEffect(() => {
    const fetchPapers = async (page: number = 1) => {
      setIsLoadingPapers(true)
      try {
        const response = await api.get(`/user/papers?page=${page}&page_size=${pageSize}`)
        if (response.status !== 200) {
          throw new Error('Network response was not ok')
        }

        setPapers(
          response.data.papers.map(
            (paper: { id: string; title: string; file_hash: string; updated_at: string }) => {
              return {
                id: paper.id,
                title: paper.title,
                file_hash: paper.file_hash,
                uploaded_at: paper.updated_at, // If you prefer to rename it
              } as Papers
            },
          ),
        )
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoadingPapers(false)
      }
    }

    fetchPapers(1)
  }, [navigate, pageSize])

  return {
    projects,
    papers,
    isLoadingProjects,
    isLoadingPapers,
    refetchProjects,
  }
}
