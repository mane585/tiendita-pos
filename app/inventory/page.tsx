'use client';
import AuthGate from '@/components/AuthGate';
import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';

export default function Page() {
  return <AuthGate><Inventory/></AuthGate>;
}

function Inventory() {
  const [rows, setRows] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);
  const [categoryId, setCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<any[]>([]);

  const load = async () => {
    const { data: cats } = await supabase.from('categories').select('*').order('name');
    setCategories(cats||[]);
    const { data } = await supabase.from('products').select('*').order('name');
    setRows(data||[]);
  };

  useEffect(()=>{ load(); }, []);

  const save = async () => {
    const { error } = await supabase.from('products').insert([{ name, sku, price, cost, category_id: categoryId||null }]);
    if (error) return alert(error.message);
    setName(''); setSku(''); setPrice(0); setCost(0); setCategoryId('');
    load();
  };

  const restock = async (id:string) => {
    const qty = Number(prompt('Cantidad a ingresar:'));
    if (!qty || qty<=0) return;
    const { error } = await supabase.from('stock_movements').insert([{ product_id: id, change: qty, reason: 'restock' }]);
    if (error) return alert(error.message);
    await supabase.rpc('recalc_stock', { p_id: id });
    load();
  };

  const toggle = async (id:string, is_active:boolean) => {
    await supabase.from('products').update({ is_active: !is_active }).eq('id', id);
    load();
  };

  return (
    <div className="grid gap-4">
      <div className="card p-4">
        <h2 className="font-semibold mb-3">Nuevo producto</h2>
        <div className="grid md:grid-cols-5 gap-2">
          <input className="input" placeholder="Nombre" value={name} onChange={e=>setName(e.target.value)} />
          <input className="input" placeholder="SKU (opcional)" value={sku} onChange={e=>setSku(e.target.value)} />
          <input className="input" type="number" step="0.01" placeholder="Precio venta" value={price||''} onChange={e=>setPrice(Number(e.target.value||0))} />
          <input className="input" type="number" step="0.01" placeholder="Costo" value={cost||''} onChange={e=>setCost(Number(e.target.value||0))} />
          <select className="input" value={categoryId} onChange={e=>setCategoryId(e.target.value)}>
            <option value="">Sin categoría</option>
            {categories.map((c:any)=> <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button className="btn mt-3" onClick={save} disabled={!name || !price}>Guardar</button>
      </div>

      <div className="card p-4">
        <h2 className="font-semibold mb-3">Productos</h2>
        <table className="table">
          <thead><tr><th>SKU</th><th>Nombre</th><th>Precio</th><th>Costo</th><th>Stock</th><th>Activo</th><th></th></tr></thead>
          <tbody>
            {rows.map((r:any)=> (
              <tr key={r.id}>
                <td>{r.sku||'—'}</td>
                <td>{r.name}</td>
                <td>${Number(r.price||0).toFixed(2)}</td>
                <td>${Number(r.cost||0).toFixed(2)}</td>
                <td>{r.stock}</td>
                <td>{r.is_active ? 'Sí' : 'No'}</td>
                <td className="flex gap-2">
                  <button className="btn-secondary" onClick={()=>restock(r.id)}>Ingresar</button>
                  <button className="btn-secondary" onClick={()=>toggle(r.id, r.is_active)}>{r.is_active?'Desactivar':'Activar'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
