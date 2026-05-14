import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { isSupabaseConfigured } from '@/lib/supabase';
import { signInAdmin } from '@/services/authService';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInAdmin(email, password);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="brand-soft-surface flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-sand bg-white p-5 shadow-elevated">
        <div className="mb-5 flex flex-col items-center text-center">
          <BrandLogo size="xl" showText={false} imageClassName="rounded-3xl" />
          <h1 className="mt-3 text-2xl font-black text-charcoal">دخول الأدمن</h1>
          <p className="mt-1 text-sm font-semibold text-charcoal-muted">
            إدارة سوق البلد، المنتجات، الطلبات، والإعدادات
          </p>
        </div>

        {!isSupabaseConfigured && (
          <div className="mt-4 rounded-xl bg-error/10 p-3 text-sm font-bold text-error">
            Supabase غير مفعّل. أضف VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY في ملف البيئة.
          </div>
        )}

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-extrabold text-charcoal">البريد الإلكتروني</label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-olive" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-12 w-full rounded-xl border border-sand pr-10 pl-3 text-left outline-none focus:border-olive"
                dir="ltr"
                required
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-extrabold text-charcoal">كلمة المرور</label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-olive" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 w-full rounded-xl border border-sand pr-10 pl-3 text-left outline-none focus:border-olive"
                dir="ltr"
                required
              />
            </div>
          </div>
          {error && <p className="rounded-xl bg-error/10 p-3 text-sm font-bold text-error">{error}</p>}
          <button
            disabled={loading || !isSupabaseConfigured}
            className="h-12 w-full rounded-xl bg-olive text-base font-black text-white shadow-button disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>
        </form>
      </div>
    </div>
  );
}
