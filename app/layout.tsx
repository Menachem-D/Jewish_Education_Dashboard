import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export const metadata: Metadata = {
  title: 'Jewish Education Dispatch Map',
  description:
    'Internal command & intelligence dashboard for Jewish education outreach',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="h-full overflow-hidden antialiased bg-slate-900">
        {children}
      </body>
    </html>
  );
}
