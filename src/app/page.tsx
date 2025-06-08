import type { Metadata } from 'next'
import { HomeContent } from '@/components/HomeContent'
import { generateMultilingualMetadata } from '@/lib/seo/metadata-generator'

export const metadata: Metadata = generateMultilingualMetadata({
  title: 'CreativeForge - Professional Creative Content Platform',
  description: 'Transform your ideas into stunning visual content with CreativeForge AI-powered platform. Perfect for content creators, marketers, and businesses who need professional visuals at scale.',
  keywords: [
    'creative content platform', 
    'ai content creation', 
    'visual content generator',
    'content creation tools',
    'marketing content creator',
    'social media content',
    'ai creative platform',
    'content marketing tools',
    'creative forge platform',
    'professional content creation',
    'ai powered content',
    'creative content generator',
    'marketing visuals',
    'social media graphics',
    'content creator tools'
  ],
  path: '/',
  images: ['/og-home.png'],
})

export default function Home() {
  return <HomeContent />
}
