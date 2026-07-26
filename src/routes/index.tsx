import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { ViewerPage } from '@/pages/ViewerPage'
import { UploadPage } from '@/pages/UploadPage'
import { ComparePage } from '@/pages/ComparePage'
import { StandardsPage } from '@/pages/StandardsPage'
import { HistoryPage } from '@/pages/HistoryPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'viewer', element: <UploadPage /> },
      { path: 'viewer/compare', element: <ComparePage /> },
      { path: 'viewer/single', element: <ViewerPage /> },
      { path: 'standards', element: <StandardsPage /> },
      { path: 'history', element: <HistoryPage /> },
    ],
  },
])
