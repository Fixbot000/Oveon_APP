import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface ScanHistoryItem {
  id: string;
  device_name: string;
  scan_result: any;
  created_at: string;
  synced_at?: string;
  local_id?: string;
}

interface LocalScan {
  id: string;
  device_name: string;
  scan_result: any;
  created_at: string;
  synced: boolean;
}

const LOCAL_SCANS_KEY = 'local_scan_history';

export const useScanHistory = () => {
  const { user } = useAuth();
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Get local scans from localStorage
  const getLocalScans = useCallback((): LocalScan[] => {
    try {
      const stored = localStorage.getItem(LOCAL_SCANS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  // Save local scans to localStorage
  const saveLocalScans = useCallback((scans: LocalScan[]) => {
    try {
      localStorage.setItem(LOCAL_SCANS_KEY, JSON.stringify(scans));
    } catch (error) {
      console.error('Failed to save local scans:', error);
    }
  }, []);

  // Add a scan (either online or offline)
  const addScan = useCallback(async (deviceName: string, scanResult: any) => {
    const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newScan: LocalScan = {
      id: localId,
      device_name: deviceName,
      scan_result: scanResult,
      created_at: new Date().toISOString(),
      synced: false
    };

    // Always save locally first
    const localScans = getLocalScans();
    localScans.push(newScan);
    saveLocalScans(localScans);

    // Try to save to Supabase if user is authenticated and online
    if (user && navigator.onLine) {
      try {
        const { data, error } = await supabase
          .from('scan_history')
          .insert({
            user_id: user.id,
            device_name: deviceName,
            scan_result: scanResult,
            local_id: localId
          })
          .select()
          .single();

        if (!error && data) {
          // Mark as synced locally
          const updatedLocalScans = localScans.map(scan => 
            scan.id === localId ? { ...scan, synced: true } : scan
          );
          saveLocalScans(updatedLocalScans);
          
          // Update state with the new scan
          setScans(prev => [{
            id: data.id,
            device_name: data.device_name,
            scan_result: data.scan_result,
            created_at: data.created_at,
            synced_at: data.synced_at,
            local_id: data.local_id
          }, ...prev]);
        }
      } catch (error) {
        console.error('Failed to sync scan to Supabase:', error);
        // Scan is still saved locally for later sync
      }
    }

    // Update state immediately with local scan for offline use
    if (!user || !navigator.onLine) {
      setScans(prev => [{
        id: localId,
        device_name: deviceName,
        scan_result: scanResult,
        created_at: newScan.created_at,
        local_id: localId
      }, ...prev]);
    }
  }, [user, getLocalScans, saveLocalScans]);

  // Sync unsynced local scans to Supabase
  const syncPendingScans = useCallback(async () => {
    if (!user) return;

    const localScans = getLocalScans();
    const unsyncedScans = localScans.filter(scan => !scan.synced);

    if (unsyncedScans.length === 0) return;

    try {
      const syncPromises = unsyncedScans.map(async (scan) => {
        const { data, error } = await supabase
          .from('scan_history')
          .insert({
            user_id: user.id,
            device_name: scan.device_name,
            scan_result: scan.scan_result,
            local_id: scan.id,
            created_at: scan.created_at
          })
          .select()
          .single();

        if (!error && data) {
          return { localId: scan.id, success: true, data };
        }
        return { localId: scan.id, success: false, error };
      });

      const results = await Promise.allSettled(syncPromises);
      
      // Update local storage with synced scans
      const updatedLocalScans = localScans.map(scan => {
        const result = results.find(r => 
          r.status === 'fulfilled' && r.value.localId === scan.id && r.value.success
        );
        return result ? { ...scan, synced: true } : scan;
      });
      
      saveLocalScans(updatedLocalScans);
      
      // Refresh scan history from server
      await fetchScans();
    } catch (error) {
      console.error('Failed to sync pending scans:', error);
    }
  }, [user, getLocalScans, saveLocalScans]);

  // Fetch scans from Supabase
  const fetchScans = useCallback(async () => {
    if (!user) {
      // Show only local scans if not authenticated
      const localScans = getLocalScans();
      setScans(localScans.map(scan => ({
        id: scan.id,
        device_name: scan.device_name,
        scan_result: scan.scan_result,
        created_at: scan.created_at,
        local_id: scan.id
      })));
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('scan_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching scans:', error);
        toast.error('Failed to fetch scan history');
        
        // Fallback to local scans
        const localScans = getLocalScans();
        setScans(localScans.map(scan => ({
          id: scan.id,
          device_name: scan.device_name,
          scan_result: scan.scan_result,
          created_at: scan.created_at,
          local_id: scan.id
        })));
      } else {
        const serverScans = data || [];
        const localScans = getLocalScans();
        
        // Merge server scans with unsynced local scans
        const unsyncedLocalScans = localScans
          .filter(local => !local.synced && !serverScans.some(server => server.local_id === local.id))
          .map(scan => ({
            id: scan.id,
            device_name: scan.device_name,
            scan_result: scan.scan_result,
            created_at: scan.created_at,
            local_id: scan.id
          }));

        const allScans = [...serverScans, ...unsyncedLocalScans]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setScans(allScans);
        
        // Sync pending scans if online
        if (navigator.onLine) {
          await syncPendingScans();
        }
      }
    } catch (error) {
      console.error('Error fetching scans:', error);
      toast.error('Error loading scan history');
    } finally {
      setLoading(false);
    }
  }, [user, getLocalScans, syncPendingScans]);

  // Auto-sync when coming back online
  useEffect(() => {
    const handleOnline = () => {
      if (user) {
        syncPendingScans();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [user, syncPendingScans]);

  // Fetch scans when user changes
  useEffect(() => {
    fetchScans();
  }, [fetchScans]);

  return {
    scans,
    loading,
    addScan,
    refreshScans: fetchScans,
    syncPendingScans
  };
};