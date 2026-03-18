import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'

const zpix = localFont({
  src: './fonts/zpix.ttf',
  weight: '400',
  style: 'normal',
  variable: '--font-zpix',
  display: 'swap',
})

export const metadata: Metadata = {
  title: '打工之道 — 职场模拟器',
  description: '一个基于 AI Agent 的打工模拟器。从应届毕业生开始，升职加薪，或辞职创业。',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${zpix.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
