import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Tiendita POS',
  description: 'Punto de venta e inventario para tiendita'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <nav className="sticky top-0 z-50 backdrop-blur bg-neutral-950/60 border-b border-neutral-900">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
            <b className="text-lg">🛒 Tiendita</b>
            <div className="flex gap-3 text-sm">
              <Link className="link" href="/">Dashboard</Link>
              <Link className="link" href="/pos">POS</Link>
              <Link className="link" href="/inventory">Inventario</Link>
              <Link className="link" href="/categories">Categorías</Link>
              <Link className="link" href="/reports">Reportes</Link>
            </div>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto p-4">{children}</main>
      </body>
    </html>
  );
}
