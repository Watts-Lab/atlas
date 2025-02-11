import { useNavigate } from 'react-router-dom'
import { API_URL, WEB_URL } from '../../service/api'

export type Project = {
  id: number
  name: string
  description: string
  papers: number
}

type ProjectsProps = {
  projects: Project[] | []
}

const Projects = ({ projects }: ProjectsProps) => {
  const navigate = useNavigate()

  const handleNewProject = async () => {
    const token = localStorage.getItem('token') || ''

    if (!token) {
      navigate('/login')
    }

    await fetch(`${API_URL}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    })
      .then(async (response) => {
        if (response.ok) {
          const new_data = await response.json()
          navigate(`/projects/${new_data.project_id}`)
        } else {
          throw new Error('Network response was not ok')
        }
      })
      .catch((err) => {
        console.error(err)
      })
  }

  return (
    <>
      {/* <!-- Projects Section --> */}
      <div className='bg-white dark:bg-gray-800 shadow-md rounded p-4 mb-6 relative'>
        <h2 className='text-2xl font-bold mb-4 dark:text-white'>Projects</h2>

        {/* Add the "Create New Project" button here */}
        <button
          onClick={handleNewProject}
          className='absolute top-4 right-4 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600'
        >
          Create New Project
        </button>

        <div className='overflow-x-auto'>
          <table className='min-w-full bg-white dark:bg-gray-800 text-left'>
            <thead>
              <tr>
                <th
                  className='py-2 px-4 border-b dark:border-gray-700 dark:text-gray-300'
                  title='Project Name'
                >
                  Name
                </th>
                {/* <th
                  className='py-2 px-4 border-b dark:border-gray-700 dark:text-gray-300'
                  title='Project Description'
                >
                  Description
                </th> */}
                <th
                  className='py-2 px-4 border-b dark:border-gray-700 dark:text-gray-300'
                  title='Status of the project (In Progress, Done, Not Started)'
                >
                  Papers in project
                </th>
                <th
                  className='py-2 px-4 border-b dark:border-gray-700 dark:text-gray-300'
                  title='Link'
                ></th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td className='py-2 px-4 border-b dark:border-gray-700 dark:text-gray-300'>
                    {project.name}
                  </td>
                  {/* <td className='py-2 px-4 border-b dark:border-gray-700 dark:text-gray-300'>
                    {project.description}
                  </td> */}
                  <td className='py-2 px-4 border-b dark:border-gray-700 dark:text-gray-300'>
                    {project.papers} Papers
                    {/* <span className='text-green-500 dark:text-green-400'>Done</span> (5),
                    <span className='text-blue-500 dark:text-blue-400'> In Progress</span> (3),
                    <span className='text-orange-500 dark:text-orange-400'> Not Started</span> (2) */}
                  </td>
                  <td className='py-2 px-4 border-b dark:border-gray-700 dark:text-gray-300 text-right'>
                    <a
                      href={`${WEB_URL}/projects/${project.id}`}
                      target='_blank'
                      rel='noreferrer'
                      className='text-blue-500 dark:text-blue-400'
                    >
                      {`${WEB_URL}/projects/${project.id}`}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

export default Projects
