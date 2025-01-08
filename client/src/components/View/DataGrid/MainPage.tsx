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
}

export default function MainPage({ children, breadcrumbs, sidebarOpen = true }: PageProps) {
  return (
    <SidebarProvider>
      <AppSidebar sidebarOpen={sidebarOpen} />
      <SidebarInset>
        <header className='flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12'>
          <div className='flex items-center gap-2 px-4'>
            <SidebarTrigger className='-ml-1' />
            {breadcrumbs.length > 0 && (
              <>
                <Separator orientation='vertical' className='mr-2 h-4' />
                <Breadcrumb>
                  <BreadcrumbList>
                    {breadcrumbs.map((breadcrumb, index) => (
                      <Fragment key={index}>
                        <BreadcrumbItem>
                          <BreadcrumbLink href={breadcrumb.url}>{breadcrumb.title}</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                      </Fragment>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              </>
            )}
          </div>
        </header>
        <div>{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
