import { Clock, AlertCircle, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { RecentlyViewedProject } from '@/pages/Dashboard/useOverviewData'

type RecentlyViewedProjectsProps = {
  recentlyViewed: RecentlyViewedProject[]
}

export default function RecentlyViewedProjects({ recentlyViewed }: RecentlyViewedProjectsProps) {
  // Only show top 5 recently viewed to keep it compact
  const displayItems = recentlyViewed.slice(0, 5)

  if (displayItems.length === 0) return null

  return (
    <div className='w-full'>
      <h2 className='mb-2 scroll-m-20 border-b pb-2 text-md font-semibold tracking-tight transition-colors'>
        <Clock className='inline h-4 w-4 mr-2' />
        Recently Viewed
      </h2>
      <div className='rounded-md border bg-white/50'>
        <Table>
          <TableHeader>
            <TableRow className='bg-gray-50/50 hover:bg-gray-50/50'>
              <TableHead className='h-9 py-2'>Project</TableHead>
              <TableHead className='h-9 py-2 text-xs'>Owner</TableHead>
              <TableHead className='h-9 py-2 text-xs'>Viewed</TableHead>
              <TableHead className='h-9 py-2 w-8' />
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayItems.map((view) => (
              <TableRow
                key={view.project_id}
                className={`${
                  !view.exists ? 'opacity-50 bg-gray-50/30' : 'hover:bg-blue-50/40 cursor-pointer'
                }`}
                onClick={() => {
                  if (view.exists) {
                    window.open(`/project/${view.project_id}`, '_blank')
                  }
                }}
              >
                <TableCell className='py-2'>
                  <div className='flex items-center gap-2'>
                    {!view.exists && <AlertCircle className='h-3.5 w-3.5 text-yellow-600' />}
                    <span className='text-sm font-medium'>
                      {view.project?.title || 'Deleted Project'}
                    </span>
                  </div>
                  {view.project?.description && (
                    <p className='text-xs text-gray-500 line-clamp-1'>{view.project.description}</p>
                  )}
                </TableCell>
                <TableCell className='py-2 text-xs text-gray-600'>
                  {view.project ? (
                    view.project.is_owner ? (
                      <span className='text-gray-400'>You</span>
                    ) : (
                      view.project.owner_email.split('@')[0]
                    )
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell className='py-2 text-xs text-gray-500'>
                  {format(new Date(view.viewed_at), 'MMM dd yyyy, hh:mm a')}
                </TableCell>
                <TableCell className='py-2 text-right'>
                  {view.exists && (
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-6 w-6 p-0'
                      onClick={(e) => {
                        e.stopPropagation()
                        window.open(`/project/${view.project_id}`, '_blank')
                      }}
                    >
                      <ExternalLink className='h-3.5 w-3.5' />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {recentlyViewed.length > 5 && (
        <p className='text-xs text-gray-400 mt-1'>+{recentlyViewed.length - 5} more</p>
      )}
    </div>
  )
}
