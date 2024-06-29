import { Socket } from 'socket.io-client'
import { SocketContext } from './SocketProvider'
import { useContext } from 'react'

export const useSocket = (): Socket | null => {
  const context = useContext(SocketContext)

  if (context === null) {
    throw new Error('useSocket must be used within a SocketProvider')
  }

  return context.socket
}
