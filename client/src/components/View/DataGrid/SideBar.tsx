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
      items: [],
    },
    {
      title: 'Projects',
      url: '#',
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: 'All Projects',
          url: '#',
        },
        {
          title: 'Create Project',
          url: '#',
        },
        {
          title: 'Project Settings',
          url: '#',
        },
      ],
    },
    {
      title: 'Documentation',
      url: '#',
      icon: BookOpen,
      items: [
        {
          title: 'Introduction',
          url: '#',
        },
        {
          title: 'Get Started',
          url: '#',
        },
        {
          title: 'Tutorials',
          url: '#',
        },
        {
          title: 'Changelog',
          url: '#',
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
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
