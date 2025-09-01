'use client';
import AuthGate from '@/components/AuthGate';
import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';

export default function Page() {
  return <AuthGate><Cats/></AuthGate>;
}

function Cats() {
  const [rows, setRows] = useState<any[]>([]);
  const [name, setName] = useState('');

  const load = async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    setRows(data||[]);
  };
  useEffect(()=>{ load(); }, []);

  const save = async () => {
    if (!name) return;
    const { error } = await supabase.from('categories').insert([{ name }]);
    if (error) return alert(error.message);
    setName(''); load();
  };

  return (
    <div className="grid gap-4">
      <div className="card p-4">
        <h2 className="font-semibold mb-3">Nueva categoría</h2>
        <div className="flex gap-2">
          <input className="input" placeholder="Nombre" value={name} onChange={e=>setName(e.target.value)} />
          <button className="btn" onClick={save}>Guardar</button>
        </div>
      </div>
      <div className="card p-4">
        <h2 className="font-semibold mb-3">Categorías</h2>
        <ul className="grid gap-2">
          {rows.map((r:any)=> (
            <li key={r.id} className="flex items-center justify-between">
              <span>{r.name}</span>
              {/* Delete intentionally omitted to keep demo safe */}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
