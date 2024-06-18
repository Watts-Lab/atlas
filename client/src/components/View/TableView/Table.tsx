import React, { useState, DragEvent, useContext, useMemo, useEffect } from 'react'
import Header from '../../Builder/Header'
import { SocketContext } from '../../../context/Socket/SocketProvider'

interface DataRow {
  id: number
  [key: string]: number | string
}

type RunStatus = {
  status: string
  progress: number
}

const Table: React.FC = () => {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof DataRow
    direction: 'ascending' | 'descending'
  } | null>(null)

  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const [data, setData] = useState<DataRow[]>([
    {
      id: 1,
      paper_id: 'A_67a_2021_BehaviouralNudgesIncrease',
      condition_name: 'Quality',
      condition_type: 'something2',
      condition_message: 'Canada',
      condition_description: 'asdsda',
    },
    {
      id: 2,
      paper_id: 'A_67a_2021_BehaviouralNudgesIncrease',
      condition_name: 'Desktop',
      condition_type: 'something',
      condition_message: 'United States',
      condition_description: 'asdsadsad',
    },
  ])

  const requestSort = (key: keyof DataRow) => {
    let direction: 'ascending' | 'descending' = 'ascending'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending'
    }
    setSortConfig({ key, direction })
  }

  const sortedData = React.useMemo(() => {
    if (sortConfig !== null) {
      const sortedArray = [...data].sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1
        }
        return 0
      })
      return sortedArray
    }
    return data
  }, [data, sortConfig])

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const { socket, on } = useContext(SocketContext)

  on('connect', () => {
    console.log('connected')
  })

  const [status, setStatus] = useState<RunStatus>({ status: '', progress: 0 })
  const [pathLength, setPathLength] = useState(0)

  useEffect(() => {
    // Ensure the path element exists before trying to get its length
    const path = document.querySelector<SVGPathElement>('#uploadPath')
    if (path) {
      const length = path.getTotalLength()
      setPathLength(length)
    }
  }, [status])

  const getStrokeDashoffset = () => {
    return pathLength - (pathLength * status.progress) / 100
  }

  on('status', (data: { status: string; progress: number }) => {
    setStatus({ status: data.status, progress: Number(data.progress) })
  })

  useMemo(() => {
    console.log(status)
  }, [status])

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    setIsDragging(false)
    setIsUploading(true)

    const files = e.dataTransfer.files
    const formData = new FormData()
    formData.append('file', files[0])
    formData.append('sid', socket.id ?? '')

    try {
      const response = await fetch('http://localhost:8000/api/run_assistant', {
        method: 'POST',
        body: formData,
        headers: {},
      })
      if (response.ok) {
        const data = await response.json()
        console.log(data)
        const newData = data.result.map((row: Omit<DataRow, 'id'>, index: number) => ({
          id: index + 1,
          paper_id: data.path,
          ...row,
        }))
        setData(newData)
      } else {
        console.error('Upload failed')
      }
    } catch (error) {
      console.error('Error uploading file:', error)
    } finally {
      setIsUploading(false)
      setStatus({ status: '', progress: 0 })
    }
  }

  return (
    <>
      <Header fileName='Workflow-1' />
      {(isDragging || isUploading) && (
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center ${isUploading ? 'z-50' : ''}`}
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            fill='none'
            viewBox='0 0 24 24'
            strokeWidth={1.5}
            stroke='currentColor'
            width={150}
            height={150}
          >
            <path
              className='text-gray-400 h-20 w-20'
              strokeLinecap='round'
              strokeLinejoin='round'
              d='M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z'
            />
            <path
              id='uploadPath'
              className='text-gray-500 h-20 w-20'
              strokeLinecap='round'
              strokeLinejoin='round'
              d='M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z'
              strokeDasharray={pathLength}
              strokeDashoffset={getStrokeDashoffset()}
            />
          </svg>
          <span className='loading loading-dots loading-lg text-gray-400'></span>
          <span className='text-gray-400'>{status.status}</span>
        </div>
      )}
      <main
        className={`h-screen w-screen ${isDragging || isUploading ? 'blur-sm' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className='overflow-x-auto'>
          <table className='table table-xs'>
            <thead>
              <tr>
                <th className='text-base font-bold'>id</th>
                <th className='text-base font-bold' onClick={() => requestSort('paper_id')}>
                  paper_id
                </th>
                <th className='text-base font-bold' onClick={() => requestSort('condition_name')}>
                  condition_name
                </th>
                <th
                  className='text-base font-bold'
                  onClick={() => requestSort('condition_description')}
                >
                  condition_description
                </th>
                <th className='text-base font-bold' onClick={() => requestSort('condition_type')}>
                  condition_type
                </th>
                <th
                  className='text-base font-bold'
                  onClick={() => requestSort('condition_message')}
                >
                  condition_message
                </th>
              </tr>
            </thead>
            <tbody className={isDragging || isUploading ? 'skeleton' : ''}>
              {sortedData.map((row) => (
                <tr key={row.id}>
                  <th>{row.id}</th>
                  <td>{row.paper_id}</td>
                  <td>{row.condition_name}</td>
                  <td>{row.condition_description}</td>
                  <td>{row.condition_type}</td>
                  <td>{row.condition_message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  )
}

export default Table
