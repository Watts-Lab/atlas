import axios from 'axios'

export const API_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3000/api'

export const WEB_URL =
  process.env.NODE_ENV === 'production' ? 'https://atlas.seas.upenn.edu' : 'http://localhost:5173'

const api = axios.create({
  withCredentials: false,
  baseURL: API_URL,
})

// Request interceptor to attach the token automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// Response interceptor to handle authorization errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the backend returns a 401 (Unauthorized), redirect the user to the login page
    if (error.response && error.response.status === 401) {
      // Clear the token from local storage
      localStorage.removeItem('token')
      window.location.href = '/'
    }
    return Promise.reject(error)
  },
)

export default api
