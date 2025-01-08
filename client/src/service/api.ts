import axios from 'axios'

export const API_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3000/api'
export const WEB_URL =
  process.env.NODE_ENV === 'production' ? 'https://atlas.seas.upenn.edu' : 'http://localhost:5173'

export default axios.create({
  withCredentials: false,
  baseURL: API_URL,
})
