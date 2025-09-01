'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [sessionReady, setSessionReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true' || process.env.DISABLE_AUTH === 'true') {
        setSignedIn(true); setSessionReady(true); return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      setSignedIn(!!session);
      setSessionReady(true);
      supabase.auth.onAuthStateChange((_event, session) => setSignedIn(!!session));
    };
    check();
  }, []);

  if (!sessionReady) return <div className="p-6">Cargando…</div>;
  if (!signedIn) return <Login />;
  return <>{children}</>;
}

function Login() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const send = async () => {
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: (typeof window !== 'undefined' ? window.location.origin : '') } });
    if (!error) setSent(true);
  };
  return (
    <div className="min-h-dvh flex items-center justify-center p-6">
      <div className="card p-6 max-w-sm w-full">
        <h1 className="text-xl font-semibold mb-2">Entrar</h1>
        <p className="text-neutral-400 mb-4">Te enviaremos un enlace mágico al correo.</p>
        <input className="input mb-3" placeholder="tucorreo@ejemplo.com" value={email} onChange={e=>setEmail(e.target.value)} />
        <button className="btn w-full" onClick={send} disabled={!email || sent}>{sent ? 'Revisa tu correo' : 'Enviar enlace'}</button>
      </div>
    </div>
  );
}
