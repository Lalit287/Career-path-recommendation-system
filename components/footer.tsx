import Link from "next/link"
import { Compass } from "lucide-react"

const footerLinks = {
  product: [
    { href: "/careers", label: "Job Roles" },
    { href: "/recommend", label: "Get Recommendations" },
    { href: "/compare", label: "Compare Careers" },
  ],
  resources: [
    { href: "/contact", label: "Contact Us" },
    { href: "/#features", label: "Features" },
    { href: "/#domains", label: "Career Domains" },
  ],
  legal: [
    { href: "#", label: "Privacy Policy" },
    { href: "#", label: "Terms of Service" },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Compass className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold">PathFinder</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Navigate your future with AI-powered career guidance and personalized recommendations.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold">Product</h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={`${link.href}-${link.label}`}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold">Resources</h3>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={`${link.href}-${link.label}`}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold">Legal</h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={`${link.href}-${link.label}`}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-8">
          <p className="text-center text-sm text-muted-foreground">
            {new Date().getFullYear()} PathFinder. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
