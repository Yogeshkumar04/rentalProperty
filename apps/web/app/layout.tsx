import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Rental Property', description: 'Simple rental property management' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
