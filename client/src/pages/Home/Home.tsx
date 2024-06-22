import Login from '../../components/View/Login/Login'

import icon from '../../../public/icon.svg'
import useFetch from '../../service/useFetch'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

type HomeProps = {
  loggingIn?: boolean
}

const Home = ({ loggingIn }: HomeProps) => {
  const params = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState<boolean>(false)

  if (loggingIn) {
    if (params.magicLink) {
      const { data, loading } = useFetch('http://localhost:8000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ magicLink: params.magicLink }),
      })
      setLoading(loading)
      if (data) {
        localStorage.setItem('token', data.token)
        navigate('/dashboard')
      }
    }
  } else {
    const token = localStorage.getItem('token')
    if (token) {
      navigate('/dashboard')
    }
  }

  return (
    <div className='flex flex-col items-center justify-center h-screen'>
      <h1 data-testid='home-h1' className='text-4xl text-center'>
        Atlas
      </h1>
      <img className='w-20 h-20 py-4' src={icon} alt='icon' />

      {loading ? (
        <>
          <p className='text-center py-3'>Authenticating... Please wait.</p>
          <span className='loading loading-lg'></span>
        </>
      ) : (
        <>
          <p className='text-center py-3'>
            Enter your email to get started. We&apos;ll send you a link to sign in.
          </p>
          <Login />
        </>
      )}
    </div>
  )
}

export default Home
