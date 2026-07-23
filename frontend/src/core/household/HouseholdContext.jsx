import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api/apiClient';
import { useAuth } from '../auth/AuthContext';

const HouseholdContext = createContext(null);

const STORAGE_KEY = 'homeos.currentHouseholdId';

export function HouseholdProvider({ children }) {
  const { user } = useAuth();
  const [households, setHouseholds] = useState([]);
  const [currentHouseholdId, setCurrentHouseholdId] = useState(
    localStorage.getItem(STORAGE_KEY)
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/households');
      const list = res.data.map((row) => ({ ...row.households, role: row.role }));
      setHouseholds(list);

      // ako trenutno izabran household više ne postoji u listi, izaberi prvi
      const stillExists = list.some((h) => h.id === currentHouseholdId);
      if (!stillExists && list.length > 0) {
        setCurrentHouseholdId(list[0].id);
        localStorage.setItem(STORAGE_KEY, list[0].id);
      }
      if (list.length === 0) {
        setCurrentHouseholdId(null);
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function switchHousehold(id) {
    setCurrentHouseholdId(id);
    localStorage.setItem(STORAGE_KEY, id);
  }

  const currentHousehold = households.find((h) => h.id === currentHouseholdId) ?? null;

  return (
    <HouseholdContext.Provider
      value={{
        households,
        currentHousehold,
        currentHouseholdId,
        switchHousehold,
        refresh,
        loading,
        error,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold() {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error('useHousehold mora biti unutar HouseholdProvider');
  return ctx;
}
