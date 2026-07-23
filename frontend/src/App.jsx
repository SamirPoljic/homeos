import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './core/auth/AuthContext';
import { ProtectedRoute } from './core/auth/ProtectedRoute';
import { HouseholdProvider } from './core/household/HouseholdContext';
import { AppShell } from './core/layout/AppShell';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import HouseholdsPage from './apps/households/pages/HouseholdsPage';
import HouseholdMembersPage from './apps/households/pages/HouseholdMembersPage';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <HouseholdProvider>
                    <AppShell />
                  </HouseholdProvider>
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="households" element={<HouseholdsPage />} />
              <Route path="households/:householdId/members" element={<HouseholdMembersPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
