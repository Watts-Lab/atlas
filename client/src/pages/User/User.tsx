const User = () => {
  return (
    <div className='bg-gray-100 dark:bg-gray-900 p-4 min-h-screen'>
      {/* <!-- User Info Section --> */}
      <div className='bg-white dark:bg-gray-800 shadow-md rounded p-4 mb-6'>
        <div className='flex justify-between items-center'>
          <div>
            <h2 className='text-xl font-bold dark:text-white'>User: user@example.com</h2>
            <p className='dark:text-gray-300'>Tokens used: 50 | Tokens available: 150</p>
            <p className='dark:text-gray-300'>Projects: 3 | Papers: 10</p>
            <p className='dark:text-gray-300'>
              Papers status: <span className='text-green-500 dark:text-green-400'>Done</span> (5),
              <span className='text-blue-500 dark:text-blue-400'> In Progress</span> (3),
              <span className='text-orange-500 dark:text-orange-400'> Not Started</span> (2)
            </p>
          </div>
        </div>
      </div>

      {/* <!-- Projects Section --> */}
      <div className='bg-white dark:bg-gray-800 shadow-md rounded p-4 mb-6'>
        <h2 className='text-2xl font-bold mb-4 dark:text-white'>Projects</h2>
        <div className='overflow-x-auto'>
          <table className='min-w-full bg-white dark:bg-gray-800 text-left'>
            <thead>
              <tr>
                <th
                  className='py-2 px-4 border-b dark:border-gray-700 dark:text-gray-300'
                  title='Project Name'
                >
                  Project Name
                </th>
                <th
                  className='py-2 px-4 border-b dark:border-gray-700 dark:text-gray-300'
                  title='Project ID'
                >
                  Project ID
                </th>
                <th
                  className='py-2 px-4 border-b dark:border-gray-700 dark:text-gray-300'
                  title='Status of the project (In Progress, Done, Not Started)'
                >
                  Status
                </th>
                <th className='py-2 px-4 border-b dark:border-gray-700'></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className='py-2 px-4 border-b dark:border-gray-700 dark:text-gray-300'>
                  Project Alpha
                </td>
                <td className='py-2 px-4 border-b dark:border-gray-700 text-blue-500'>
                  <a
                    href='https://atlas.seas.upenn.edu/projects/12345'
                    target='_blank'
                    rel='noreferrer'
                  >
                    12345
                  </a>
                </td>
                <td className='py-2 px-4 border-b dark:border-gray-700 dark:text-gray-300'>
                  In Progress
                </td>
                <td className='py-2 px-4 border-b dark:border-gray-700 text-right'>
                  <button className='bg-blue-500 text-white px-4 py-2 rounded'>
                    Add Ground Truth
                  </button>
                </td>
              </tr>
              {/* Add more project rows as needed */}
            </tbody>
          </table>
        </div>
      </div>

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
    </div>
  )
}

export default User
