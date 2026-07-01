import { ChevronRight, type LucideIcon } from 'lucide-react'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Link, useLocation } from 'react-router-dom'

const isCurrentSection = (pathname: string, url: string) => {
  if (url === '#' || url.startsWith('/docs')) return false
  if (url === '/dashboard') return pathname === url
  return pathname === url || pathname.startsWith(`${url}/`)
}

const isCurrentPage = (pathname: string, url: string) => {
  if (url === '#' || url.startsWith('/docs')) return false
  return pathname === url
}

export function NavMain({
  label,
  items,
}: {
  label: string
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    isDefaultOpen?: boolean
    external?: boolean
    items?: {
      title: string
      url: string
      external?: boolean
    }[]
  }[]
}) {
  const { toggleSidebar, open } = useSidebar()
  const { pathname } = useLocation()

  return (
    <SidebarGroup>
      <SidebarGroupLabel className='px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]'>
        {label}
      </SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const itemIsActive =
            isCurrentSection(pathname, item.url) ||
            Boolean(item.items?.some((subItem) => isCurrentPage(pathname, subItem.url)))

          return item.items?.length !== 0 ? (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.isDefaultOpen}
              className='group/collapsible'
              disabled={!item.isActive}
              onClick={(evnt) => {
                if (!open) {
                  evnt.stopPropagation()
                  toggleSidebar()
                }
              }}
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={itemIsActive}
                    className='rounded-sm text-[#334155] hover:bg-[#eef4fa] hover:text-[#0b1f3a] data-[active=true]:bg-[#0b1f3a] data-[active=true]:text-white'
                  >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight className='ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => {
                      const subItemIsActive = isCurrentPage(pathname, subItem.url)

                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={subItemIsActive}
                            className='rounded-sm text-[#475569] hover:bg-[#eef4fa] hover:text-[#0b1f3a] data-[active=true]:bg-[#eef4fa] data-[active=true]:font-medium data-[active=true]:text-[#0b1f3a]'
                          >
                            {subItem.external ? (
                              <a href={subItem.url}>
                                <span>{subItem.title}</span>
                              </a>
                            ) : (
                              <Link to={subItem.url}>
                                <span>{subItem.title}</span>
                              </Link>
                            )}
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ) : (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.title}
                asChild
                isActive={itemIsActive}
                className='rounded-sm text-[#334155] hover:bg-[#eef4fa] hover:text-[#0b1f3a] data-[active=true]:bg-[#0b1f3a] data-[active=true]:text-white'
              >
                {item.external ? (
                  <a href={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </a>
                ) : (
                  <Link to={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
