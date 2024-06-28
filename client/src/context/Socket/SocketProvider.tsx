/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { FC, ReactNode, createContext } from 'react'
import { URL } from '../../service/socket'
import { Socket, io } from 'socket.io-client'

export interface SocketContextType {
  socket: Socket
}

const createSocketState = () => {
  const socket = React.useMemo(() => io(URL as string), [])

  return { socket }
}

export const SocketContext = createContext<SocketContextType>({ socket: {} as Socket })

export const SocketProvider: FC<{ children: ReactNode }> = ({ children }) => (
  <SocketContext.Provider value={createSocketState()}>{children}</SocketContext.Provider>
)
