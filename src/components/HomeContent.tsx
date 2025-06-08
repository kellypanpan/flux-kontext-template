"use client"

import Link from "next/link"
import Script from "next/script"
import { Button } from "@/components/ui/button"
import { Navigation } from "@/components/Navigation"
import { TwitterShowcase } from "@/components/TwitterShowcase"
import { KeyFeatures } from "@/components/KeyFeatures"
import { HowToSteps } from "@/components/HowToSteps"
import { FAQ } from "@/components/FAQ"
import { Footer } from "@/components/Footer"
import { OrganizationSchema, WebSiteSchema, SoftwareApplicationSchema } from "@/components/StructuredData"
import { home, common, seo } from "@/lib/content"

export function HomeContent() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <Navigation />

      {/* 结构化数据 - Structured Data */}
      <OrganizationSchema />
      <WebSiteSchema />
      <SoftwareApplicationSchema />

      {/* JSON-LD 应用程序数据 */}
      <Script
        id="structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "CreativeForge",
            "description": seo.meta.description,
            "url": "https://creativeforge.studio",
            "applicationCategory": "CreativeApplication",
            "operatingSystem": "Web Browser",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD",
              "description": "Professional creative content generation and editing"
            },
            "creator": {
              "@type": "Organization",
              "name": "CreativeForge"
            }
          })
        }}
      />

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-5xl text-center">
          <div className="hero-gradient absolute inset-0 pointer-events-none" />
          <div className="relative z-10">
            <div className="inline-block px-4 py-2 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-full text-orange-600 text-sm mb-6">
              {home.hero.badge}
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6 leading-tight bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
              {home.hero.title}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto px-4 md:px-0 leading-relaxed">
              {home.hero.description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/generate">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 hover:scale-105 active:scale-95 transition-all duration-200 px-6 md:px-8 py-3 md:py-4 text-base md:text-lg shadow-lg"
                >
                  <svg className="w-4 h-4 md:w-5 md:h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7V10C2 16 6 20.5 12 22C18 20.5 22 16 22 10V7L12 2Z" fill="currentColor"/>
                  </svg>
                  {common.buttons.startCreating}
                </Button>
              </Link>
              <Link href="/pricing">
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="border-orange-500/20 text-orange-600 hover:bg-orange-50 hover:scale-105 active:scale-95 transition-all duration-200 px-6 md:px-8 py-3 md:py-4 text-base md:text-lg"
                >
                  {common.buttons.viewPricing}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Twitter展示区域 */}
      <TwitterShowcase />

      {/* Key Features Section */}
      <KeyFeatures />

      {/* How-to Steps Section */}
      <HowToSteps />

      {/* FAQ Section */}
      <FAQ />

      {/* Footer */}
      <Footer />

      {/* 推特脚本 - 确保推特内容正常加载 */}
      <Script 
        src="https://platform.twitter.com/widgets.js" 
        strategy="lazyOnload"
      />
    </div>
  )
} 