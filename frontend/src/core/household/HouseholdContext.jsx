import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { householdsApi } from '../../apps/households/api';
import { useAuth } from '../auth/AuthContext';

const HouseholdContext = createContext(null);

export function HouseholdProvider({ children }) {
  const { user } = useAuth();
  const [household, setHousehold] = useState(null); // { id, name, role, created_by, created_at }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await householdsApi.list();
      // Jedan korisnik = jedno domaćinstvo (household_members_one_per_profile constraint)
      const row = res.data[0];
      setHousehold(row ? { ...row.households, role: row.role } : null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <HouseholdContext.Provider value={{ household, loading, error, refresh }}>
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold() {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error('useHousehold mora biti unutar HouseholdProvider');
  return ctx;
}
