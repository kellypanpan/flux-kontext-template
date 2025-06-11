"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, X } from "lucide-react"

interface SmartImagePreviewProps {
  url: string
  alt: string
  index: number
  onRemove: () => void
}

export function SmartImagePreview({ url, alt, index, onRemove }: SmartImagePreviewProps) {
  const [currentUrl, setCurrentUrl] = useState(url)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  // 🔧 检查URL类型
  const getUrlType = (url: string): 'blob' | 'http' | 'data' | 'unknown' => {
    if (url.startsWith('blob:')) return 'blob'
    if (url.startsWith('http://') || url.startsWith('https://')) return 'http'
    if (url.startsWith('data:')) return 'data'
    return 'unknown'
  }

  // 生成备用URL列表
  const generateFallbackUrls = (originalUrl: string): string[] => {
    const urls = [originalUrl]
    const urlType = getUrlType(originalUrl)
    
    // 🔧 对于blob URL，不生成备用URL，因为它们是本地的
    if (urlType === 'blob' || urlType === 'data') {
      return urls
    }
    
    // 如果是R2 URL，尝试不同的格式
    if (originalUrl.includes('r2.dev')) {
      // 提取文件路径
      const urlParts = originalUrl.split('/')
      const fileName = urlParts.slice(-2).join('/') // 保留目录结构
      
      // 尝试不同的R2 URL格式
      const accountIdMatch = originalUrl.match(/pub-([a-f0-9]+)\.r2\.dev/)
      if (accountIdMatch) {
        const accountId = accountIdMatch[1]
        // 添加带连字符的格式
        urls.push(`https://pub-${accountId.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5')}.r2.dev/${fileName}`)
        // 添加直接访问格式（如果有bucket名称）
        if (process.env.R2_BUCKET_NAME) {
          urls.push(`https://${process.env.R2_BUCKET_NAME}.${accountId}.r2.cloudflarestorage.com/${fileName}`)
        }
      }
    }
    
    // 🔧 对于FAL URL，添加备用格式
    if (originalUrl.includes('fal.media') || originalUrl.includes('fal.ai')) {
      // FAL URL通常比较稳定，但可以尝试不同的子域名
      urls.push(originalUrl.replace('fal.media', 'storage.fal.ai'))
      urls.push(originalUrl.replace('storage.fal.ai', 'fal.media'))
    }
    
    return [...new Set(urls)] // 去重
  }

  const handleImageError = useCallback(async () => {
    const urlType = getUrlType(currentUrl)
    
    // 🔧 对于blob URL，直接标记为错误，不重试
    if (urlType === 'blob') {
      console.warn(`⚠️ Blob URL failed to load for image ${index + 1}:`, currentUrl)
      setHasError(true)
      setIsLoading(false)
      return
    }
    
    if (retryCount < 3) {
      const fallbackUrls = generateFallbackUrls(url)
      const nextUrl = fallbackUrls[retryCount + 1]
      
      if (nextUrl && nextUrl !== currentUrl) {
        console.log(`🔄 Trying fallback URL ${retryCount + 1} for image ${index + 1}:`, nextUrl)
        setCurrentUrl(nextUrl)
        setRetryCount(prev => prev + 1)
        setIsLoading(true)
        setHasError(false)
        return
      }
    }
    
    console.error(`❌ All fallback URLs failed for image ${index + 1}:`, url)
    setHasError(true)
    setIsLoading(false)
  }, [url, currentUrl, retryCount, index])

  const handleImageLoad = useCallback(() => {
    setIsLoading(false)
    setHasError(false)
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Successfully loaded image ${index + 1}:`, currentUrl)
    }
  }, [currentUrl, index])

  // 🔧 当URL改变时重置状态
  useEffect(() => {
    console.log(`🔄 URL changed for image ${index + 1}:`, {
      oldUrl: currentUrl.substring(0, 50) + '...',
      newUrl: url.substring(0, 50) + '...'
    })
    setCurrentUrl(url)
    setIsLoading(true)
    setHasError(false)
    setRetryCount(0)
  }, [url, index])

  // 🔧 添加调试信息
  useEffect(() => {
    console.log(`📁 SmartImagePreview state for image ${index + 1}:`, {
      url: url.substring(0, 50) + '...',
      currentUrl: currentUrl.substring(0, 50) + '...',
      isLoading,
      hasError,
      retryCount
    })
  }, [url, currentUrl, isLoading, hasError, retryCount, index])

  // 🔧 强制重新加载图片当URL改变时
  useEffect(() => {
    if (currentUrl) {
      console.log(`🖼️ Loading image ${index + 1}:`, currentUrl.substring(0, 50) + '...')
      setIsLoading(true)
      setHasError(false)
      
      // 🔧 预加载图片以确保能正常显示
      const img = new Image()
      img.onload = () => {
        console.log(`✅ Image ${index + 1} preloaded successfully`)
        setIsLoading(false)
        setHasError(false)
      }
      img.onerror = () => {
        console.warn(`❌ Image ${index + 1} preload failed`)
        handleImageError()
      }
      img.src = currentUrl
    }
  }, [currentUrl, index])

  // 🔧 检查blob URL是否仍然有效
  useEffect(() => {
    const urlType = getUrlType(currentUrl)
    if (urlType === 'blob') {
      // 🔧 对于blob URL，直接让浏览器处理，不进行额外检查
      // blob URL的有效性由浏览器内部管理
      console.log(`📁 Using blob URL for image ${index + 1}:`, currentUrl.substring(0, 50) + '...')
    }
  }, [currentUrl, index])

  return (
    <div className="relative">
      <div className="w-full h-32 rounded-lg border-2 overflow-hidden bg-gray-900/50 hover:border-yellow-400 transition-colors">
        {!hasError ? (
          <>
            <img 
              src={currentUrl}
              alt={alt}
              className="w-full h-full object-cover transition-opacity duration-200"
              onError={handleImageError}
              onLoad={handleImageLoad}
              style={{ display: isLoading ? 'none' : 'block' }}
              loading="lazy"
            />
            {isLoading && (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-red-900/30 border-2 border-red-600/50 rounded-lg flex flex-col items-center justify-center text-sm text-red-300 p-2">
            <div className="text-center">
              <div className="text-red-400 mb-2 text-lg">⚠️</div>
              <div className="font-medium">Load Error</div>
              <div className="text-xs opacity-80 mt-1">
                {getUrlType(url) === 'blob' ? 'Local file' : `Ref ${index + 1}`}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs mt-2 p-1 text-red-300 hover:text-red-200"
                onClick={() => {
                  setRetryCount(0)
                  setCurrentUrl(url)
                  setHasError(false)
                  setIsLoading(true)
                }}
              >
                Retry
              </Button>
            </div>
          </div>
        )}
      </div>
      <Button
        variant="destructive"
        size="sm"
        className="absolute -top-2 -right-2 h-6 w-6 p-0 text-sm bg-red-600 hover:bg-red-700 text-white border-red-600 rounded-full shadow-lg"
        onClick={onRemove}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
} 