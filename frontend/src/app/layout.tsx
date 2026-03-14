import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import StarkzapProvider from '@/providers/StarkzapProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'UnoZap - On-chain UNO',
  description: 'Play UNO on Starknet with gasless transactions powered by Starkzap',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} text-white min-h-screen`}>
        <StarkzapProvider>{children}</StarkzapProvider>
      </body>
    </html>
  );
}
