import { BookOpen, House, Settings2, SquareTerminal } from 'lucide-react'

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
        {
          title: 'Project Settings',
          url: '/projects/settings',
        },
      ],
    },
    {
      title: 'Documentation',
      url: '/docs',
      icon: BookOpen,
      isActive: true,
      isDefaultOpen: false,
      items: [
        {
          title: 'Introduction',
          url: '/docs/introduction',
        },
        {
          title: 'Get Started',
          url: '/docs/get-started',
        },
        {
          title: 'Tutorials',
          url: '/docs/tutorials',
        },
        {
          title: 'Changelog',
          url: '/docs/changelog',
        },
        {
          title: 'API Reference',
          url: '/docs/api-reference',
        },
      ],
    },
    {
      title: 'Settings',
      url: '#',
      icon: Settings2,
      items: [
        {
          title: 'General',
          url: '#',
        },
        {
          title: 'Team',
          url: '#',
        },
        {
          title: 'Billing',
          url: '#',
        },
        {
          title: 'Limits',
          url: '#',
        },
      ],
    },
  ],
}

export function AppSidebar({
  sidebarOpen,
  ...props
}: React.ComponentProps<typeof Sidebar> & { sidebarOpen: boolean }) {
  const user = {
    name: localStorage.getItem('email')?.split('@')[0] || '',
    email: localStorage.getItem('email') || '',
  }

  const { toggleSidebar } = useSidebar()

  useEffect(() => {
    if (!sidebarOpen) toggleSidebar()
  }, [sidebarOpen])

  return (
    <Sidebar collapsible='icon' {...props}>
      <SidebarContent>
        <NavMain label='Atlas v0.1.4 [Alpha Release]' items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
