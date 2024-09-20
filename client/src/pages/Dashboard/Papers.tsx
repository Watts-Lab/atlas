export type Paper = {
  id: string
  title: string
  file_hash: string
  updated_at: string
}

type PaperProps = {
  papers: Paper[] | []
  currentPage: number
  pageSize: number
  totalPapers: number
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>
}

const Papers = ({ papers, currentPage, pageSize, totalPapers, setCurrentPage }: PaperProps) => {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return 'Invalid date'
    }
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date)
  }

  return (
    <>
      {/* <!-- Papers Section --> */}
      <div className='bg-white dark:bg-gray-800 shadow-md rounded p-4'>
        <h2 className='text-2xl font-bold mb-4 dark:text-white'>Uploaded Papers</h2>
        <div className='overflow-x-auto'>
          <table className='min-w-full bg-white dark:bg-gray-800 text-left'>
            <thead>
              <tr>
                <th
                  className='py-2 px-4 border-b dark:border-gray-700 dark:text-gray-300'
                  title='File Name'
                >
                  Id
                </th>

                <th
                  className='py-2 px-4 border-b dark:border-gray-700 dark:text-gray-300'
                  title='Digital Object Identifier from crossref'
                >
                  Name
                </th>
                <th
                  className='py-2 px-4 border-b dark:border-gray-700 dark:text-gray-300'
                  title='Authors of the paper'
                >
                  Hash
                </th>
                <th
                  className='py-2 px-4 border-b dark:border-gray-700 dark:text-gray-300'
                  title='Status of the paper (Done, In Progress, Not Started)'
                >
                  Created At
                </th>
              </tr>
            </thead>
            <tbody>
              {papers.map((paper) => (
                <tr key={paper.id}>
                  <td className='py-2 px-4 border-b dark:border-gray-700 dark:text-gray-300'>
                    {paper.id}
                  </td>
                  <td className='py-2 px-4 border-b dark:border-gray-700 dark:text-gray-300'>
                    {paper.title}
                  </td>
                  <td className='py-2 px-4 border-b dark:border-gray-700 dark:text-gray-300'>
                    {paper.file_hash}
                  </td>
                  <td className='py-2 px-4 border-b dark:border-gray-700 dark:text-gray-300'>
                    {formatDate(paper.updated_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* <!-- Pagination --> */}
        <div className='flex justify-between items-center mt-4'>
          <button
            onClick={() => setCurrentPage((prev: number) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className='bg-gray-300 dark:bg-gray-700 dark:text-gray-300 text-gray-700 px-4 py-2 rounded'
          >
            Previous
          </button>
          <span className='dark:text-gray-300'>
            Page {currentPage} of {Math.max(Math.ceil(totalPapers / pageSize), 1)}
          </span>
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, Math.ceil(totalPapers / pageSize)))
            }
            disabled={currentPage === Math.ceil(totalPapers / pageSize) || totalPapers === 0}
            className='bg-gray-300 dark:bg-gray-700 dark:text-gray-300 text-gray-700 px-4 py-2 rounded'
          >
            Next
          </button>
        </div>
      </div>
    </>
  )
}

export default Papers
