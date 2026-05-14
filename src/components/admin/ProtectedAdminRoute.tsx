import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getAdminSession, onAdminAuthChange } from '@/services/authService';

export default function ProtectedAdminRoute() {
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }
      try {
        const currentSession = await getAdminSession();
        if (mounted) setSession(currentSession);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void checkSession();
    const unsubscribe = onAdminAuthChange(() => {
      void checkSession();
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-sand border-t-olive" />
          <p className="text-sm font-bold text-charcoal">جاري فحص تسجيل الدخول...</p>
        </div>
      </div>
    );
  }

  if (!isSupabaseConfigured || !session) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
