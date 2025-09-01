'use client';
import AuthGate from '@/components/AuthGate';
import { supabase } from '@/lib/supabaseClient';
import { useEffect, useMemo, useState } from 'react';
import { create } from 'zustand';

type Product = { id:string; name:string; price:number; stock:number; sku:string };
type Category = { id:string; name:string };

type CartItem = { id:string; name:string; price:number; quantity:number };

const useCart = create<{
  items: CartItem[];
  add: (p:Product)=>void;
  inc: (id:string)=>void;
  dec: (id:string)=>void;
  remove: (id:string)=>void;
  clear: ()=>void;
}>((set, get)=> ({
  items: [],
  add: (p)=> {
    const exist = get().items.find(i=>i.id===p.id);
    if (exist) set({ items: get().items.map(i=> i.id===p.id ? { ...i, quantity: i.quantity+1 } : i )});
    else set({ items: [...get().items, { id:p.id, name:p.name, price: p.price, quantity:1 }] });
  },
  inc: (id)=> set({ items: get().items.map(i=> i.id===id ? { ...i, quantity: i.quantity+1 } : i )}),
  dec: (id)=> set({ items: get().items.map(i=> i.id===id ? { ...i, quantity: Math.max(1, i.quantity-1) } : i )}),
  remove: (id)=> set({ items: get().items.filter(i=> i.id!==id) }),
  clear: ()=> set({ items: [] })
}));

export default function Page() {
  return (
    <AuthGate>
      <POS />
    </AuthGate>
  );
}

function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cat, setCat] = useState<string>('all');
  const [q, setQ] = useState('');
  const cart = useCart();
  const [taking, setTaking] = useState(false);
  const [paid, setPaid] = useState<number>(0);

  useEffect(()=>{ (async ()=>{
    const { data: cats } = await supabase.from('categories').select('*').order('name');
    setCategories(cats||[]);
    const { data: prods } = await supabase.from('products').select('*').eq('is_active', true).order('name');
    setProducts((prods||[]).map((p:any)=> ({ id:p.id, name:p.name, price:Number(p.price), stock:p.stock, sku:p.sku })));
  })() }, []);

  const filtered = useMemo(()=> products.filter(p=>
    (cat==='all' || (categories.find(c=>c.id===cat) && (p as any).category_id===cat)) &&
    (q==='' || p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase()))
  ), [products, cat, q, categories]);

  const total = cart.items.reduce((a,c)=> a + c.price*c.quantity, 0);
  const change = Math.max(0, paid - total);

  const checkout = async () => {
    if (cart.items.length===0) return;
    setTaking(true);
    const payload = cart.items.map(i=> ({ product_id: i.id, quantity: i.quantity }));
    const { data, error } = await supabase.rpc('perform_sale', { items_json: payload, payment: paid });
    setTaking(false);
    if (error) { alert(error.message); return; }
    cart.clear(); setPaid(0);
    alert('Venta registrada ✅');
  };

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <div className="md:col-span-2">
        <div className="card p-3 flex gap-2 items-center sticky top-[64px] z-40">
          <input className="input" placeholder="Buscar por nombre o SKU…" value={q} onChange={e=>setQ(e.target.value)} />
          <select className="input max-w-48" value={cat} onChange={e=>setCat(e.target.value)}>
            <option value="all">Todas</option>
            {categories.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-3">
          {filtered.map(p=> (
            <button key={p.id} className="card p-3 text-left hover:scale-[1.01] transition"
              onClick={()=>useCart.getState().add(p)}>
              <div className="text-sm text-neutral-400">{p.sku}</div>
              <div className="font-semibold">{p.name}</div>
              <div className="text-emerald-400 font-bold mt-1">{p.price.toLocaleString(undefined,{style:'currency',currency:'MXN'})}</div>
              <div className="text-xs text-neutral-500 mt-1">Stock: {p.stock}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <h2 className="font-semibold mb-3">Carrito</h2>
        <div className="space-y-2 max-h-[60vh] overflow-auto pr-1">
          {cart.items.map(i=> (
            <div key={i.id} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate">{i.name}</div>
                <div className="text-sm text-neutral-400">{(i.price*i.quantity).toLocaleString(undefined,{style:'currency',currency:'MXN'})}</div>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn-secondary" onClick={()=>useCart.getState().dec(i.id)}>-</button>
                <span className="badge">{i.quantity}</span>
                <button className="btn-secondary" onClick={()=>useCart.getState().inc(i.id)}>+</button>
                <button className="btn-secondary" onClick={()=>useCart.getState().remove(i.id)}>✕</button>
              </div>
            </div>
          ))}
          {cart.items.length===0 && <div className="text-neutral-500">Agrega productos con un toque.</div>}
        </div>
        <div className="border-t border-neutral-800 my-3" />
        <div className="flex justify-between text-lg font-semibold">
          <div>Total</div>
          <div>{total.toLocaleString(undefined,{style:'currency',currency:'MXN'})}</div>
        </div>
        <div className="mt-3">
          <label className="text-sm text-neutral-400">Pago recibido</label>
          <input className="input mt-1" type="number" step="0.01" value={paid||''} onChange={e=>setPaid(Number(e.target.value||0))} />
          <div className="text-sm mt-1">Cambio: <b>{change.toLocaleString(undefined,{style:'currency',currency:'MXN'})}</b></div>
        </div>
        <button className="btn w-full mt-3" onClick={checkout} disabled={taking || total===0}>{taking?'Procesando…':'Cobrar'}</button>
      </div>
    </div>
  );
}
