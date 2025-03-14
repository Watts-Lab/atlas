// SocketProvider.tsx
import { FC, ReactNode, createContext, useEffect, useState } from 'react'
import { URL } from '../../service/socket'
import { Socket, io } from 'socket.io-client'

export interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  error: Error | null
}

// Initial context state
const initialState: SocketContextType = {
  socket: null,
  isConnected: false,
  error: null,
}

export const SocketContext = createContext<SocketContextType>(initialState)

export const SocketProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // socket with reconnection options
    const newSocket = io(URL as string, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    })

    // Connection listeners
    const onConnect = () => {
      setIsConnected(true)
      setError(null)
    }

    const onDisconnect = (reason: string) => {
      setIsConnected(false)
      console.log(`Socket disconnected: ${reason}`)
    }

    const onError = (err: Error) => {
      setError(err)
      console.error('Socket error:', err)
    }

    // event listeners
    newSocket.on('connect', onConnect)
    newSocket.on('disconnect', onDisconnect)
    newSocket.on('connect_error', onError)

    setSocket(newSocket)

    // Clean up
    return () => {
      newSocket.off('connect', onConnect)
      newSocket.off('disconnect', onDisconnect)
      newSocket.off('connect_error', onError)
      newSocket.close()
    }
  }, [])

  return (
    <SocketContext.Provider value={{ socket, isConnected, error }}>
      {children}
    </SocketContext.Provider>
  )
}
