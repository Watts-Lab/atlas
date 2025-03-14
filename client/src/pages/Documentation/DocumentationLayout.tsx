import MainPage from '@/components/View/DataGrid/MainPage'
import { Outlet } from 'react-router-dom'

const DocumentationLayout = ({
  breadcrumbs = [],
}: {
  breadcrumbs?: { title: string; url: string }[]
}) => {
  return (
    <MainPage
      breadcrumbs={[{ title: 'Documentation', url: '/docs' }, ...breadcrumbs]}
      sidebarOpen={true}
    >
      <div className='markdown-body p-4 pt-0'>
        <Outlet />
      </div>
    </MainPage>
  )
}

export default DocumentationLayout
