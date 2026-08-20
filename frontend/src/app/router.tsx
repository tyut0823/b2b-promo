import { createBrowserRouter } from 'react-router-dom';
import LoginPage from '../features/auth/LoginPage';
import SignupPage from '../features/auth/SignupPage';
import BuyerLayout from '../shared/layouts/BuyerLayout';
import AdminLayout from '../shared/layouts/AdminLayout';
import ProtectedRoute from './ProtectedRoute';
import SampleListPage from '../features/sample/SampleListPage';
import SampleDetailPage from '../features/sample/SampleDetailPage';
import SampleAdminListPage from '../features/sample/SampleAdminListPage';
import SampleFormPage from '../features/sample/SampleFormPage';
import MyApplicationsPage from '../features/application/MyApplicationsPage';
import ApplicationStatusPage from '../features/application/ApplicationStatusPage';
import MyPage from '../features/mypage/MyPage';

export const routes = [
  { path: '/', element: <div>b2b-promo</div> },
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  { path: '/mypage', element: <ProtectedRoute><MyPage /></ProtectedRoute> },
  {
    element: (
      <ProtectedRoute role="BUYER">
        <BuyerLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/samples', element: <SampleListPage /> },
      { path: '/samples/:id', element: <SampleDetailPage /> },
      { path: '/applications/me', element: <MyApplicationsPage /> },
    ],
  },
  {
    element: (
      <ProtectedRoute role="ADMIN">
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/admin/samples', element: <SampleAdminListPage /> },
      { path: '/admin/samples/new', element: <SampleFormPage /> },
      { path: '/admin/samples/:id/edit', element: <SampleFormPage /> },
      { path: '/admin/samples/:id/applications', element: <ApplicationStatusPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
