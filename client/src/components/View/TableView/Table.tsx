import React, { useState, DragEvent, useEffect, useCallback } from 'react'
import Header from '../../Builder/Header'
import { useSocket } from '../../../context/Socket/UseSocket'
import { API_URL } from '../../../service/api'
import ArrageTable from './ArrangeTable'
import { Result } from './hooks/data-handler'
import { check_data } from './hooks/mock-data'

type RunStatus = {
  status: string
  progress: number
}

const Table: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const [data, setData] = useState<Result>(check_data)

  const [status, setStatus] = useState<RunStatus>({ status: '', progress: 0 })
  const [pathLength, setPathLength] = useState(0)

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const socket = useSocket()

  const onMessage = useCallback((data: { status: string; progress: number }) => {
    setStatus({ status: data.status, progress: Number(data.progress) })
  }, [])

  useEffect(() => {
    if (!socket) {
      return
    }

    socket.on('status', onMessage)

    return () => {
      socket.off('status', onMessage)
    }
  }, [socket, onMessage])

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

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    setIsDragging(false)
    setIsUploading(true)

    const files = e.dataTransfer.files
    const formData = new FormData()
    formData.append('file', files[0])
    formData.append('sid', socket?.id || '')

    try {
      const response = await fetch(`${API_URL}/run_assistant`, {
        method: 'POST',
        body: formData,
        headers: {},
      })
      if (response.ok) {
        const new_data = await response.json()
        setData({ ...new_data })
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
        <ArrageTable result={data} />
      </main>
    </>
  )
}

export default Table
