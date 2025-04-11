import { useEffect, useRef, useState } from 'react'
import { createUniverse } from './stars-render'
import { useNavigate, useParams } from 'react-router-dom'
import { LoginForm } from './LoginForm'
import api from '@/service/api'
import { useUser } from '@/context/User/useUser'

type Params = {
  email?: string
  magicLink?: string
}

const Home = ({ loggingIn }: { loggingIn?: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const emailRef = useRef<HTMLInputElement | null>(null)
  const params: Params = useParams()
  const navigate = useNavigate()
  const { email, token, login, logout, updateUser } = useUser()

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [submitting, setSubmitting] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(loggingIn)
  const [loggingInMessage, setLoggingInMessage] = useState('Authenticating... Please wait.')

  useEffect(() => {
    const starDensity = 0.216
    const speedCoeff = 0.03
    const giantColor = '180,184,240'
    const starColor = '226,225,142'
    const cometColor = '226,225,224'
    const cometDisabled = false

    const canva = canvasRef.current!
    const cleanup = createUniverse(
      canva,
      starDensity,
      speedCoeff,
      giantColor,
      starColor,
      cometColor,
      cometDisabled,
    )
    return () => {
      cleanup()
    }
  }, [])

  // Handle immediate magic-link login when "loggingIn" is true
  useEffect(() => {
    if (loggingIn) {
      setIsLoggingIn(true)
      setLoggingInMessage('Authenticating... Please wait.')

      api
        .post(`/validate`, { email: params.email, magic_link: params.magicLink })
        .then((response) => {
          if (response.status === 200) {
            login({
              email: params.email,
              token: response.headers['authorization'],
              credits: response.data.credits,
            })
            navigate('/dashboard')
          } else {
            // ADDED: If invalid magic link
            setLoggingInMessage('Invalid or expired magic link. Please try logging in again.')
            setTimeout(() => {
              setIsLoggingIn(false)
            }, 3000)
          }
        })
    }
  }, [loggingIn])

  // If user *already* has a token in localStorage, validate it and possibly redirect
  useEffect(() => {
    if (!loggingIn && token && email) {
      setIsLoggingIn(true)
      setLoggingInMessage('Authenticating token... Please wait.')

      api.post(`/check`, { email }).then((res) => {
        if (res.status === 200) {
          updateUser({
            credits: res.data.credits,
          })
          navigate('/dashboard')
        } else {
          setLoggingInMessage('Token authentication failed. Please login again.')
          logout()
          setTimeout(() => {
            setIsLoggingIn(false)
          }, 3000)
        }
      })
    }
  }, [email, token])

  // Handle normal login flow via email input
  const submitEmail = async (e: React.FormEvent) => {
    setSubmitting(true)
    e.preventDefault()

    const email = emailRef.current!.value
    await api
      .post(`/login`, { email: email })
      .then((res) => {
        if (res.status !== 200) {
          throw new Error('Something went wrong!')
        }
      })
      .then(await new Promise((resolve) => setTimeout(resolve, 3000)))
      .finally(() => {
        setLoggingInMessage('Check your email for the magic link!')
        setSubmitting(false)
        if (emailRef.current) {
          emailRef.current.value = ''
        }
      })
  }

  return (
    <div className='p-0 m-0 w-full h-full fixed flex justify-center items-center contrast-120'>
      <div className='w-full h-full container-gradient'>
        <div className='w-inherit h-inherit'>
          <canvas ref={canvasRef} id='universe' className='w-full h-full'></canvas>
          <div className='absolute top-1/4 w-full text-center'>
            {/* <form onSubmit={submitEmail} className='flex flex-col justify-center items-center'>
              {submitting ? (
                <p className='text-slate-200 pt-4 fade-in'>Check your email for the magic link!</p>
              ) : (
                <input
                  data-testid='email-input'
                  type='email'
                  placeholder='Email'
                  className='input input-sm w-72 mt-4'
                  ref={emailRef}
                />
              )}

              <button className='mt-3 border rounded border-gray-300 px-2 opacity-40 text-[#edf3fe] transition-opacity duration-400 ease hover:opacity-100 hover:border-white'>
                Sign up / Login
              </button>
            </form> */}
            <div className='w-full max-w-sm mx-auto'>
              <LoginForm emailRef={emailRef} submitEmail={submitEmail} submitting={submitting} />
            </div>
            {isLoggingIn ? <p className='text-slate-200 pt-4 fade-in'>{loggingInMessage}</p> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
