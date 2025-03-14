import { SocketContext, SocketContextType } from './SocketProvider'
import { useContext } from 'react'

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext)

  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider')
  }

  return context
}
