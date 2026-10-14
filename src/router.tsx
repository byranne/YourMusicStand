import { createBrowserRouter, Navigate } from 'react-router';

import { AddPage } from './routes/AddPage';
import { GuestOnly, RequireSession } from './routes/guards';
import { HomePage } from './routes/HomePage';
import { LogPage } from './routes/LogPage';
import { MyListPage } from './routes/MyListPage';
import { SignInPage } from './routes/SignInPage';
import { SignUpPage } from './routes/SignUpPage';
import { TabsLayout } from './routes/TabsLayout';

export const router = createBrowserRouter([
  {
    element: <GuestOnly />,
    children: [
      { path: '/sign-in', element: <SignInPage /> },
      { path: '/sign-up', element: <SignUpPage /> },
    ],
  },
  {
    element: <RequireSession />,
    children: [
      {
        element: <TabsLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'log', element: <LogPage /> },
          { path: 'list', element: <MyListPage /> },
          { path: 'add', element: <AddPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
