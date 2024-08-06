import React, { useState, DragEvent, useEffect, useCallback } from 'react'
import { useSocket } from '../../../context/Socket/UseSocket'
import { API_URL } from '../../../service/api'
import ArrageTable from './ArrangeTable'
import { flattenData, Result } from './hooks/data-handler'
import { check_data, get_failed_data } from './hooks/mock-data'

type RunStatus = {
  status: string
  progress: number
  task_id: string
  done: boolean
}

type PaperProcessingStatus = {
  file_name: string
  task_id: string
  status: 'success' | 'failed' | 'inprogress'
}

const Table: React.FC = () => {
  // State
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [data, setData] = useState<Result[]>([check_data])
  const [status, setStatus] = useState<RunStatus>({
    status: '',
    progress: 0,
    task_id: '',
    done: false,
  })
  const [isProcessing, setIsProcessing] = useState<PaperProcessingStatus[]>([])

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

  const onMessage = useCallback(
    (data: { status: string; progress: number; task_id: string; done: boolean }) => {
      setStatus({
        status: data.status,
        progress: Number(data.progress),
        task_id: data.task_id,
        done: data.done,
      })

      if (data.done) {
        getResults(data.task_id).then(() => {
          setIsProcessing((prev) =>
            prev.map((obj) => (obj.task_id === data.task_id ? { ...obj, status: 'success' } : obj)),
          )
        })
      }
    },
    [],
  )

  useEffect(() => {
    if (!socket) {
      return
    }

    socket.on('status', onMessage)

    return () => {
      socket.off('status', onMessage)
    }
  }, [socket, onMessage])

  const getResults = async (task_id: string) => {
    const response = await fetch(
      `${API_URL}/run_assistant?task_id=${task_id}
      `,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      },
    )
    if (response.ok) {
      const new_data = await response.json()
      try {
        flattenData([new_data], true, true, true)
        setData((prev) => prev.map((obj) => (obj.task_id === task_id ? new_data : obj)))
      } catch (error) {
        setData((prev) =>
          prev.map((obj) =>
            obj.task_id === task_id ? get_failed_data(task_id, false, task_id) : obj,
          ),
        )
        console.error('Error parsing data:', error)
      } finally {
        setStatus({ status: '', progress: 0, task_id: '', done: false })
      }
    } else {
      console.error('Error fetching results')
    }
  }

  useEffect(() => {
    if (isProcessing.filter((obj) => obj.status === 'inprogress').length === 0) {
      setIsUploading(false)
    } else {
      setIsUploading(true)
    }
  }, [isProcessing])

  const handleBackend = async (files: FileList) => {
    setIsUploading(true)

    const data = new FormData()
    for (const file of files) {
      data.append('files[]', file, file.name)
    }
    data.append('sid', socket?.id || '')
    data.append('model', 'gpt')

    try {
      const response = await fetch(`${API_URL}/run_assistant`, {
        method: 'POST',
        body: data,
        headers: {},
      })
      if (response.ok) {
        const new_data: { [key: string]: string } = await response.json()
        Object.entries(new_data).forEach(([key, value]) => {
          setIsProcessing((prev) => [
            ...prev,
            {
              file_name: key,
              task_id: value,
              status: 'inprogress',
            },
          ])
          setData((prev) => [...prev, get_failed_data(key, true, value)])
        })
      } else {
        setData((prev) => [...prev, get_failed_data(files[0].name, false)])
      }
    } catch (error) {
      console.error('Error uploading file:', error)
    } finally {
      setStatus({ status: '', progress: 0, task_id: '', done: false })
    }
  }

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    setIsDragging(false)

    const files = e.dataTransfer.files

    await handleBackend(files)
  }

  return (
    <>
      {isDragging && (
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
            />
          </svg>
          <span className='loading loading-dots loading-lg text-gray-400'></span>
          <span className='text-gray-400'>{status.status}</span>
        </div>
      )}
      <main
        className={`h-screen w-screen px-4 ${isDragging ? 'blur-sm' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <ArrageTable result={data} handleBackend={handleBackend} />
        {isUploading && (
          <div className='toast toast-end'>
            <div role='alert' className='alert shadow-lg w-96'>
              <span className='loading loading-spinner loading-md'></span>
              <div>
                <h3 className='font-bold'>Processing papers</h3>
                <div className='text-xs'>{status.status || 'Uploading...'}</div>
              </div>
              <span className=''>
                {isProcessing.filter((obj) => obj.status === 'success').length}/
                {isProcessing.length}
              </span>
            </div>
          </div>
        )}
      </main>
    </>
  )
}

export default Table
