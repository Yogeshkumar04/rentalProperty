import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Rental Property', description: 'Find a rental that feels like home. Explore properties and manage your rental listings in one place.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
