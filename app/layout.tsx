import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import Script from 'next/script'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/lib/auth-context'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: 'PathFinder - AI-Powered Career Guidance',
  description: 'Navigate your future with personalized career recommendations, learning roadmaps, and AI-powered guidance.',
  generator: 'v0.app',
  keywords: ['career', 'jobs', 'AI', 'recommendations', 'roadmap', 'skills'],
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0f' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const hydrationAttrSanitizer = `(function(){
    function stripAttrs(root) {
      if (!root || !root.querySelectorAll) return;
      var nodes = root.querySelectorAll('[fdprocessedid]');
      for (var i = 0; i < nodes.length; i++) {
        nodes[i].removeAttribute('fdprocessedid');
      }
      if (root.nodeType === 1 && root.hasAttribute && root.hasAttribute('fdprocessedid')) {
        root.removeAttribute('fdprocessedid');
      }
    }

    stripAttrs(document);

    var observer = new MutationObserver(function(mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var mutation = mutations[i];
        if (mutation.type === 'attributes' && mutation.target) {
          if (mutation.target.getAttribute && mutation.target.getAttribute('fdprocessedid') !== null) {
            mutation.target.removeAttribute('fdprocessedid');
          }
        }
        if (mutation.addedNodes && mutation.addedNodes.length) {
          for (var j = 0; j < mutation.addedNodes.length; j++) {
            stripAttrs(mutation.addedNodes[j]);
          }
        }
      }
    });

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['fdprocessedid']
    });

    setTimeout(function() {
      observer.disconnect();
    }, 5000);
  })();`

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Script
          id="sanitize-extension-hydration-attrs"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: hydrationAttrSanitizer }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
