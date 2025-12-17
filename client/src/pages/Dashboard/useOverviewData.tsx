import { Papers } from '@/components/View/DataGrid/PapersTable'
import { Projects } from '@/components/View/DataGrid/ProjectsTable'
import api from '@/service/api'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export type RecentlyViewedProject = {
  project_id: string
  viewed_at: string
  project: {
    id: string
    title: string
    description: string
    updated_at: string | null
    is_owner: boolean
  } | null
  exists: boolean
}

export default function useOverviewData(pageSize: number = 50) {
  const [projects, setProjects] = useState<Projects[]>([])
  const [papers, setPapers] = useState<Papers[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(false)
  const [isLoadingPapers, setIsLoadingPapers] = useState<boolean>(false)

  const navigate = useNavigate()

  const mergeProjectsWithRecentlyViewed = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    projectsList: any[],
    recentlyViewed: RecentlyViewedProject[],
  ): Projects[] => {
    // Create a map of recently viewed data by project_id
    const recentlyViewedMap = new Map<string, RecentlyViewedProject>()
    recentlyViewed.forEach((rv) => {
      recentlyViewedMap.set(rv.project_id, rv)
    })

    // Map own projects and include last_viewed if it was recently viewed
    const ownProjects = projectsList.map(
      (project: {
        id: string
        title: string
        description: string
        papers: unknown[]
        results: { id: string; finished: boolean; paper_id: string }[]
      }) => {
        const uniquePaperIds = Array.from(new Set(project.results.map((result) => result.paper_id)))
        const recentView = recentlyViewedMap.get(project.id)

        return {
          id: project.id,
          name: project.title,
          description: project.description,
          paper_count: uniquePaperIds.length,
          results: project.results,
          is_owner: true,
          last_viewed: recentView?.viewed_at || null,
          exists: true,
        } as Projects
      },
    )

    // Add recently viewed projects that are NOT owned by the user
    const ownProjectIds = new Set(ownProjects.map((p) => p.id))
    const collaboratorProjects = recentlyViewed
      .filter((rv) => !ownProjectIds.has(rv.project_id) && rv.exists && rv.project)
      .map(
        (rv) =>
          ({
            id: rv.project_id,
            name: rv.project?.title || 'Deleted Project',
            description: rv.project?.description || '',
            paper_count: 0,
            results: [],
            is_owner: false,
            last_viewed: rv.viewed_at,
            exists: rv.exists,
          }) as Projects,
      )

    return [...ownProjects, ...collaboratorProjects]
  }

  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoadingProjects(true)
      try {
        const response = await api.get(`/v1/projects`)
        if (response.status !== 200) {
          throw new Error('Network response was not ok')
        }

        const recentlyViewed: RecentlyViewedProject[] = response.data.recently_viewed || []
        const mergedProjects = mergeProjectsWithRecentlyViewed(
          response.data.project,
          recentlyViewed,
        )

        setProjects(mergedProjects)
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

      const recentlyViewed: RecentlyViewedProject[] = response.data.recently_viewed || []
      const mergedProjects = mergeProjectsWithRecentlyViewed(response.data.project, recentlyViewed)

      setProjects(mergedProjects)
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
            (
              paper: { id: string; title: string; file_hash: string; updated_at: string },
              index: number,
            ) => {
              return {
                id: String(index + 1),
                title: paper.title,
                file_hash: paper.file_hash,
                uploaded_at: paper.updated_at,
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
