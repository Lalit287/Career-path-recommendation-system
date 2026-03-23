import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { HeroSection } from "@/components/home/hero-section"
import { FeaturesSection } from "@/components/home/features-section"
import { DomainsSection } from "@/components/home/domains-section"
import { CTASection } from "@/components/home/cta-section"
import { ChatWidget } from "@/components/chat-widget"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <DomainsSection />
        <CTASection />
      </main>
      <Footer />
      <ChatWidget />
    </div>
  )
}
