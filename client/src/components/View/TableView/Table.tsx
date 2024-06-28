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
      file_name: 'science.1121066.pdf',
      condition_name: 'Independent',
      condition_description:
        'Participants made decisions about which songs to listen to, given only the names of the bands and their songs. They rated the songs and chose whether to download them without any information on the previous choices of others.',
      condition_type: 'control',
      condition_message: 'No',
    },
    {
      id: 2,
      file_name: 'science.1121066.pdf',
      condition_name: 'Social Influence',
      condition_description:
        'Participants could see how many times each song had been downloaded by previous participants. The songs and their download counts were presented in a grid (Experiment 1) or in one column in descending order of popularity (Experiment 2).',
      condition_type: 'treatment',
      condition_message: 'No',
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

  const { socket } = useContext(SocketContext)

  socket.on('connect', () => {
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

  socket.on('status', (data: { status: string; progress: number }) => {
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
      const response = await fetch('/api/run_assistant', {
        method: 'POST',
        body: formData,
        headers: {},
      })
      if (response.ok) {
        const data = await response.json()
        console.log(data)
        const newData = data.result.map((row: Omit<DataRow, 'id'>, index: number) => ({
          id: index + 1,
          file_name: data.path,
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
      <Header fileName='Atlas' />
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
        className={`h-screen w-screen px-4 ${isDragging || isUploading ? 'blur-sm' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className='overflow-x-auto'>
          <table className='table table-xs'>
            <thead>
              <tr>
                <th className='text-base font-bold'></th>
                <th className='text-base font-bold' onClick={() => requestSort('file_name')}>
                  file name
                </th>
                <th className='text-base font-bold' onClick={() => requestSort('condition_name')}>
                  condition name
                </th>
                <th
                  className='text-base font-bold'
                  onClick={() => requestSort('condition_description')}
                >
                  condition description
                </th>
                <th className='text-base font-bold' onClick={() => requestSort('condition_type')}>
                  condition type
                </th>
                <th
                  className='text-base font-bold'
                  onClick={() => requestSort('condition_message')}
                >
                  condition message
                </th>
              </tr>
            </thead>
            <tbody className={isDragging || isUploading ? 'skeleton' : ''}>
              {sortedData.map((row) => (
                <tr key={row.id}>
                  <th>{row.id}</th>
                  <td>{row.file_name}</td>
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
