import Papers from './Papers'
import Projects from './Projects'

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
          </div>
        </div>
      </div>

      <Projects projects={[]} />
      <Papers papers={[]} />
    </div>
  )
}

export default User
