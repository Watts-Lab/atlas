import { useState, useEffect, useCallback, createContext } from 'react'

export type UserDetails = {
  email: string | null
  token: string | null
  credits: number
}

export interface UserContextType {
  email: string | null
  token: string | null
  credits: number
  login: (userData: Partial<UserDetails>) => void
  logout: () => void
  updateUser: (updates: Partial<UserDetails>) => void
}

// Default state for a logged-out user.
const initialState = {
  email: null,
  token: null,
  credits: 0,
}

export const UserContext = createContext<UserContextType>(initialState as UserContextType)

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const [email, setEmail] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [credits, setCredits] = useState<number>(0)

  // Load user data from localStorage when the component mounts.
  useEffect(() => {
    const token = localStorage.getItem('token')
    const email = localStorage.getItem('email')
    const credits = localStorage.getItem('credits')
    if (token && email) {
      setToken(token)
      setEmail(email)
      setCredits(credits ? parseInt(credits, 10) : 0)
    }
  }, [])

  const login = (userData: Partial<UserDetails>) => {
    const updatedUser: UserDetails = {
      email: userData.email || null,
      token: userData.token || null,
      credits: userData.credits !== undefined ? userData.credits : 0,
    }

    if (updatedUser.token) localStorage.setItem('token', updatedUser.token)
    if (updatedUser.email) localStorage.setItem('email', updatedUser.email)
    localStorage.setItem('credits', updatedUser.credits.toString())
  }

  // logout() clears user session both from state and localStorage.
  const logout = useCallback(() => {
    setEmail(null)
    setToken(null)
    setCredits(0)
    // Clear localStorage to remove user data.
    localStorage.removeItem('token')
    localStorage.removeItem('email')
    localStorage.removeItem('credits')
  }, [])

  // Optional function to update user details if needed.
  const updateUser = (updates: Partial<UserDetails>) => {
    const updatedUser = {
      email: updates.email || email,
      token: updates.token || token,
      credits: updates.credits !== undefined ? updates.credits : credits,
    }

    // Update localStorage with new user details.
    if (updatedUser.token) localStorage.setItem('token', updatedUser.token)
    if (updatedUser.email) localStorage.setItem('email', updatedUser.email)
    localStorage.setItem('credits', updatedUser.credits.toString())

    setEmail(updatedUser.email)
    setToken(updatedUser.token)
    setCredits(updatedUser.credits)
  }

  const value: UserContextType = {
    email,
    token,
    credits,
    login,
    logout,
    updateUser,
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}
