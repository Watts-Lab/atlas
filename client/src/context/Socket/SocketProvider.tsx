/* eslint-disable @typescript-eslint/no-explicit-any */
import { FC, ReactNode, createContext, useEffect, useState } from 'react'
import { URL } from '../../service/socket'
import { Socket, io } from 'socket.io-client'

export interface SocketContextType {
  socket: Socket | null
}

export const SocketContext = createContext<SocketContextType>({ socket: null })

export const SocketProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    const newSocket = io(URL as string)

    const onDisconnect = () => {
      setTimeout(() => {
        const reconnectSocket = io(URL as string)
        setSocket(reconnectSocket)
      }, 1000)
    }

    newSocket.on('disconnect', onDisconnect)

    setSocket(newSocket)

    return () => {
      newSocket.off('disconnect', onDisconnect)
      newSocket.close()
    }
  }, [])

  return <SocketContext.Provider value={{ socket }}>{children}</SocketContext.Provider>
}
