// import { useState } from 'react'
// import { useCallback, useContext } from 'react'
// import { useReactFlow } from '@xyflow/react'
// import { WorkflowContext } from '../../context/Workflow/WorkflowProvider.types'

import { useEffect } from 'react'

interface HeaderProps {
  fileName: string
}

const Header = ({ fileName }: HeaderProps) => {
  // const { saveWorkflow, sendToBackend } = useContext(WorkflowContext)
  // const reactFlow = useReactFlow()

  // const handleSave = useCallback(() => {
  //   const nodes = reactFlow.getNodes()
  //   const edges = reactFlow.getEdges()
  //   saveWorkflow(nodes, edges)

  //   setIsVisible(true)
  //   setTimeout(() => setIsVisible(false), 3000)
  // }, [reactFlow, saveWorkflow])

  // const handleSendToBackend = useCallback(() => {
  //   const nodes = reactFlow.getNodes()
  //   const edges = reactFlow.getEdges()
  //   sendToBackend(nodes, edges)
  // }, [reactFlow, sendToBackend])

  // const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleClickOutsideDropdown = (e: MouseEvent) => {
      const dropdowns = document.querySelectorAll('.dropdown')
      dropdowns.forEach((dropdown) => {
        if (!dropdown.contains(e.target as Node)) {
          // Click was outside the dropdown, close it
          ;(dropdown as HTMLDetailsElement).open = false
        }
      })
    }

    window.addEventListener('click', handleClickOutsideDropdown)

    return () => {
      window.removeEventListener('click', handleClickOutsideDropdown)
    }
  }, [])

  return (
    <div className='navbar bg-base-100'>
      <div className='navbar-start z-10'>
        <div className='flex-none'>
          <ul className='menu menu-horizontal px-1'>
            <li>
              <details className='dropdown'>
                <summary>File</summary>
                <ul className='p-2 bg-base-100 w-40'>
                  <li>
                    <a>Save workflow</a>
                  </li>
                  <li>
                    <a>Open PDF</a>
                  </li>
                  <li>
                    <a href='/files'>Open Markdown</a>
                  </li>
                </ul>
              </details>
            </li>
            <li>
              <details className='dropdown'>
                <summary>Edit</summary>
                <ul className='p-2 bg-base-100 w-40'>
                  <li>
                    <a>Save project</a>
                  </li>
                  <li>
                    <a>Export project</a>
                  </li>
                </ul>
              </details>
            </li>
            <li>
              <details className='dropdown'>
                <summary>Run</summary>
                <ul className='p-2 bg-base-100 w-40'>
                  <li>
                    <a>Run all</a>
                  </li>
                  <li>
                    <a>Run modified only</a>
                  </li>
                </ul>
              </details>
            </li>
          </ul>
        </div>
      </div>
      <div className='navbar-center text-center'>
        <span className='normal-case text-xl'>{fileName}</span>
      </div>
      <div className='navbar-end z-10'>
        <button className='btn btn-ghost btn-circle'>
          <div className='indicator'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='h-5 w-5'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
              />
            </svg>
            <span className='badge badge-xs badge-primary indicator-item'></span>
          </div>
        </button>
      </div>
    </div>
  )
}

export default Header
