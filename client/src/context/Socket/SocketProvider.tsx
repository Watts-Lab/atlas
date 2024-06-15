/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect } from 'react'
import { URL } from '../../service/socket'
import { Socket, io } from 'socket.io-client'

export interface SocketContextType {
  socket: Socket
  connect: () => void
  disconnect: () => void
  on: (event: string, callback: (...args: any[]) => void) => void
  off: (event: string, callback: (...args: any[]) => void) => void
  emit: (event: string, ...args: any[]) => void
}

export const SocketContext = React.createContext<SocketContextType>({
  socket: {} as Socket,
  connect: () => {},
  disconnect: () => {},
  on: () => {},
  off: () => {},
  emit: () => {},
})

const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const socket = React.useMemo(() => io(URL as string), [])

  useEffect(() => {
    console.log('socket:', socket.id)
  }, [socket])

  const connect = useCallback(() => {
    socket.connect()
  }, [socket])

  const disconnect = useCallback(() => {
    socket.disconnect()
  }, [socket])

  const on = useCallback(
    (event: string, callback: (...args: any[]) => void) => {
      socket.on(event, callback)
    },
    [socket],
  )

  const off = useCallback(
    (event: string, callback: (...args: any[]) => void) => {
      socket.off(event, callback)
    },
    [socket],
  )

  const emit = useCallback(
    (event: string, ...args: any[]) => {
      socket.emit(event, ...args)
    },
    [socket],
  )

  return (
    <SocketContext.Provider
      value={{
        socket,
        connect,
        disconnect,
        on,
        off,
        emit,
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}

export default SocketProvider
