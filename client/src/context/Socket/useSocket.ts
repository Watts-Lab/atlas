import { useContext } from 'react'
import { SocketContext, SocketContextType } from './SocketProvider'

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}
