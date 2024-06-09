import React, { useEffect, useState } from 'react'
import Header from '../components/Builder/Header'

interface DataRow {
  id: number
  paper_id: string
  condition_name: string
  condition_description: string
  condition_type: string
  condition_message: string
}

const Table: React.FC = () => {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof DataRow
    direction: 'ascending' | 'descending'
  } | null>(null)

  const data: DataRow[] = [
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
  ]

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('https://api.example.com/data')
        const jsonData = await response.json()
        // setData(jsonData)
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }

    fetchData()
  }, [])

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

  return (
    <>
      <Header fileName='Workflow-1' />
      <div className='overflow-x-auto'>
        <table className='table table-xs'>
          <thead>
            <tr>
              <th></th>
              <th onClick={() => requestSort('paper_id')}>paper_id</th>
              <th onClick={() => requestSort('condition_name')}>condition_name</th>
              <th onClick={() => requestSort('condition_description')}>condition_description</th>
              <th onClick={() => requestSort('condition_type')}>condition_type</th>
              <th onClick={() => requestSort('condition_message')}>condition_message</th>
            </tr>
          </thead>
          <tbody>
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
          {/* <tfoot>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Job</th>
              <th>Company</th>
              <th>Location</th>
              <th>Last Login</th>
              <th>Favorite Color</th>
            </tr>
          </tfoot> */}
        </table>
      </div>
    </>
  )
}

export default Table
