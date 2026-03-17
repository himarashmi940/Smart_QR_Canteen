import "./globals.css"
import type { ReactNode } from "react"

export const metadata = {
  title: "Smart QR Canteen",
  description: "QR-based canteen ordering with staff dashboard and voice announcements"
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container">{children}</div>
      </body>
    </html>
  )
}

