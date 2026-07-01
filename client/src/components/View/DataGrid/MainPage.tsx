import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from './SideBar'
import { Fragment } from 'react/jsx-runtime'

type PageProps = {
  children: React.ReactNode
  breadcrumbs: {
    title: string
    url: string
  }[]
  sidebarOpen?: boolean
  rightSidebar?: React.ReactNode
}

export default function MainPage({
  children,
  breadcrumbs,
  sidebarOpen = true,
  rightSidebar,
}: PageProps) {
  return (
    <SidebarProvider className='h-svh overflow-hidden bg-[#f8fafc] text-[#0b1f3a]'>
      <AppSidebar sidebarOpen={sidebarOpen} />
      <SidebarInset className='min-w-0 bg-[#f8fafc] bg-[linear-gradient(rgba(51,65,85,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(51,65,85,0.035)_1px,transparent_1px)] bg-[size:48px_48px]'>
        <header className='sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 bg-[#f8fafc]/90 backdrop-blur-md transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12'>
          <div className='flex items-center gap-2 px-4'>
            <SidebarTrigger className='-ml-1 rounded-sm text-[#334155] hover:bg-[#eef4fa] hover:text-[#0b1f3a]' />
            {breadcrumbs.length > 0 && (
              <>
                <Separator orientation='vertical' className='mr-2 h-4 bg-[#d6dee8]' />
                <Breadcrumb>
                  <BreadcrumbList className='text-[#64748b]'>
                    {breadcrumbs.map((breadcrumb, index) => (
                      <Fragment key={index}>
                        <BreadcrumbItem>
                          <BreadcrumbLink
                            href={breadcrumb.url}
                            className='font-medium hover:text-[#0b1f3a]'
                          >
                            {breadcrumb.title}
                          </BreadcrumbLink>
                        </BreadcrumbItem>
                        {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                      </Fragment>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              </>
            )}
          </div>
        </header>
        <div className='flex flex-col flex-1 min-w-0 overflow-y-auto'>{children}</div>
      </SidebarInset>
      {rightSidebar}
    </SidebarProvider>
  )
}
