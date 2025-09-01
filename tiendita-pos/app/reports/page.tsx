'use client';
import AuthGate from '@/components/AuthGate';
import { supabase } from '@/lib/supabaseClient';
import { useEffect, useMemo, useState } from 'react';

export default function Page() {
  return <AuthGate><Reports/></AuthGate>;
}

function Reports() {
  const [from, setFrom] = useState<string>(()=> new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10));
  const [to, setTo] = useState<string>(()=> new Date().toISOString().slice(0,10));
  const [sales, setSales] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);

  useEffect(()=>{ (async ()=>{
    const { data: s } = await supabase.from('sales').select('*').gte('created_at', from+'T00:00:00.000Z').lte('created_at', to+'T23:59:59.999Z').order('created_at', { ascending: false });
    setSales(s||[]);
    const { data: it } = await supabase.from('sale_items_with_products').select('*').gte('created_at', from+'T00:00:00.000Z').lte('created_at', to+'T23:59:59.999Z');
    setItems(it||[]);
  })() }, [from, to]);

  const totals = useMemo(()=>{
    const total = sales.reduce((a,s)=> a+Number(s.total||0), 0);
    const cost = items.reduce((a,i)=> a + Number(i.cost||0)*Number(i.quantity||0), 0);
    const profit = total - cost;
    return { total, cost, profit };
  }, [sales, items]);

  const fmt = (n:number)=> n.toLocaleString(undefined,{style:'currency',currency:'MXN'});

  const byProduct = useMemo(()=>{
    const map = new Map<string, {name:string, qty:number, total:number}>();
    items.forEach(i=>{
      const key = i.product_name;
      const prev = map.get(key) || { name: key, qty: 0, total: 0 };
      prev.qty += Number(i.quantity||0);
      prev.total += Number(i.price||0) * Number(i.quantity||0);
      map.set(key, prev);
    });
    return Array.from(map.values()).sort((a,b)=> b.total-a.total);
  }, [items]);

  return (
    <div className="grid gap-4">
      <div className="card p-4 flex items-end gap-2">
        <div>
          <label className="text-sm text-neutral-400">Desde</label>
          <input className="input" type="date" value={from} onChange={e=>setFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-neutral-400">Hasta</label>
          <input className="input" type="date" value={to} onChange={e=>setTo(e.target.value)} />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-neutral-400">Ventas</div>
          <div className="text-2xl font-bold">{fmt(totals.total)}</div>
        </div>
        <div className="card p-4">
          <div className="text-neutral-400">Costo estimado</div>
          <div className="text-2xl font-bold">{fmt(totals.cost)}</div>
        </div>
        <div className="card p-4">
          <div className="text-neutral-400">Ganancia bruta</div>
          <div className="text-2xl font-bold">{fmt(totals.profit)}</div>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold mb-2">Productos más vendidos</h3>
        <table className="table">
          <thead><tr><th>Producto</th><th>Cant.</th><th>Total</th></tr></thead>
          <tbody>
            {byProduct.map((r)=> (
              <tr key={r.name}><td>{r.name}</td><td>{r.qty}</td><td>{fmt(r.total)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
