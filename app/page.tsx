'use client';
import AuthGate from '@/components/AuthGate';
import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';

export default function Page() {
  return (
    <AuthGate>
      <Dashboard />
    </AuthGate>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="card p-5">
      <div className="text-neutral-400 text-sm">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function Dashboard() {
  const [today, setToday] = useState(0);
  const [week, setWeek] = useState(0);
  const [month, setMonth] = useState(0);
  const [top, setTop] = useState<{name: string; qty: number}[]>([]);

  useEffect(() => { (async () => {
    const tzNow = new Date();
    const startOfDay = new Date(tzNow.getFullYear(), tzNow.getMonth(), tzNow.getDate());
    const startOfWeek = new Date(startOfDay); startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
    const startOfMonth = new Date(tzNow.getFullYear(), tzNow.getMonth(), 1);

    const fetchSum = async (from: Date) => {
      const { data, error } = await supabase.from('sales').select('*').gte('created_at', from.toISOString());
      if (error) return 0;
      return data.reduce((acc:any, s:any)=> acc + Number(s.total || 0), 0);
    };
    setToday(await fetchSum(startOfDay));
    setWeek(await fetchSum(startOfWeek));
    setMonth(await fetchSum(startOfMonth));

    const { data: items } = await supabase.from('sale_items_with_products').select('*').gte('created_at', startOfMonth.toISOString());
    const map = new Map<string, {name:string, qty:number}>();
    (items||[]).forEach((r:any)=> {
      const key = r.product_name;
      map.set(key, { name: key, qty: (map.get(key)?.qty || 0) + Number(r.quantity) });
    });
    setTop(Array.from(map.values()).sort((a,b)=>b.qty-a.qty).slice(0,5));
  })() }, []);

  const money = (n:number)=> n.toLocaleString(undefined, { style: 'currency', currency: 'MXN' });

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card title="Ventas hoy" value={money(today)} />
      <Card title="Ventas semana" value={money(week)} />
      <Card title="Ventas mes" value={money(month)} />
      <div className="card p-5">
        <div className="text-neutral-400 text-sm mb-2">Top del mes</div>
        <ul className="space-y-1">
          {top.map(t=> (<li key={t.name} className="flex justify-between"><span>{t.name}</span><span className="badge">{t.qty}</span></li>))}
        </ul>
      </div>
    </div>
  );
}
