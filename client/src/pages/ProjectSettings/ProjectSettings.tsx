import MainPage from '@/components/View/DataGrid/MainPage'

const ProjectSettings = () => {
  return (
    <MainPage
      breadcrumbs={[
        {
          title: 'Create Project',
          url: '/projects/create',
        },
      ]}
      sidebarOpen={true}
    >
      <div className='flex flex-1 flex-col gap-4 p-4 pt-0'>
        <h1 className='text-2xl font-bold'>Project Settings</h1>
      </div>
    </MainPage>
  )
}

export default ProjectSettings
