import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Fantasy Basketball Analytics',
  description: 'Advanced analytics for your fantasy basketball league',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
