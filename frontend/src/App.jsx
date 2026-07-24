import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './core/auth/AuthContext';
import { ProtectedRoute } from './core/auth/ProtectedRoute';
import { HouseholdProvider } from './core/household/HouseholdContext';
import { AppsProvider } from './core/apps/AppsContext';
import { AppShell } from './core/layout/AppShell';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './apps/households/pages/SettingsPage';
import TasksListPage from './apps/tasks/pages/TasksListPage';
import KanbanBoardPage from './apps/kanban/pages/KanbanBoardPage';
import FinancePage from './apps/finance/pages/FinancePage';
import LifeAdminPage from './apps/life-admin/pages/LifeAdminPage';
import MealPlannerPage from './apps/meal-planner/pages/MealPlannerPage';

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
                    <AppsProvider>
                      <AppShell />
                    </AppsProvider>
                  </HouseholdProvider>
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="tasks" element={<TasksListPage />} />
              <Route path="kanban" element={<KanbanBoardPage />} />
              <Route path="finance" element={<FinancePage />} />
              <Route path="life-admin" element={<LifeAdminPage />} />
              <Route path="meal-planner" element={<MealPlannerPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
