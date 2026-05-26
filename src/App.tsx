import { type ReactNode } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { APIProvider } from '@vis.gl/react-google-maps';
import { Toaster } from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { GOOGLE_MAPS_API_KEY } from '@/constants/config';
import LoginPage from '@/app/auth/LoginPage';
import RegisterPage from '@/app/auth/RegisterPage';
import ForgotPasswordPage from '@/app/auth/ForgotPasswordPage';
import DashboardPage from '@/app/dashboard/DashboardPage';
import MapPage from '@/app/map/MapPage';
import SavedPlacesPage from '@/app/saved-places/SavedPlacesPage';
import ProfilePage from '@/app/profile/ProfilePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

function Protected({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="h-dvh flex items-center justify-center text-sm text-gray-500">Loading…</div>;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['marker']}>
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
            <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
            <Route path="/forgot-password" element={<PublicOnly><ForgotPasswordPage /></PublicOnly>} />
            <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
            <Route path="/map/:id" element={<Protected><MapPage /></Protected>} />
            <Route path="/saved-places" element={<Protected><SavedPlacesPage /></Protected>} />
            <Route path="/profile" element={<Protected><ProfilePage /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
        <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      </APIProvider>
    </QueryClientProvider>
  );
}
