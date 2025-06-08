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
      {/* Modern Navigation */}
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

      {/* Hero Section - 现代化设计 */}
      <section className="relative pt-32 pb-24 px-4 overflow-hidden">
        <div className="hero-gradient absolute inset-0 pointer-events-none" />
        
        {/* 装饰性元素 */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-full blur-3xl float-animation" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-full blur-3xl float-animation" style={{animationDelay: '2s'}} />
        
        <div className="container mx-auto max-w-6xl text-center relative z-10">
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center px-6 py-3 rounded-full glass-effect border border-orange-500/30 text-orange-400 text-sm font-medium glow-effect">
              <span className="w-2 h-2 bg-orange-500 rounded-full mr-3 pulse-glow"></span>
              {home.hero.badge}
            </div>
            
            {/* Main Title */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black mb-8 leading-tight">
              <span className="gradient-text">{home.hero.title}</span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-lg md:text-xl lg:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto px-4 md:px-0 leading-relaxed font-light">
              {home.hero.description}
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link href="/generate">
                <Button 
                  size="lg" 
                  className="modern-button text-white font-semibold px-8 md:px-12 py-4 md:py-6 text-base md:text-lg rounded-2xl glow-effect"
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6 mr-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  {common.buttons.startCreating}
                </Button>
              </Link>
              <Link href="/pricing">
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="glass-effect border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:border-orange-400/50 hover:text-orange-300 px-8 md:px-12 py-4 md:py-6 text-base md:text-lg rounded-2xl transition-all duration-300"
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  {common.buttons.viewPricing}
                </Button>
              </Link>
            </div>

            {/* 社会证明 */}
            <div className="flex items-center justify-center space-x-8 pt-12 opacity-60">
              <div className="text-sm text-gray-400">
                <span className="text-orange-400 font-semibold text-lg">10,000+</span><br />
                Happy Creators
              </div>
              <div className="w-px h-8 bg-gray-600"></div>
              <div className="text-sm text-gray-400">
                <span className="text-orange-400 font-semibold text-lg">1M+</span><br />
                Content Created
              </div>
              <div className="w-px h-8 bg-gray-600"></div>
              <div className="text-sm text-gray-400">
                <span className="text-orange-400 font-semibold text-lg">99.9%</span><br />
                Uptime
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Sections with modern styling */}
      <div className="space-y-24">
        {/* Twitter展示区域 */}
        <TwitterShowcase />

        {/* Key Features Section */}
        <KeyFeatures />

        {/* How-to Steps Section */}
        <HowToSteps />

        {/* FAQ Section */}
        <FAQ />
      </div>

      {/* Footer */}
      <Footer />

      {/* Scripts */}
      <Script 
        src="https://platform.twitter.com/widgets.js" 
        strategy="lazyOnload"
      />
    </div>
  )
} 