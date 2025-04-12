import React, { createContext, useCallback, useState } from 'react'
import api from '@/service/api'

export type UserDetails = {
  loggedIn: boolean
  email: string | null
  credits: number
}

export interface UserContextType {
  user: UserDetails
  login: (credentials: { email: string }) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<UserDetails>
  updateUser: (updates: Partial<UserDetails>) => void
}

const initialUser: UserDetails = {
  loggedIn: false,
  email: null,
  credits: 0,
}

export const UserContext = createContext<UserContextType>({
  user: initialUser,
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => initialUser,
  updateUser: () => {},
})

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDetails>(initialUser)

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get('/check')
      if (data.loggedIn) {
        setUser({
          loggedIn: true,
          email: data.email,
          credits: data.credits,
        })
        return data
      } else {
        setUser(initialUser)
        return initialUser
      }
    } catch (error) {
      setUser(initialUser)
      return initialUser
    }
  }, [])

  const login = useCallback(
    async (credentials: { email: string }) => {
      try {
        const response = await api.post('/login', credentials)
        if (response.status === 200) {
          await refreshUser()
        }
      } catch (error) {
        console.error('Login error', error)
        throw error
      }
    },
    [refreshUser],
  )

  const logout = useCallback(async () => {
    try {
      await api.post('/logout')
      setUser(initialUser)
    } catch (error) {
      console.error('Logout error', error)
      throw error
    }
  }, [])

  const updateUser = useCallback((updates: Partial<UserDetails>) => {
    setUser((prev) => ({ ...prev, ...updates }))
  }, [])

  const value = { user, login, logout, refreshUser, updateUser }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}
