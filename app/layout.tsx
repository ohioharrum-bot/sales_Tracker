import './globals.css'

export const metadata = {
  title: 'Sales Calculator',
  description: 'Manage your business sales, payouts, and expenses',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
