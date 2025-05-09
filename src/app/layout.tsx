
import type { Metadata } from 'next';
import { Inter, Roboto_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster

const inter = Inter({
  variable: '--font-geist-sans', // Using the original CSS variable name for minimal changes
  subsets: ['latin'],
});

const roboto_mono = Roboto_Mono({
  variable: '--font-geist-mono', // Using the original CSS variable name
  subsets: ['latin'],
  weight: ['400', '700'], // Provide common weights
});

export const metadata: Metadata = {
  title: 'DrawFast',
  description: 'A simple and fast drawing application.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${roboto_mono.variable} font-sans antialiased`}>
        {children}
        <Toaster /> {/* Add Toaster here */}
      </body>
    </html>
  );
}

