import Login from '../../components/View/Login/Login'

import icon from '../../icons/icon.svg'

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { API_URL } from '../../service/api'

type HomeProps = {
  loggingIn?: boolean
}

type Params = {
  email?: string
  magicLink?: string
}

type FetchDataResponse = {
  token: string
}

const Home = ({ loggingIn }: HomeProps) => {
  const params: Params = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    const fetchData = async (): Promise<FetchDataResponse | null> => {
      setLoading(true)

      try {
        const response = await fetch(`${API_URL}/api/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: params.email, magic_link: params.magicLink }),
        })

        if (!response.ok) {
          throw new Error('Network response was not ok')
        }

        const data = await response.json()
        return data
      } catch (error: unknown) {
        console.error('Error logging in:', error)
        return null
      } finally {
        setLoading(false)
      }
    }

    const executeLogin = async () => {
      if (loggingIn && params.magicLink) {
        const data = await fetchData()

        if (data) {
          localStorage.setItem('token', data.token)
          navigate('/dashboard')
        }
      } else {
        const token = localStorage.getItem('token')
        if (token) {
          navigate('/dashboard')
        }
      }
    }

    executeLogin()
  }, [loggingIn, params.magicLink, navigate, params.email])

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
