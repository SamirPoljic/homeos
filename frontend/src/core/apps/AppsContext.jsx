import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { appsManagerApi } from '../../apps/apps-manager/api';
import { useHousehold } from '../household/HouseholdContext';

const AppsContext = createContext(null);

export function AppsProvider({ children }) {
  const { household } = useHousehold();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!household) return;
    setLoading(true);
    try {
      const res = await appsManagerApi.list(household.id);
      setApps(res.data);
    } catch {
      // tiho - ako padne, sidebar samo prikaže sve kao uključeno (fallback niže)
    } finally {
      setLoading(false);
    }
  }, [household?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enabledKeys = new Set(apps.filter((a) => a.enabled).map((a) => a.key));

  return (
    <AppsContext.Provider value={{ apps, enabledKeys, loading, refresh }}>
      {children}
    </AppsContext.Provider>
  );
}

export function useApps() {
  const ctx = useContext(AppsContext);
  if (!ctx) throw new Error('useApps mora biti unutar AppsProvider');
  return ctx;
}
