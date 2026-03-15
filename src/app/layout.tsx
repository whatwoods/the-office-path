import type { Metadata } from 'next'
import { DotGothic16 } from 'next/font/google'
import './globals.css'

const zpix = DotGothic16({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-zpix',
  display: 'swap',
})

export const metadata: Metadata = {
  title: '打工之道 — 职场模拟器',
  description: '一个基于 AI Agent 的打工模拟器。从应届毕业生开始，升职加薪，或辞职创业。',
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
