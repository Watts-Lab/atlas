type Paper = {
  fileName: string
  title: string
  doi: string
  authors: string
  status: string
}

type PaperProps = {
  papers: Paper[] | []
}

const Papers = ({ papers }: PaperProps) => {
  console.log('Error logging in:', papers)
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
                  File Name
                </th>
                <th
                  className='py-2 px-4 border-b dark:border-gray-700 dark:text-gray-300'
                  title='Title of the paper from GPT agent'
                >
                  Title
                </th>
                <th
                  className='py-2 px-4 border-b dark:border-gray-700 dark:text-gray-300'
                  title='Digital Object Identifier from crossref'
                >
                  DOI
                </th>
                <th
                  className='py-2 px-4 border-b dark:border-gray-700 dark:text-gray-300'
                  title='Authors of the paper'
                >
                  Authors
                </th>
                <th
                  className='py-2 px-4 border-b dark:border-gray-700 dark:text-gray-300'
                  title='Status of the paper (Done, In Progress, Not Started)'
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className='py-2 px-4 border-b dark:border-gray-700 dark:text-gray-300'>
                  paper1.pdf
                </td>
                <td className='py-2 px-4 border-b dark:border-gray-700 dark:text-gray-300'>
                  Exploring AI
                </td>
                <td className='py-2 px-4 border-b dark:border-gray-700 dark:text-gray-300'>
                  10.1234/ai.2024
                </td>
                <td className='py-2 px-4 border-b dark:border-gray-700 dark:text-gray-300'>
                  John Doe, Jane Smith
                </td>
                <td className='py-2 px-4 border-b dark:border-gray-700 dark:text-gray-300'>Done</td>
              </tr>
              {/* Add more paper rows as needed */}
            </tbody>
          </table>
        </div>

        {/* <!-- Pagination --> */}
        <div className='flex justify-between items-center mt-4'>
          <button className='bg-gray-300 dark:bg-gray-700 dark:text-gray-300 text-gray-700 px-4 py-2 rounded'>
            Previous
          </button>
          <span className='dark:text-gray-300'>Page 1 of 1</span>
          <button className='bg-gray-300 dark:bg-gray-700 dark:text-gray-300 text-gray-700 px-4 py-2 rounded'>
            Next
          </button>
        </div>
      </div>
    </>
  )
}

export default Papers
