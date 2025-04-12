import axios from 'axios'

export const API_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3000/api'

export const WEB_URL =
  process.env.NODE_ENV === 'production' ? 'https://atlas.seas.upenn.edu' : 'http://localhost:5173'

const api = axios.create({
  withCredentials: true,
  baseURL: API_URL,
})

// Response interceptor to handle authorization errors globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      try {
        await api.post('/logout')
      } catch (logoutErr) {
        console.warn('Logout failed:', logoutErr)
      }
      window.location.href = '/'
    }
    return Promise.reject(error)
  },
)

export default api
