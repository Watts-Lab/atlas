import { useEffect, useRef, useState } from 'react'
import { createUniverse } from './stars-render'
import { API_URL } from '../../service/api'
import { useNavigate, useParams } from 'react-router-dom'

type Params = {
  email?: string
  magicLink?: string
}

const Galaxy = ({ loggingIn }: { loggingIn?: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const emailRef = useRef<HTMLInputElement | null>(null)

  const params: Params = useParams()
  const navigate = useNavigate()

  const [submitting, setSubmitting] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(loggingIn)

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

  useEffect(() => {
    if (loggingIn) {
      setIsLoggingIn(true)
      fetch(`${API_URL}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: params.email, magic_link: params.magicLink }),
      }).then((res) => {
        if (res.ok) {
          console.log(res)
          localStorage.setItem('token', res.headers.get('Authorization')!)
          navigate('/table')
        }
      })
    }
  }, [loggingIn])

  const submitEmail = async (e: React.FormEvent) => {
    setSubmitting(true)
    e.preventDefault()
    const email = emailRef.current!.value
    await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Something went wrong!')
        }
      })
      .then(await new Promise((resolve) => setTimeout(resolve, 3000)))
      .finally(() => {
        setSubmitting(false)
        navigate('/table')
      })
  }

  return (
    <div className='p-0 m-0 w-full h-full fixed flex justify-center items-center contrast-120'>
      <div className='w-full h-full container-gradient'>
        <div className='w-inherit h-inherit'>
          <canvas ref={canvasRef} id='universe' className='w-full h-full'></canvas>
          <div className='absolute top-1/3 w-full text-center'>
            <h1 className='text-5xl text-gray-50 pb-4'>Atlas</h1>
            <p className='text-base text-gray-50'>
              A simple and fun way to explore the universe of science. <br />
              Sign up now to get started.
            </p>

            {isLoggingIn ? (
              <p className='text-slate-200 pt-4 fade-in'>Authenticating... Please wait.</p>
            ) : null}
            <form onSubmit={submitEmail} className='flex flex-col justify-center items-center'>
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
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Galaxy
