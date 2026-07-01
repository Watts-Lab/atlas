import { BookOpen, House, Layers, Settings2, SquareTerminal } from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { NavMain } from './NavMain'
import { NavUser } from './NavUser'
import { useEffect } from 'react'
import { useUser } from '@/context/User/useUser'

const data = {
  navMain: [
    {
      title: 'Dashboard',
      url: '/dashboard',
      icon: House,
      isActive: true,
      isDefaultOpen: true,
      items: [],
    },
    {
      title: 'Projects',
      url: '#',
      icon: SquareTerminal,
      isActive: true,
      isDefaultOpen: true,
      items: [
        {
          title: 'All Projects',
          url: '/projects',
        },
        {
          title: 'Create Project',
          url: '/projects/create',
        },
        // {
        //   title: 'Project Settings',
        //   url: '/projects/settings',
        // },
      ],
    },
    {
      title: 'Features',
      url: '/features',
      icon: Layers,
      isActive: true,
      isDefaultOpen: true,
      items: [
        {
          title: 'Explorer',
          url: '/features/explorer',
        },
        {
          title: 'Create Feature',
          url: '/features/create',
        },
      ],
    },
    {
      title: 'Documentation',
      url: '/docs/',
      icon: BookOpen,
      isActive: true,
      isDefaultOpen: true,
      external: true,
      items: [],
    },
    {
      title: 'Settings',
      url: '#',
      icon: Settings2,
      isActive: true,
      isDefaultOpen: true,
      items: [
        {
          title: 'Usage & Keys',
          url: '/settings/usage',
        },
        {
          title: 'API Keys',
          url: '/settings/api-keys',
        },
      ],
    },
  ],
}

export function AppSidebar({
  sidebarOpen,
  ...props
}: React.ComponentProps<typeof Sidebar> & { sidebarOpen: boolean }) {
  const { user, refreshUser } = useUser()

  const parsedUser = {
    email: user.email ?? '',
  }

  const { toggleSidebar } = useSidebar()

  useEffect(() => {
    if (!sidebarOpen) toggleSidebar()
  }, [sidebarOpen])

  useEffect(() => {
    if (!user.email) {
      refreshUser()
    }
  }, [refreshUser, user.email])

  return (
    <Sidebar collapsible='icon' className='border-[#d6dee8]' {...props}>
      <SidebarContent className='px-1 py-2'>
        <NavMain label='Atlas v0.1.4 [Alpha Release]' items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={parsedUser} />
      </SidebarFooter>
      <SidebarRail className='hover:after:bg-[#8aa3bf]' />
    </Sidebar>
  )
}
