import { createBrowserRouter, Navigate } from 'react-router';

import { GuestOnly, RequireSession } from './routes/guards';
import { LogPage } from './routes/LogPage';
import { MyListPage } from './routes/MyListPage';
import { HomePage, SongPage } from './routes/placeholders';
import { ProfilePage } from './routes/ProfilePage';
import { SignInPage } from './routes/SignInPage';
import { TabsLayout } from './routes/TabsLayout';

export const router = createBrowserRouter([
  {
    element: <GuestOnly />,
    children: [{ path: '/sign-in', element: <SignInPage /> }],
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
          // Not a tab: reached from the profile button in each tab's header.
          { path: 'profile', element: <ProfilePage /> },
        ],
      },
      { path: 'song/:id', element: <SongPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
