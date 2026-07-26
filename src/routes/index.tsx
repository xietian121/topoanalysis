import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { EvalWizardPage } from '@/pages/EvalWizardPage'
import { ViewerPage } from '@/pages/ViewerPage'
import { UploadPage } from '@/pages/UploadPage'
import { ComparePage } from '@/pages/ComparePage'
import { StandardsPage } from '@/pages/StandardsPage'
import { HistoryPage } from '@/pages/HistoryPage'
import { ReportPage } from '@/pages/ReportPage'
import { CompareReportPage } from '@/pages/CompareReportPage'
import { TutorialPage } from '@/pages/TutorialPage'
import { ModelComparePage } from '@/pages/ModelComparePage'
import { AnalyticsPage } from '@/pages/AnalyticsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },

      // Phase 2: New wizard flow
      { path: 'eval/wizard', element: <EvalWizardPage /> },

      // Viewer (3D) routes
      { path: 'viewer', element: <UploadPage /> },
      { path: 'viewer/compare', element: <ComparePage /> },
      { path: 'viewer/single', element: <ViewerPage /> },

      // Phase 2: Report, Compare, Analytics
      { path: 'report/:id', element: <ReportPage /> },
      { path: 'compare/report/:id1/:id2', element: <CompareReportPage /> },
      { path: 'compare', element: <ModelComparePage /> },
      { path: 'analytics', element: <AnalyticsPage /> },

      // Phase 3: Teaching comparison
      { path: 'tutorial/:type', element: <TutorialPage /> },

      // Standards (updated for Phase 2)
      { path: 'standards', element: <StandardsPage /> },

      // History — kept for backward compatibility, redirects to home
      { path: 'history', element: <HistoryPage /> },
    ],
  },
])
