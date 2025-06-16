"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StandardTurnstile, verifyStandardTurnstileToken } from "@/components/StandardTurnstile"
import { UpgradePrompt, FeatureLocked } from "@/components/UpgradePrompt"
import { CreditDisplay } from "@/components/CreditDisplay"
import { SmartImagePreview } from "@/components/SmartImagePreview"
import { 
  Upload, 
  Wand2, 
  Image as ImageIcon, 
  Loader2,
  Download,
  Settings,
  Zap,
  Layers,
  Edit,
  Plus,
  X,
  AlertCircle,
  Shield,
  RefreshCw,
  Lock,
  Crown,
  Copy,
  Sparkles,
  Info,
  Eye,
  EyeOff
} from "lucide-react"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
// İģ
import { generator, common } from "@/lib/content"

// ûֲϵ
import { 
  UserType, 
  getCurrentUserType, 
  getUserLimits, 
  getImageCountOptions, 
  getAvailableModels, 
  getAvailableAspectRatios,
  hasFeature,
  needsUpgrade
} from "@/lib/user-tiers"

// Fx KontextĲ
type FluxKontextAction = 
  | 'text-to-image-pro'
  | 'text-to-image-max'
  | 'text-to-image-schnell'
  | 'text-to-image-dev'
  | 'text-to-image-realism'
  | 'text-to-image-anime'
  | 'edit-image-pro'
  | 'edit-image-max'
  | 'edit-multi-image-pro'
  | 'edit-multi-image-max'

interface GeneratedImage {
  url: string
  width?: number
  height?: number
  prompt: string
  action: FluxKontextAction
  timestamp: number
}

interface GenerationRequest {
  action: FluxKontextAction
  prompt: string
  image_url?: string
  image_urls?: string[]
  aspect_ratio?: string
  guidance_scale?: number
  num_images?: number
  safety_tolerance?: string
  output_format?: string
  seed?: number
  turnstile_token?: string
}

export function FluxKontextGenerator() {
  const router = useRouter()
  const { data: session } = useSession()
  
  // ûֲ̬
  const [userType, setUserType] = useState<UserType>(UserType.ANONYMOUS)
  const [userLimits, setUserLimits] = useState(getUserLimits(UserType.ANONYMOUS))
  
  // 文本生成图像状态
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [error, setError] = useState("")
  
  // Turnstile验证状态
  const [turnstileToken, setTurnstileToken] = useState<string>("")
  const [isTurnstileVerified, setIsTurnstileVerified] = useState(false)
  const [turnstileError, setTurnstileError] = useState("")
  const [isTurnstileEnabled, setIsTurnstileEnabled] = useState(false)
  
  // ?? 文本生成图像状态

  // 文本生成图像状态
  const [textPrompt, setTextPrompt] = useState("")
  const [selectedModel, setSelectedModel] = useState<'pro' | 'max' | 'schnell' | 'dev' | 'realism' | 'anime'>('pro')
  const [aspectRatio, setAspectRatio] = useState("1:1")
  const [guidanceScale, setGuidanceScale] = useState(3.5)
  const [numImages, setNumImages] = useState(1)
  const [safetyTolerance, setSafetyTolerance] = useState("2")
  const [outputFormat, setOutputFormat] = useState("jpeg")
  const [seed, setSeed] = useState<number | undefined>(undefined)
  
  // 文本编辑状态
  const [editPrompt, setEditPrompt] = useState("")
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]) // ?? 文本生成图像汾ļ
  
  // 文本生成图像状态
  const [isPrivateMode, setIsPrivateMode] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [lastRequest, setLastRequest] = useState<GenerationRequest | null>(null)
  
  // 复制成功状态
  const [copySuccess, setCopySuccess] = useState("")
  
  // 生成图像的倒计时
  const [countdown, setCountdown] = useState(0)
  const [estimatedTime, setEstimatedTime] = useState(6) // 预估6秒
  
  // 多文件输入引用
  const multiFileInputRef = useRef<HTMLInputElement>(null)
  const turnstileRef = useRef<HTMLDivElement>(null)

  // ?? 自动检测用户类型
  const detectUserType = useCallback((): UserType => {
    // 根据session判断用户是否登录
    if (session?.user?.email) {
      // ?? 打印用户登录信息
      if (process.env.NODE_ENV === 'development') {
        console.log('?? User logged in:', session.user.email)
      }
      // 判断是否为付费用户
      if ((session.user as any)?.isPremium || (session.user as any)?.subscription?.status === 'active') {
        if (process.env.NODE_ENV === 'development') {
          console.log('?? Detected as PREMIUM user')
        }
        return UserType.PREMIUM
      }
      // 未登录用户
      if (process.env.NODE_ENV === 'development') {
        console.log('?? Detected as REGISTERED user')
      }
      return UserType.REGISTERED
    }
    
    // 未登录用户
    if (process.env.NODE_ENV === 'development') {
      console.log('?? Detected as ANONYMOUS user')
    }
    return UserType.ANONYMOUS
  }, [session])

  // 初始化用户类型 - ?? 自动检测用户类型
  useEffect(() => {
    const currentUserType = detectUserType()
    setUserType(currentUserType)
    setUserLimits(getUserLimits(currentUserType))
    
    // ?? 打印用户状态检测信息
    if (process.env.NODE_ENV === 'development') {
      console.log('?? User status detection:', {
        session: !!session,
        email: session?.user?.email,
        userType: currentUserType,
        maxImages: getUserLimits(currentUserType).maxImages,
        requiresTurnstile: getUserLimits(currentUserType).requiresTurnstile
      })
    }
    
    // 判断Turnstile是否启用
    const isEnabled = process.env.NEXT_PUBLIC_ENABLE_TURNSTILE === "true"
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    setIsTurnstileEnabled(isEnabled && !!siteKey)
    
    // ?? 打印Turnstile配置信息
    if (process.env.NODE_ENV === 'development') {
      console.log('?? Turnstile config:', {
        isEnabled,
        hasSiteKey: !!siteKey,
        isTurnstileEnabled: isEnabled && !!siteKey
      })
    }
    
    // 用户选择的模型
    const availableModels = getAvailableModels(currentUserType)
    if (availableModels.includes('pro')) {
      setSelectedModel('pro') // ?? 默认使用PRO模型
    } else {
      setSelectedModel('max')
    }
  }, [session, detectUserType]) // ?? 依赖session

  // 动态获取选择
  const imageCountOptions = getImageCountOptions(userType)
  const availableModels = getAvailableModels(userType)
  const aspectRatioOptions = getAvailableAspectRatios(userType)

  // ?? 自动检测用户状态 - 仅在用户类型变化时触发一次
  useEffect(() => {
    // ?? 打印用户状态初始化信息
    if (process.env.NODE_ENV === 'development') {
      console.log('?? User status initialized:', {
        userType,
        maxImages: userLimits.maxImages,
        availableModels: availableModels.length,
        session: !!session
      })
    }
  }, [userType]) // ?? 仅依赖userType

  // ?? 删除重复请求的useEffect
  // useEffect(() => {
  //   console.log('?? Current user status details:', {...})
  // }, [...]) // 删除

  // ?? 图像编辑状态 - 仅在图像变化时触发一次
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('?? Image state changed:', {
        uploadedImagesCount: uploadedImages.length,
        uploadedFilesCount: uploadedFiles.length
      })
    }
  }, [uploadedImages.length, uploadedFiles.length]) // ?? 仅依赖图像变化

  // ?? 用户状态 - useEffect仅在用户类型变化时触发一次
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('?? Current user status details:', {
        userType,
        maxImages: userLimits.maxImages,
        imageCountOptions: imageCountOptions.length,
        aspectRatioOptions: aspectRatioOptions.length,
        availableModels: availableModels.length,
        session: !!session,
        userEmail: session?.user?.email,
        uploadedImagesCount: uploadedImages.length,
        uploadedFilesCount: uploadedFiles.length
      })
    }
  }, [userType, userLimits.maxImages, imageCountOptions.length, aspectRatioOptions.length, availableModels.length, session?.user?.email, uploadedImages.length, uploadedFiles.length]) // ?? 仅依赖用户类型和图像变化

  // 全量选择 - 使用generator模型
  const safetyOptions = [
    { value: "1", label: generator.safetyLevels["1"] },
    { value: "2", label: generator.safetyLevels["2"] },
    { value: "3", label: generator.safetyLevels["3"] },
    { value: "4", label: generator.safetyLevels["4"] },
    { value: "5", label: generator.safetyLevels["5"] }
  ]

  // 用户是否可以使用图像数量
  const canUseImageCount = useCallback((count: number): boolean => {
    const canUse = count <= userLimits.maxImages
    // ?? 打印检查图像数量权限信息
    // console.log(`?? Check image count permission: ${count} images <= ${userLimits.maxImages} images = ${canUse}`)
    return canUse
  }, [userLimits.maxImages])

  // 获取升级信息
  const getUpgradeMessage = (count: number): string => {
    if (count <= userLimits.maxImages) return ""
    
    if (userType === UserType.ANONYMOUS) {
      return "Sign up to generate up to 4 images"
    } else if (userType === UserType.REGISTERED) {
      return "Upgrade to Premium to generate up to 12 images"
    }
    return ""
  }

  // ?? 处理本地文件预览
  const handleLocalFilePreview = useCallback((file: File): string => {
    // 生成预览URL
    const previewUrl = URL.createObjectURL(file)
    console.log(`?? Created local preview URL for: ${file.name}`)
    return previewUrl
  }, [])

  // ?? 处理文件上传
  const handleFileUpload = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/flux-kontext', {
      method: 'PUT',
      body: formData
    })

    if (!response.ok) {
      let errorData: any = {}
      
      try {
        // 全量JSON
        const responseText = await response.text()
        if (responseText.trim()) {
          errorData = JSON.parse(responseText)
        }
      } catch (parseError) {
        console.warn('?? Failed to parse upload error response as JSON:', parseError)
        errorData = { 
          message: `Upload failed (${response.status}): ${response.statusText}`,
          error: 'JSON parse failed'
        }
      }
      
      throw new Error(errorData.message || 'File upload failed')
    }

    let data: any = {}
    try {
      // 全量JSON
      const responseText = await response.text()
      if (responseText.trim()) {
        data = JSON.parse(responseText)
      }
    } catch (parseError) {
      console.error('? Failed to parse upload success response as JSON:', parseError)
      throw new Error('Invalid response format from upload server')
    }
    
    return data.url
  }, [])

  // ?? 处理多图像上传
  const handleMultiImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    
    // ?? 处理input的value，确保选择的是相同的文件
    if (event.target) {
      event.target.value = ''
    }
    
    if (files.length === 0) return

    try {
      // ?? 等待预览
      const previewUrls = files.map(file => handleLocalFilePreview(file))
      
      // 设置图像状态，显示预览
      setUploadedFiles(prev => [...prev, ...files])
      setUploadedImages(prev => [...prev, ...previewUrls])
      setError("")
      
      console.log(`?? Added ${files.length} files for local preview`)
      
      // ?? 开始立即上传到R2存储
      console.log(`?? Starting immediate upload to R2 storage...`)
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        try {
          console.log(`?? Uploading file ${i + 1}/${files.length}: ${file.name}`)
          const r2Url = await handleFileUpload(file)
          console.log(`? R2 Upload successful for ${file.name}:`)
          console.log(`?? R2 URL: ${r2Url}`)
          
          // 检查R2 URL是否可访问
          try {
            const testResponse = await fetch(r2Url, { method: 'HEAD', mode: 'cors' })
            console.log(`?? R2 URL test result:`, {
              url: r2Url,
              status: testResponse.status,
              ok: testResponse.ok
            })
            
            if (testResponse.ok) {
              console.log(`? R2 URL is publicly accessible: ${r2Url}`)
              
              // 替换预览URL为R2 URL
              setUploadedImages(prev => {
                const newImages = [...prev]
                const targetIndex = prev.length - files.length + i
                if (targetIndex >= 0 && targetIndex < newImages.length) {
                  if (newImages[targetIndex].startsWith('blob:')) {
                    URL.revokeObjectURL(newImages[targetIndex])
                  }
                  newImages[targetIndex] = r2Url
                  console.log(`?? Replaced blob URL with R2 URL at index ${targetIndex}`)
                }
                return newImages
              })
            } else {
              console.warn(`?? R2 URL not accessible (${testResponse.status}): ${r2Url}`)
            }
          } catch (testError) {
            console.warn(`?? R2 URL accessibility test failed:`, testError)
            console.log(`?? R2 URL (untested): ${r2Url}`)
          }
          
        } catch (uploadError: any) {
          console.error(`? R2 upload failed for ${file.name}:`, uploadError.message)
        }
      }
    } catch (error: any) {
      setError(error.message)
    }
  }, [handleLocalFilePreview, handleFileUpload])

  // ?? 处理拖放
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    )

    if (files.length === 0) return

    try {
      // ?? 等待预览
      const previewUrls = files.map(file => handleLocalFilePreview(file))
      
      console.log(`?? About to update state with ${files.length} files:`, {
        fileNames: files.map(f => f.name),
        previewUrls: previewUrls.map(url => url.substring(0, 50) + '...')
      })
      
      // 设置图像状态，显示预览
      setUploadedFiles(prev => {
        const newFiles = [...prev, ...files]
        console.log(`?? Updated uploadedFiles: ${prev.length} -> ${newFiles.length}`)
        return newFiles
      })
      setUploadedImages(prev => {
        const newImages = [...prev, ...previewUrls]
        console.log(`?? Updated uploadedImages: ${prev.length} -> ${newImages.length}`)
        return newImages
      })
      setError("")
      
      console.log(`?? Dropped ${files.length} files for local preview`)
      
      // ?? 开始立即上传到R2存储
      console.log(`?? Starting immediate upload to R2 storage...`)
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        try {
          console.log(`?? Uploading file ${i + 1}/${files.length}: ${file.name}`)
          const r2Url = await handleFileUpload(file)
          console.log(`? R2 Upload successful for ${file.name}:`)
          console.log(`?? R2 URL: ${r2Url}`)
          console.log(`?? Testing R2 URL accessibility...`)
          
          // 检查R2 URL是否可访问
          try {
            const testResponse = await fetch(r2Url, { 
              method: 'HEAD',
              mode: 'cors'
            })
            console.log(`?? R2 URL test result:`, {
              url: r2Url,
              status: testResponse.status,
              statusText: testResponse.statusText,
              ok: testResponse.ok,
              headers: {
                'content-type': testResponse.headers.get('content-type'),
                'content-length': testResponse.headers.get('content-length'),
                'access-control-allow-origin': testResponse.headers.get('access-control-allow-origin')
              }
            })
            
            if (testResponse.ok) {
              console.log(`? R2 URL is publicly accessible: ${r2Url}`)
              
              // ?? 替换预览URL为R2 URL
              setUploadedImages(prev => {
                const newImages = [...prev]
                const targetIndex = prev.length - files.length + i // 确定索引
                if (targetIndex >= 0 && targetIndex < newImages.length) {
                  // 获取blob URL
                  if (newImages[targetIndex].startsWith('blob:')) {
                    URL.revokeObjectURL(newImages[targetIndex])
                  }
                  newImages[targetIndex] = r2Url
                  console.log(`?? Replaced blob URL with R2 URL at index ${targetIndex}`)
                }
                return newImages
              })
            } else {
              console.warn(`?? R2 URL not accessible (${testResponse.status}): ${r2Url}`)
            }
          } catch (testError) {
            console.warn(`?? R2 URL accessibility test failed:`, testError)
            console.log(`?? R2 URL (untested): ${r2Url}`)
          }
          
        } catch (uploadError: any) {
          console.error(`? R2 upload failed for ${file.name}:`, uploadError.message)
          // 使用默认预览URL
        }
      }
      
    } catch (error: any) {
      setError(error.message)
    }
  }, [handleLocalFilePreview, handleFileUpload])

  // ?? 处理粘贴
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items)
    const imageItems = items.filter(item => item.type.startsWith('image/'))

    if (imageItems.length === 0) return

    e.preventDefault()

    try {
      const files: File[] = []
      const previewUrls: string[] = []
      
      // ?? 等待预览
      imageItems.forEach((item) => {
        const file = item.getAsFile()
        if (file) {
          files.push(file)
          previewUrls.push(handleLocalFilePreview(file))
        }
      })
      
      // 设置图像状态，显示预览
      setUploadedFiles(prev => [...prev, ...files])
      setUploadedImages(prev => [...prev, ...previewUrls])
      setError("")
      
      console.log(`?? Pasted ${files.length} files for local preview`)
      
      // ?? 开始立即上传到R2存储
      console.log(`?? Starting immediate upload to R2 storage...`)
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        try {
          console.log(`?? Uploading file ${i + 1}/${files.length}: ${file.name}`)
          const r2Url = await handleFileUpload(file)
          console.log(`? R2 Upload successful for ${file.name}:`)
          console.log(`?? R2 URL: ${r2Url}`)
          
          // 检查R2 URL是否可访问
          try {
            const testResponse = await fetch(r2Url, { method: 'HEAD', mode: 'cors' })
            console.log(`?? R2 URL test result:`, {
              url: r2Url,
              status: testResponse.status,
              ok: testResponse.ok
            })
            
            if (testResponse.ok) {
              console.log(`? R2 URL is publicly accessible: ${r2Url}`)
              
              // 替换预览URL为R2 URL
              setUploadedImages(prev => {
                const newImages = [...prev]
                const targetIndex = prev.length - files.length + i
                if (targetIndex >= 0 && targetIndex < newImages.length) {
                  if (newImages[targetIndex].startsWith('blob:')) {
                    URL.revokeObjectURL(newImages[targetIndex])
                  }
                  newImages[targetIndex] = r2Url
                  console.log(`?? Replaced blob URL with R2 URL at index ${targetIndex}`)
                }
                return newImages
              })
            } else {
              console.warn(`?? R2 URL not accessible (${testResponse.status}): ${r2Url}`)
            }
          } catch (testError) {
            console.warn(`?? R2 URL accessibility test failed:`, testError)
            console.log(`?? R2 URL (untested): ${r2Url}`)
          }
          
        } catch (uploadError: any) {
          console.error(`? R2 upload failed for ${file.name}:`, uploadError.message)
        }
      }
    } catch (error: any) {
      setError(error.message)
    }
  }, [handleLocalFilePreview, handleFileUpload])

  // Turnstile验证
  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token)
    setIsTurnstileVerified(true)
    setTurnstileError("")
    console.log("Turnstile verification successful, token:", token)
  }, [])

  const handleTurnstileError = useCallback((error: string) => {
    setTurnstileToken("")
    setIsTurnstileVerified(false)
    setTurnstileError(error)
    console.error("Turnstile verification failed:", error)
    
    // ?? Զˢ߼
    if (error.includes('600010') || error.includes('timeout') || error.includes('network')) {
      console.log('?? Detected network/timeout error, auto-refreshing in 3 seconds...')
      setTurnstileError("Network error detected, auto-refreshing...")
      
      setTimeout(() => {
        console.log('?? Auto-refreshing Turnstile widget...')
        setTurnstileError("")
        setIsTurnstileVerified(false)
        setTurnstileToken("")
        
        // Turnstile widget
        if (turnstileRef.current && (turnstileRef.current as any).reset) {
          (turnstileRef.current as any).reset()
        }
      }, 3000)
    }
  }, [])

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken("")
    setIsTurnstileVerified(false)
    setTurnstileError("Verification expired, auto-refreshing...")
    console.log("Turnstile verification expired, will auto-refresh")
    
    // 2ϢԶˢЧ
    setTimeout(() => {
      setTurnstileError("")
    }, 2000)
  }, [])




  // 是否需要Turnstile验证 - 🔧 修复智能验证逻辑
  const checkTurnstileRequired = useCallback(() => {
    const isEnabled = process.env.NEXT_PUBLIC_ENABLE_TURNSTILE === "true"
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    
    // ֻ5%
    if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) {
      console.log('?? Turnstile check:', {
        isEnabled,
        hasSiteKey: !!siteKey,
        userType,
        requiresTurnstile: userLimits.requiresTurnstile,
        isTurnstileEnabled,
        isTurnstileVerified,
        hasToken: !!turnstileToken
      })
    }
    
    // Turnstileδûȱãֱӷfalse
    if (!isEnabled || !siteKey) {
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) {
        console.log('?? Turnstile disabled: missing config')
      }
      return false
    }
    
    // ûȷ֤
    if (userLimits.requiresTurnstile === false) {
      // ûȷ֤
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) {
        console.log('?? Turnstile disabled: premium user')
      }
      return false
    }
    
    if (userLimits.requiresTurnstile === 'smart') {
      // עû֤֤ͲҪ֤
      if (isTurnstileVerified && turnstileToken) {
        if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) {
          console.log('?? Turnstile smart mode: already verified, no need to verify again')
        }
        return false
      } else {
        if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) {
          console.log('?? Turnstile smart mode: verification required')
        }
        return true
      }
    }
    
    // ûҪ֤
    if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) {
      console.log('?? Turnstile required: anonymous user')
    }
    return userLimits.requiresTurnstile === true
  }, [userLimits.requiresTurnstile, userType, isTurnstileEnabled, isTurnstileVerified, turnstileToken])

  // 验证Turnstile token（如果启用）- 🔧 修复智能验证逻辑
  const validateTurnstile = useCallback(async (): Promise<boolean> => {
    const needsVerification = checkTurnstileRequired()
    
    if (!needsVerification) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Turnstile verification not required for this user type or already verified')
      }
      return true // 不需要验证，直接通过
    }

    // 🔧 修改：智能验证模式下，如果已经验证过就不需要再验证
    if (userLimits.requiresTurnstile === 'smart' && isTurnstileVerified && turnstileToken) {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Turnstile smart mode: using existing verification')
      }
      return true
    }

    // 如果需要验证但没有token或未验证，需要完成验证
    if (!isTurnstileVerified || !turnstileToken) {
      console.log('❌ Turnstile verification required but not completed')
      setError("Please complete human verification to continue")
      return false
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Turnstile verification passed')
    }
    return true
  }, [checkTurnstileRequired, isTurnstileVerified, turnstileToken, userLimits.requiresTurnstile])

  // ͼƬ֧4ŵ
  const batchGenerate = useCallback(async (request: GenerationRequest) => {
    const maxPerBatch = 4 // FAL API֧4
    const totalImages = request.num_images || 1
    const batches = Math.ceil(totalImages / maxPerBatch)
    
    let allImages: any[] = []
    
    for (let i = 0; i < batches; i++) {
      const batchSize = Math.min(maxPerBatch, totalImages - i * maxPerBatch)
      const batchRequest = { ...request, num_images: batchSize }
      
      try {
        const response = await fetch('/api/flux-kontext', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(batchRequest)
        })

        if (!response.ok) {
          let errorData: any = {}
          
          try {
            // ȫJSON
            const responseText = await response.text()
            if (responseText.trim()) {
              errorData = JSON.parse(responseText)
            }
          } catch (parseError) {
            console.warn('?? Failed to parse error response as JSON:', parseError)
            errorData = { 
              message: `Server error (${response.status}): ${response.statusText}`,
              error: 'JSON parse failed'
            }
          }
          
          // ͳһTurnstile֤ʧܴ
          if (errorData.code === 'TURNSTILE_VERIFICATION_FAILED' || 
              errorData.code === 'TURNSTILE_RETRY_REQUIRED' ||
              errorData.error?.includes('Human verification')) {
            console.log('?? Detected Turnstile verification failed, auto reset verification state')
            setIsTurnstileVerified(false)
            setTurnstileToken("")
            setTurnstileError("Verification failed, please verify again")
            
            // Turnstile widget
            if (turnstileRef.current && (turnstileRef.current as any).reset) {
              (turnstileRef.current as any).reset()
            }
            
            setError("Human verification failed, please complete verification again and try")
            return
          }
          
          throw new Error(errorData.message || `Server error: ${response.status} ${response.statusText}`)
        }

        let data: any = {}
        try {
          // ȫJSON
          const responseText = await response.text()
          console.log('?? Success response text length:', responseText.length)
          
          // ǿӦ
          if (!responseText || responseText.trim().length === 0) {
            console.error('? Empty response from server')
            throw new Error('Server returned empty response - please try again')
          }
          
          if (responseText.trim().length <= 2) {
            console.error('? Minimal response from server:', responseText)
            throw new Error('Server returned minimal response - this may be a temporary issue, please try again')
          }
          
          if (responseText.trim()) {
            data = JSON.parse(responseText)
            console.log('? Successfully parsed response data:', {
              success: data.success,
              hasData: !!data.data,
              hasImages: !!data.data?.images || !!data.images,
              imageCount: data.data?.images?.length || data.images?.length || 0,
              dataKeys: Object.keys(data),
              responseLength: responseText.length,
              // ϸݽṹ
              dataStructure: {
                topLevelKeys: Object.keys(data),
                dataKeys: data.data ? Object.keys(data.data) : null,
                hasError: !!data.error,
                errorMessage: data.error || data.message,
                creditsRemaining: data.credits_remaining,
                // ͼƬֶ
                possibleImageFields: {
                  'data.images': !!data.data?.images,
                  'images': !!data.images,
                  'data.result': !!data.data?.result,
                  'result': !!data.result,
                  'data.output': !!data.data?.output,
                  'output': !!data.output
                }
              },
              // ʾϢ
              fullError: data.error ? {
                error: data.error,
                message: data.message,
                details: data.details
              } : null,
              // ʾӦǰ500ַ
              responsePreview: responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''),
              // ʾdataṹ
              fullDataObject: JSON.stringify(data, null, 2).substring(0, 1000) + (JSON.stringify(data).length > 1000 ? '...' : '')
            })
            
            // Chromeչͻ
            if (data.error && data.error.includes('chrome-extension')) {
              console.warn('?? Chrome extension conflict detected')
              throw new Error('Browser extension conflict detected. Please disable ad blockers or privacy extensions and try again.')
            }
            
            // Ӧ
            if (data.success === true && (!data.data || Object.keys(data.data || {}).length === 0)) {
              console.error('? Server returned success but no data')
              throw new Error('Server processing completed but no images were generated. This may be due to content policy restrictions or temporary service issues.')
            }
          }
        } catch (parseError) {
          console.error('? Failed to parse success response as JSON:', parseError)
          throw new Error('Invalid response format from server - please try again')
        }
        
        if (data.success && (data.data?.images || data.images)) {
          const images = data.data?.images || data.images
          allImages.push(...images)
        }
      } catch (error) {
        console.error(`Batch ${i + 1} failed:`, error)
        if (i === 0) throw error // һʧ׳
      }
    }
    
    return { images: allImages }
  }, [])

  // ͼĺĺ
  const generateImage = useCallback(async (request: GenerationRequest) => {
    let countdownInterval: NodeJS.Timeout | null = null // 倒计时定时器
    const startTime = Date.now() // 🔧 将startTime移到函数顶部
    
    try {
      setIsGenerating(true)
      setError("")
      setLastRequest(request) // 保存请求

      // 🔧 添加详细的请求开始日志
      console.log('🚀 ===== 图像生成开始 =====')
      console.log('🔧 Starting image generation:', {
        action: request.action,
        prompt: request.prompt?.substring(0, 100) + '...',
        hasImages: !!(request.image_url || request.image_urls),
        numImages: request.num_images || 1,
        userType,
        timestamp: new Date().toISOString(),
        fullRequest: {
          action: request.action,
          prompt: request.prompt,
          image_url: request.image_url,
          image_urls: request.image_urls,
          aspect_ratio: request.aspect_ratio,
          guidance_scale: request.guidance_scale,
          num_images: request.num_images,
          safety_tolerance: request.safety_tolerance,
          output_format: request.output_format,
          seed: request.seed,
          turnstile_token: request.turnstile_token ? '已设置' : '未设置'
        }
      })

      // 🔧 倒计时逻辑 - 根据不同模型预估时间
      const getEstimatedTime = (action: FluxKontextAction) => {
        switch (action) {
          case 'text-to-image-schnell':
            return 7 // Schnell模型较快 (3+4秒缓冲)
          case 'text-to-image-pro':
          case 'edit-image-pro':
          case 'edit-multi-image-pro':
            return 10 // Pro模型中等速度 (6+4秒缓冲)
          case 'text-to-image-max':
          case 'edit-image-max':
          case 'edit-multi-image-max':
            return 14 // Max模型较慢 (10+4秒缓冲)
          case 'text-to-image-dev':
            return 12 // Dev模型中等偏慢 (8+4秒缓冲)
          case 'text-to-image-realism':
          case 'text-to-image-anime':
            return 16 // LoRA模型需要更多时间 (12+4秒缓冲)
          default:
            return 10 // 默认10秒+4秒缓冲
        }
      }
      
      const currentEstimatedTime = getEstimatedTime(request.action)
      setCountdown(currentEstimatedTime)
      
      console.log(`⏱️ 预估生成时间: ${currentEstimatedTime}秒`)
      
      countdownInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        const remaining = Math.max(0, currentEstimatedTime - elapsed)
        setCountdown(remaining)
        
        if (remaining <= 0 && countdownInterval) {
          clearInterval(countdownInterval)
          countdownInterval = null
        }
      }, 1000)

      // 用户权限检查
      if (needsUpgrade(userType, request.num_images || 1)) {
        console.log('❌ 用户权限不足:', {
          userType,
          requestedImages: request.num_images || 1,
          maxAllowed: userLimits.maxImages
        })
        if (countdownInterval) {
          clearInterval(countdownInterval) // 清除倒计时
          countdownInterval = null
        }
        setCountdown(0)
        setError(`Upgrade required: Current plan allows up to ${userLimits.maxImages} images. Click the upgrade button to get more.`)
        return
      }

      // 🔧 使用增强的Turnstile验证
      console.log('🔐 开始Turnstile验证检查...')
      const isVerified = await validateTurnstile()
      if (!isVerified) {
        console.log('❌ Turnstile验证失败')
        if (countdownInterval) {
          clearInterval(countdownInterval)
          countdownInterval = null
        }
        setCountdown(0)
        return
      }
      console.log('✅ Turnstile验证通过')

      // 如果验证通过，尝试获取token
      let turnstileTokenToUse: string | null = null
      if (checkTurnstileRequired()) {
        if (isTurnstileVerified && turnstileToken) {
          turnstileTokenToUse = turnstileToken
          console.log('🔧 Using Turnstile verification token:', turnstileToken.substring(0, 20) + '...')
        }
        
        if (turnstileTokenToUse) {
          request.turnstile_token = turnstileTokenToUse
        }
      }

      console.log('📡 准备发送API请求到 /api/flux-kontext...')
      console.log('📋 最终请求数据:', JSON.stringify(request, null, 2))

      let result
      
      // 如果需要生成超过4张图片且用户有权限，使用批量生成
      if ((request.num_images || 1) > 4 && hasFeature(userType, 'batchGeneration')) {
        console.log('🔄 使用批量生成模式 (>4张图片)')
        result = await batchGenerate(request)
      } else {
        console.log('📡 发送单次API请求...')
        const response = await fetch('/api/flux-kontext', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(request)
        })

        console.log('📨 API响应接收完成:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries()),
          url: response.url,
          type: response.type,
          redirected: response.redirected
        })

        if (!response.ok) {
          console.log('❌ API响应状态不正常，开始解析错误信息...')
          let errorData: any = {}
          
          try {
            // 完全读取JSON响应
            const responseText = await response.text()
            console.log('📄 错误响应原始文本:', {
              length: responseText.length,
              preview: responseText.substring(0, 1000),
              full: responseText
            })
            
            if (responseText.trim()) {
              errorData = JSON.parse(responseText)
              console.log('📋 解析后的错误数据:', errorData)
            }
          } catch (parseError) {
            console.warn('⚠️ 解析错误响应JSON失败:', parseError)
            errorData = { 
              message: `Server error (${response.status}): ${response.statusText}`,
              error: 'JSON parse failed'
            }
          }
          
          // 统一处理Turnstile验证失败错误
          if (errorData.code === 'TURNSTILE_VERIFICATION_FAILED' || 
              errorData.code === 'TURNSTILE_RETRY_REQUIRED' ||
              errorData.error?.includes('Human verification')) {
            console.log('🔧 检测到Turnstile验证失败，自动重置验证状态')
            setIsTurnstileVerified(false)
            setTurnstileToken("")
            setTurnstileError("Verification failed, please verify again")
            
            // 重置Turnstile widget
            if (turnstileRef.current && (turnstileRef.current as any).reset) {
              (turnstileRef.current as any).reset()
            }
            
            setError("Human verification failed, please complete verification again and try")
            return
          }
          
          throw new Error(errorData.message || `Server error: ${response.status} ${response.statusText}`)
        }

        console.log('✅ API响应状态正常，开始解析成功响应...')
        let data: any = {}
        let responseText = '' // 🔧 将responseText声明移到外层作用域
        try {
          // 完全读取JSON响应
          responseText = await response.text()
          console.log('📄 ===== API响应详细分析 =====')
          console.log('📋 响应状态:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries())
          })
          console.log('📄 响应原始文本 (完整):', responseText)
          console.log('📄 响应文本长度:', responseText.length)
          console.log('📄 响应文本前1000字符:', responseText.substring(0, 1000))
          
          // 🔧 增强响应验证
          if (!responseText || responseText.trim().length === 0) {
            console.error('❌ 服务器返回空响应')
            throw new Error('Server returned empty response - please try again')
          }
          
          if (responseText.trim().length <= 2) {
            console.error('❌ 服务器返回极简响应:', responseText)
            throw new Error('Server returned minimal response - this may be a temporary issue, please try again')
          }
          
          if (responseText.trim()) {
            data = JSON.parse(responseText)
            
            // 🔧 超详细的响应数据结构分析
            console.log('📊 ===== 解析后的JSON数据结构分析 =====')
            console.log('📋 JSON解析成功，数据类型:', typeof data)
            console.log('📋 顶级字段:', Object.keys(data))
            console.log('📋 完整JSON对象 (格式化):', JSON.stringify(data, null, 2))
            
            // 🔧 检查所有可能的错误字段
            console.log('🔍 ===== 错误字段检查 =====')
            console.log('🔍 data.error:', data.error)
            console.log('🔍 data.message:', data.message)
            console.log('🔍 data.success:', data.success)
            console.log('🔍 data.code:', data.code)
            console.log('🔍 data.details:', data.details)
            
            // 🔧 检查数据字段
            console.log('🔍 ===== 数据字段检查 =====')
            console.log('🔍 data.data:', !!data.data)
            console.log('🔍 data.data类型:', typeof data.data)
            if (data.data) {
              console.log('🔍 data.data字段:', Object.keys(data.data))
              console.log('🔍 data.data.images:', !!data.data.images)
              console.log('🔍 data.data.images长度:', data.data.images?.length || 0)
            }
            
            // 🔧 检查直接图像字段
            console.log('🔍 data.images:', !!data.images)
            console.log('🔍 data.images长度:', data.images?.length || 0)
            
            // 🔧 检查其他可能的字段
            console.log('🔍 ===== 其他字段检查 =====')
            console.log('🔍 data.result:', !!data.result)
            console.log('🔍 data.output:', !!data.output)
            console.log('🔍 data.credits_remaining:', data.credits_remaining)
            console.log('🔍 data.safety_check:', !!data.safety_check)
            console.log('🔍 data.warning:', data.warning)
            
            // 🔧 首先检查是否有错误信息
            if (data.error) {
              console.error('❌ ===== 发现错误字段 =====')
              console.error('❌ data.error:', data.error)
              console.error('❌ data.message:', data.message)
              console.error('❌ data.details:', data.details)
              console.error('❌ data.code:', data.code)
              console.error('❌ 完整错误对象:', JSON.stringify({
                error: data.error,
                message: data.message,
                details: data.details,
                code: data.code
              }, null, 2))
              throw new Error(data.message || data.error || 'Server returned an error')
            }
            
            // 🔧 检查success字段
            if (data.success === false) {
              console.error('❌ ===== success字段为false =====')
              console.error('❌ data.success:', data.success)
              console.error('❌ data.message:', data.message)
              console.error('❌ data.error:', data.error)
              throw new Error(data.message || data.error || 'Server returned success: false')
            }
            
            // 🔧 检查Chrome扩展冲突
            if (data.error && data.error.includes('chrome-extension')) {
              console.warn('⚠️ 检测到Chrome扩展冲突')
              throw new Error('Browser extension conflict detected. Please disable ad blockers or privacy extensions and try again.')
            }
            
            // 🔧 检查成功响应但无数据
            if (data.success === true && (!data.data || Object.keys(data.data || {}).length === 0)) {
              console.error('❌ 服务器返回成功但无数据')
              console.error('❌ data.success:', data.success)
              console.error('❌ data.data:', data.data)
              console.error('❌ data.data字段数量:', data.data ? Object.keys(data.data).length : 0)
              throw new Error('Server processing completed but no images were generated. This may be due to content policy restrictions or temporary service issues.')
            }
            
            console.log('✅ ===== 响应验证通过 =====')
          }
        } catch (parseError) {
          console.error('❌ 解析成功响应JSON失败:', parseError)
          console.error('❌ 原始响应文本:', responseText)
          throw new Error('Invalid response format from server - please try again')
        }
        
        // 🔧 修改：确保正确处理result，兼容不同的响应数据结构
        result = data.data || data
      }
      
      // 🔧 增强测试，检查result结构
      console.log('🔍 最终result结构分析:', {
        hasResult: !!result,
        resultType: typeof result,
        hasImages: !!result?.images,
        imagesCount: result?.images?.length || 0,
        resultKeys: result ? Object.keys(result) : [],
        firstImageUrl: result?.images?.[0]?.url?.substring(0, 50) + '...' || 'N/A',
        // 🔧 添加完整result对象用于调试
        fullResult: JSON.stringify(result, null, 2).substring(0, 1500) + (JSON.stringify(result).length > 1500 ? '...' : '')
      })
      
      if (result && result.images) {
        console.log('🖼️ 开始处理生成的图像...')
        const newImages: GeneratedImage[] = result.images.map((img: any, index: number) => {
          console.log(`🔍 处理图像 ${index + 1}:`, {
            url: img.url?.substring(0, 50) + '...',
            width: img.width,
            height: img.height,
            hasUrl: !!img.url,
            urlLength: img.url?.length || 0
          })
          return {
            url: img.url,
            width: img.width,
            height: img.height,
            prompt: request.prompt,
            action: request.action,
            timestamp: Date.now()
          }
        })
        
        // 🔧 临时禁用过于严格的图像质量检测系统
        const suspiciousImages: Array<{index: number, image: GeneratedImage, reason: string}> = []
        const nsfwDetectedImages: Array<{index: number, image: GeneratedImage, reason: string}> = []
        
        console.log('🔍 开始图像质量检测...')
        
        // 🔧 只保留NSFW检测，移除其他过于严格的检测
        for (let i = 0; i < newImages.length; i++) {
          const img = newImages[i]
          const originalImg = result.images[i] // 获取原始API返回数据
          const urlLower = img.url.toLowerCase()
          let isNsfwDetected = false
          
          console.log(`🔍 检测图像 ${i + 1}:`, {
            url: img.url?.substring(0, 50) + '...',
            urlLength: img.url?.length || 0,
            width: img.width,
            height: img.height
          })
          
          // ✅ 只保留NSFW检测（基于API返回的has_nsfw_concepts字段）
          const hasNsfwConcepts = result.has_nsfw_concepts && 
                                 Array.isArray(result.has_nsfw_concepts) && 
                                 result.has_nsfw_concepts[i] === true
          
          if (hasNsfwConcepts) {
            isNsfwDetected = true
            console.warn(`🚨 图像 ${i + 1} 被API标记为NSFW:`, {
              url: img.url.substring(0, 50) + '...',
              hasNsfwConcepts
            })
            nsfwDetectedImages.push({ index: i, image: img, reason: 'nsfw_content' })
          } else {
            // 🔧 记录正常图像信息
            console.log(`✅ 图像 ${i + 1} 通过检测:`, {
              url: img.url.substring(0, 50) + '...',
              width: img.width,
              height: img.height,
              hasNsfwConcepts: false
            })
          }
        }
        
        // 🔧 只处理真正的NSFW检测到的图像
        if (nsfwDetectedImages.length > 0) {
          console.warn(`🚨 检测到 ${nsfwDetectedImages.length} 张NSFW内容图像`)
          
          // 创建专门的NSFW错误信息
          const nsfwMessage = nsfwDetectedImages.length === newImages.length 
            ? "Content not displayed due to NSFW detection. Your prompt may contain adult or inappropriate content that violates our community guidelines. Please modify your prompt to create family-friendly content."
            : `${nsfwDetectedImages.length} out of ${newImages.length} images were not displayed due to NSFW detection. Please consider adjusting your prompt to avoid adult or inappropriate content.`
          
          setError(nsfwMessage)
          
          // 如果所有图片都是NSFW检测，可以尝试重新生成1次（更安全参数）
          if (nsfwDetectedImages.length === newImages.length && retryCount < 1) {
            console.log(`🔄 所有图像都被标记为NSFW，尝试使用更安全的参数重试...`)
            setRetryCount(prev => prev + 1)
            
            // 修改参数重试：降低guidance_scale和safety_tolerance
            const retryRequest = {
              ...request,
              guidance_scale: Math.max(1.0, (request.guidance_scale || 3.5) - 1.0), // 降低强度
              safety_tolerance: "1", // 使用最严格的安全设置
              seed: Math.floor(Math.random() * 1000000) // 随机种子
            }
            
            console.log(`🔄 重试参数:`, {
              guidance_scale: retryRequest.guidance_scale,
              safety_tolerance: retryRequest.safety_tolerance,
              seed: retryRequest.seed
            })
            
            // 延迟3秒重试
            setTimeout(() => {
              generateImage(retryRequest)
            }, 3000)
            return
          }
          
          // 🔧 如果有部分图像通过检测，显示通过的图像
          const validImages = newImages.filter((_, index) => 
            !nsfwDetectedImages.some(nsfw => nsfw.index === index)
          )
          
          if (validImages.length > 0) {
            console.log(`✅ 显示 ${validImages.length} 张有效图像，共 ${newImages.length} 张`)
            setGeneratedImages(prev => [...validImages, ...prev])
            setRetryCount(0) // 重置重试计数
          }
          
          return // 不继续处理，因为已经处理了NSFW情况
        }
        
        // 🔧 移除所有其他质量检测，直接显示图像
        console.log('✅ 图像生成成功:', {
          imageCount: newImages.length,
          firstImageUrl: newImages[0]?.url?.substring(0, 50) + '...',
          duration: Date.now() - startTime,
          allImagesValid: true
        })
        
        console.log('🎉 ===== 图像生成完成 =====')
        setGeneratedImages(prev => [...newImages, ...prev])
        setRetryCount(0) // 重置重试计数
      } else {
        console.warn('⚠️ result中没有images:', result)
        throw new Error('No images generated - please try again')
      }
    } catch (error: any) {
      console.error('❌ ===== 图像生成错误 =====')
      console.error('🔥 生成错误详情:', {
        message: error.message,
        stack: error.stack,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        errorType: typeof error,
        errorConstructor: error.constructor?.name,
        fullError: error
      })
      
      // 🔧 清除倒计时
      if (countdownInterval) {
        clearInterval(countdownInterval)
        countdownInterval = null
      }
      setCountdown(0)
      
      // 🔧 记录错误信息
      let userFriendlyError = error.message || 'Image generation failed'
      
      if (error.message?.includes('fetch')) {
        userFriendlyError = 'Network error - please check your connection and try again'
      } else if (error.message?.includes('timeout')) {
        userFriendlyError = 'Request timeout - the server is taking too long to respond'
      } else if (error.message?.includes('JSON')) {
        userFriendlyError = 'Server response error - please try again'
      } else if (error.message?.includes('verification')) {
        userFriendlyError = 'Human verification failed - please complete verification and try again'
      }
      
      console.log('📝 用户友好错误信息:', userFriendlyError)
      setError(userFriendlyError)
      
      // 🔧 记录重试次数
      if (error.message.includes('verification') || error.message.includes('Verification')) {
        setRetryCount(prev => prev + 1)
      }
    } finally {
      setIsGenerating(false)
      // 🔧 确保清除倒计时定时器
      if (countdownInterval) {
        clearInterval(countdownInterval)
        setCountdown(0)
      }
      console.log('🏁 图像生成流程结束')
    }
  }, [validateTurnstile, checkTurnstileRequired, turnstileToken, batchGenerate, userType, userLimits.maxImages, userLimits.requiresTurnstile, retryCount])

  // 🔧 处理重试
  const handleRetry = useCallback(async () => {
    if (lastRequest) {
      await generateImage(lastRequest)
    }
  }, [lastRequest, generateImage])

  // ?? ����ģ�͵�API������ӳ��
  const getActionForModel = useCallback((model: string, hasImages: boolean, isMultiImage: boolean): FluxKontextAction => {
    if (hasImages) {
      // ͼ��ͼģʽ
      if (isMultiImage) {
        // ��ͼ�༭
        switch (model) {
          case 'max':
          case 'max-multi':
            return 'edit-multi-image-max'
          case 'pro':
          default:
            return 'edit-multi-image-pro'
        }
      } else {
        // ��ͼ�༭
        switch (model) {
          case 'max':
            return 'edit-image-max'
      case 'pro':
          default:
            return 'edit-image-pro'
        }
      }
    } else {
      // ����ͼģʽ
      switch (model) {
      case 'max':
          return 'text-to-image-max'
        case 'pro':
          return 'text-to-image-pro'
      case 'schnell':
          return 'text-to-image-schnell'
      case 'dev':
          return 'text-to-image-dev'
      case 'realism':
          return 'text-to-image-realism'
      case 'anime':
          return 'text-to-image-anime'
      default:
          return 'text-to-image-pro'
      }
    }
  }, [])

  // 🔧 处理文本生成图像
  const handleTextToImage = useCallback(async () => {
    if (!textPrompt.trim()) {
      setError("Please enter a prompt")
      return
    }

    const action = getActionForModel(selectedModel, false, false)
    
    await generateImage({
      action,
      prompt: textPrompt,
      aspect_ratio: aspectRatio,
      guidance_scale: guidanceScale,
      num_images: numImages,
      safety_tolerance: safetyTolerance,
      output_format: outputFormat,
      seed: seed
    })
  }, [textPrompt, selectedModel, aspectRatio, guidanceScale, numImages, safetyTolerance, outputFormat, seed, generateImage, getActionForModel])

  // ?? 🔧 处理图像编辑
  const handleImageEdit = useCallback(async () => {
    if (uploadedImages.length === 0) {
      setError("Please upload images to edit")
      return
    }

    // ?? ��������ʾ�ʣ�ʹ��Ĭ����ʾ��
    const finalPrompt = editPrompt.trim() || "enhance this image, improve quality and details"

    // ?? ����Ƿ���blob URL��Ҫ�ȴ�ת��
    const hasBlobUrls = uploadedImages.some(url => url.startsWith('blob:'))
    if (hasBlobUrls) {
      console.log('? Detected blob URLs, waiting for R2 conversion...')
      setError("Please wait for image upload to complete before editing")
      return
    }

    // ?? ��֤����URL���ǿɷ��ʵ�HTTP URL
    const invalidUrls = uploadedImages.filter(url => !url.startsWith('http'))
    if (invalidUrls.length > 0) {
      console.error('? Invalid URLs detected:', invalidUrls)
      setError("Some images are not properly uploaded. Please re-upload and try again.")
      return
    }

    // ?? ͼƬ�Ѿ���R2 URL��ֱ��ʹ��
    const imageUrls = uploadedImages
    console.log(`?? Using images for editing:`, imageUrls)

    // ?? ʹ������ģ��ѡ��
    const isMultiImage = imageUrls.length > 1
    const action = getActionForModel(selectedModel, true, isMultiImage)
    
    const requestData = isMultiImage 
      ? { image_urls: imageUrls }
      : { image_url: imageUrls[0] }
    
    console.log(`?? Image editing with prompt: "${finalPrompt}"`)
    
    // ?? 🔧 处理图像编辑
    await generateImage({
      action,
      prompt: finalPrompt,
      ...requestData,
      // ?? 🔧 处理图像编辑
      guidance_scale: guidanceScale,
      num_images: numImages,
      safety_tolerance: safetyTolerance,
      output_format: outputFormat,
      seed: seed
    })
  }, [editPrompt, uploadedImages, selectedModel, guidanceScale, numImages, safetyTolerance, outputFormat, seed, generateImage, getActionForModel]) // ?? 🔧 处理图像编辑

  // 🔧 移除上传的图像
  const removeUploadedImage = useCallback((index: number) => {
    // 🔧 移除上传的图像
    const urlToRemove = uploadedImages[index]
    if (urlToRemove && urlToRemove.startsWith('blob:')) {
      URL.revokeObjectURL(urlToRemove)
    }
    
    // 🔧 移除上传的图像
    setUploadedImages(prev => prev.filter((_, i) => i !== index))
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
    
    console.log(`??? Removed image ${index + 1} and cleaned up resources`)
  }, [uploadedImages])

  // 🔧 复制图像链接
  const handleCopyLink = useCallback(async (url: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = url
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      setCopySuccess("Link copied!")
      // 3����Զ������ʾ
      setTimeout(() => setCopySuccess(""), 3000)
    } catch (error) {
      console.error('Copy failed:', error)
      setCopySuccess("Copy failed")
      setTimeout(() => setCopySuccess(""), 3000)
    }
  }, [])

  // 🔧 下载图像
  const handleDownloadImage = useCallback(async (image: GeneratedImage) => {
    try {
      // 🔧 下载图像
      const downloadUrl = (image as any).r2_url || (image as any).fal_url || image.url
      
      console.log('?? Starting download:', {
        r2_url: (image as any).r2_url,
        fal_url: (image as any).fal_url,
        main_url: image.url,
        selected_url: downloadUrl
      })

      // 🔧 下载图像
      try {
        const response = await fetch(downloadUrl, {
          method: 'GET',
          headers: {
            'Accept': 'image/*'
          }
        })
        
        if (response.ok) {
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `flux-kontext-${Date.now()}.jpg`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          window.URL.revokeObjectURL(url)
          console.log('? Download successful via fetch')
          return
        }
      } catch (fetchError) {
        console.warn('?? Fetch download failed, trying direct link:', fetchError)
      }

      // 🔧 下载图像
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `flux-kontext-${Date.now()}.jpg`
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      
      // 🔧 添加DOM元素
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      console.log('? Download initiated via direct link')
      
    } catch (error) {
      console.error('? Download failed:', error)
      // 🔧 下载图像
      const openUrl = (image as any).fal_url || image.url
      window.open(openUrl, '_blank', 'noopener,noreferrer')
    }
  }, [])

  // 🔧 快速编辑图像
  const handleQuickEdit = useCallback(async (image: GeneratedImage, editText: string) => {
    if (!editText.trim()) {
      setError("Please enter edit instructions")
      return
    }

    console.log('?? Quick edit started:', {
      imageUrl: image.url,
      editText: editText.trim(),
      selectedModel
    })

    // 🔧 设置图像
    setUploadedImages([image.url])
    setEditPrompt(editText.trim())
    
    // 🔧 滚动到编辑区域
    window.scrollTo({ top: 0, behavior: 'smooth' })
    
    // 🔧 等待一段时间后，设置编辑提示词
    setTimeout(async () => {
      // 🔧 使用模型进行编辑
      const action = getActionForModel(selectedModel, true, false) // 图像编辑
      
      console.log(`?? Quick edit with minimal parameters`)
      
      // 🔧 处理图像编辑
      await generateImage({
        action,
        prompt: editText.trim(),
        image_url: image.url,
        // 🔧 处理图像编辑
        guidance_scale: guidanceScale,
        num_images: 1, // 图像编辑
        safety_tolerance: safetyTolerance,
        output_format: outputFormat
        // 🔧 处理随机种子
      })
    }, 500) // 500msӳȷ״̬
  }, [selectedModel, guidanceScale, safetyTolerance, outputFormat, generateImage, getActionForModel]) // 🔧 处理图像编辑

  // 🔧 处理图像预览


  // 🔧 处理拖放事件
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  // 🔧 处理模型选择
  const getAvailableModelsForContext = useCallback(() => {
    const hasImages = uploadedImages.length > 0
    const isMultiImage = uploadedImages.length > 1
    
    if (hasImages) {
      // ͼ��ͼģʽ
      const editingModels = [
        {
          value: 'pro',
          label: '⚡ Kontext [pro] -- Editing',
          description: 'Fast iterative editing, maintains character consistency',
          credits: 16, // 🔧 ¼ƷѣPROϵ16
          speed: 'Fast (6-10s)',
          quality: 'Good',
          features: ['Character consistency', 'Fast iteration', 'Style preservation'],
          available: availableModels.includes('pro'),
          recommended: true // 🔧 PROΪĬƼ
        },
        {
          value: 'max',
          label: '🚀 Kontext [max] -- Editing',
          description: 'Maximum performance with improved prompt adherence',
          credits: 32, // 🔧 ¼ƷѣMAXϵ32
          speed: 'Slower (10-15s)',
          quality: 'Excellent',
          features: ['Best quality', 'Enhanced prompt adherence', 'Typography support'],
          available: availableModels.includes('max'),
          recommended: false // 🔧 MAXĬƼ
        }
      ]
      
      // 🔧 添加多图像编辑选项
      if (isMultiImage) {
        editingModels.push({
          value: 'max-multi',
          label: '🔥 Kontext [max] -- Multi-Image Editing (Experimental)',
          description: 'Experimental multi-image editing with character consistency',
          credits: 48, // 🔧 ͼ༭48֣32+16⣩
          speed: 'Slow (15-25s)',
          quality: 'Experimental',
          features: ['Multi-image support', 'Character consistency', 'Experimental'],
          available: availableModels.includes('max'),
          recommended: false
        })
      }
      
      return editingModels
    } else {
      // 🔧 返回文本生成模型
      return [
        {
          value: 'pro',
          label: '⚡ Kontext [pro] -- Text to Image',
          description: 'Fast generation with good quality',
          credits: 16, // 🔧 ¼ƷѣPROϵ16
          speed: 'Fast (6-10s)',
          quality: 'Good',
          features: ['Fast generation', 'Good quality', 'Cost effective'],
          available: availableModels.includes('pro'),
          recommended: true // 🔧 PROΪĬƼ
        },
        {
          value: 'max',
          label: '🚀 Kontext [max] -- Text to Image',
          description: 'Best quality with enhanced prompt adherence and typography',
          credits: 32, // 🔧 ¼ƷѣMAXϵ32
          speed: 'Slower (10-15s)',
          quality: 'Excellent',
          features: ['Best quality', 'Typography support', 'Enhanced prompt adherence'],
          available: availableModels.includes('max'),
          recommended: false // 🔧 MAXΪĬƼ
        },
        {
          value: 'schnell',
          label: '⚡ Flux Schnell -- Ultra Fast',
          description: 'Ultra-fast generation in 1-4 steps',
          credits: 8,
          speed: 'Ultra Fast (2-4s)',
          quality: 'Basic',
          features: ['Ultra fast', 'Low cost', 'Basic quality'],
          available: true,
          recommended: false
        },
        {
          value: 'dev',
          label: '🔧 Flux Dev -- Development',
          description: 'Balanced quality and speed for development',
          credits: 12,
          speed: 'Medium (5-8s)',
          quality: 'Good',
          features: ['Balanced performance', 'Development friendly', 'Good quality'],
          available: true,
          recommended: false
        },
        {
          value: 'realism',
          label: '📸 Flux Realism -- Photorealistic',
          description: 'Photorealistic image generation with LoRA',
          credits: 20,
          speed: 'Medium (8-12s)',
          quality: 'Excellent',
          features: ['Photorealistic', 'LoRA enhanced', 'Natural lighting'],
          available: true,
          recommended: false
        },
        {
          value: 'anime',
          label: '🎨 Flux Anime -- Anime Style',
          description: 'Anime-style generation with LoRA',
          credits: 20,
          speed: 'Medium (8-12s)',
          quality: 'Excellent',
          features: ['Anime style', 'LoRA enhanced', 'Character design'],
          available: true,
          recommended: false
        }
      ]
    }
  }, [uploadedImages.length, availableModels])

  // 🔧 获取推荐模型
  const getRecommendedModel = useCallback(() => {
    const models = getAvailableModelsForContext()
    const recommended = models.find(m => m.recommended && m.available)
    return recommended?.value || models.find(m => m.available)?.value || 'pro'
  }, [getAvailableModelsForContext])

  // 🔧 处理模型选择变化
  useEffect(() => {
    const recommendedModel = getRecommendedModel()
    if (recommendedModel !== selectedModel) {
      setSelectedModel(recommendedModel as any)
    }
  }, [uploadedImages.length]) // 仅在图像变化时触发

  // 🔧 获取当前模型信息
  const getCurrentModelInfo = useCallback(() => {
    const models = getAvailableModelsForContext()
    return models.find(m => m.value === selectedModel) || models[0]
  }, [selectedModel, getAvailableModelsForContext])

  const currentModelInfo = getCurrentModelInfo()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* 🔧 错误提示 */}
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
          <span className="text-destructive flex-1">{error}</span>
          <div className="flex gap-2">
            {error.includes("Upgrade required") && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push('/pricing')}
                className="ml-2"
              >
                <Crown className="h-3 w-3 mr-1" />
                Upgrade Now
              </Button>
            )}
            {lastRequest && retryCount > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRetry}
                disabled={isGenerating}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setError("")}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 🔧 生成图像部分 */}
      <section className="flex flex-col py-2">
        {/* 🔧 生成图像内容 */}
        <div className="space-y-3">
          {/* 🔧 生成图像和编辑图像 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 🔧 AI图像生成模块 - 左侧独立模块 */}
            <Card className="p-8 bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900 border-2 border-purple-500/30 shadow-2xl backdrop-blur-sm">
              <div className="space-y-6">
                {/* 🔧 生成图像标题 */}
                <div className="text-center mb-8">
                  <h1 className="text-4xl sm:text-5xl font-bold text-yellow-400 mb-4">
                    Flux Kontext AI Generator
                  </h1>
                  <p className="text-xl text-yellow-300/90 mb-6 leading-relaxed">
                    Create and edit professional images with advanced AI technology
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 text-base px-4 py-2">Character Consistency</Badge>
                    <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 text-base px-4 py-2">Style Transfer</Badge>
                    <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 text-base px-4 py-2">Multi-Image Support</Badge>
                  </div>
                </div>

                {/* 🔧 模型选择 */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-lg font-semibold text-yellow-400">
                      {uploadedImages.length > 0 ? "Image Editing Model" : "Text to Image Model"}
                    </Label>
                    {currentModelInfo?.recommended && (
                      <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-400/40 text-sm">
                        Recommended
                      </Badge>
                    )}
                  </div>

                  <select
                    value={selectedModel}
                    onChange={(e) => {
                      const newModel = e.target.value
                      if (newModel === 'max-multi') {
                        setSelectedModel('max' as any)
                      } else {
                        setSelectedModel(newModel as any)
                      }
                    }}
                    className="w-full p-4 border border-purple-400/50 rounded-lg text-lg bg-slate-800/80 text-white h-14 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/30 backdrop-blur-sm"
                    style={{ fontSize: '18px' }}
                  >
                    {getAvailableModelsForContext().map((model) => (
                      <option 
                        key={model.value} 
                        value={model.value}
                        disabled={!model.available}
                      >
                        {model.label}
                        {model.recommended ? " ⭐" : ""}
                        {!model.available ? " (Upgrade required)" : ""}
                      </option>
                    ))}
                  </select>
                
                  {/* 🔧 模型信息 */}
                  {currentModelInfo && (
                    <div className="mt-4 p-4 bg-slate-800/60 border border-purple-400/30 rounded-lg backdrop-blur-sm">
                      <div className="grid grid-cols-2 gap-3 text-base">
                        <div>
                          <span className="text-yellow-400 font-semibold">Credits:</span>
                          <span className="ml-2 text-white">{currentModelInfo.credits}</span>
                        </div>
                        <div>
                          <span className="text-yellow-400 font-semibold">Speed:</span>
                          <span className="ml-2 text-white">{currentModelInfo.speed}</span>
                        </div>
                        <div>
                          <span className="text-yellow-400 font-semibold">Quality:</span>
                          <span className="ml-2 text-white">{currentModelInfo.quality}</span>
                        </div>
                        <div>
                          <span className="text-yellow-400 font-semibold">Type:</span>
                          <span className="ml-2 text-white">
                            {uploadedImages.length > 0 ? "Editing" : "Generation"}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <p className="text-base text-yellow-300/80 mb-2">
                          {currentModelInfo.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {currentModelInfo.features.map((feature, index) => (
                            <Badge 
                              key={index} 
                              variant="outline" 
                              className="bg-purple-500/10 text-purple-300 border-purple-400/30 text-sm px-2 py-1"
                            >
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 🔧 高级设置 */}
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-yellow-400 flex items-center gap-2 mb-4">
                      <Settings className="h-5 w-5" />
                      Advanced Settings
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {/* 🔧 强度 */}
                      <div>
                        <Label className="text-base font-semibold mb-2 block text-yellow-400">
                          Strength: {guidanceScale}
                        </Label>
                        <div className="space-y-2">
                          <input
                            type="range"
                            min="1"
                            max="10"
                            step="0.5"
                            value={guidanceScale}
                            onChange={(e) => setGuidanceScale(parseFloat(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                          />
                          <div className="flex justify-between text-sm text-yellow-300/60">
                            <span>Creative</span>
                            <span>Strict</span>
                          </div>
                        </div>
                      </div>

                      {/* 🔧 安全设置 */}
                      <div>
                        <Label className="text-base font-semibold mb-2 block text-yellow-400">
                          Safety: {safetyTolerance}
                        </Label>
                        <div className="space-y-2">
                          <input
                            type="range"
                            min="1"
                            max="5"
                            step="1"
                            value={parseInt(safetyTolerance)}
                            onChange={(e) => setSafetyTolerance(e.target.value)}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                          />
                          <div className="flex justify-between text-sm text-yellow-300/60">
                            <span>Strict</span>
                            <span>Permissive</span>
                          </div>
                        </div>
                      </div>

                      {/* 🔧 随机种子 */}
                      <div>
                        <Label className="text-base font-semibold mb-2 block text-yellow-400">Seed</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="Random"
                            value={seed || ""}
                            onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : undefined)}
                            className="flex-1 h-12 text-base text-white bg-slate-800/80 border-purple-400/50 focus:border-yellow-400"
                            style={{ fontSize: '16px' }}
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSeed(Math.floor(Math.random() * 1000000))}
                            title="Generate random seed"
                            className="h-12 w-12 p-0 text-lg bg-purple-600/20 border-purple-400/50 hover:bg-purple-600/40"
                          >
                            🎲
                          </Button>
                        </div>
                      </div>

                      {/* 🔧 输出格式 */}
                      <div>
                        <Label className="text-base font-semibold mb-2 block text-yellow-400">Format</Label>
                        <select
                          value={outputFormat}
                          onChange={(e) => setOutputFormat(e.target.value)}
                          className="w-full p-3 border border-purple-400/50 rounded-lg text-base bg-slate-800/80 text-white h-12 focus:border-yellow-400"
                          style={{ fontSize: '16px' }}
                        >
                          <option value="jpeg">JPEG</option>
                          <option value="png">PNG</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* 🔧 内容创作控制模块 - 右侧独立模块 */}
            <Card className="p-8 bg-gradient-to-br from-slate-900 via-blue-900/50 to-slate-900 border-2 border-blue-500/30 shadow-2xl backdrop-blur-sm">
              <div className="space-y-6">
                {/* 🔧 编辑图像描述 */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                  {/* 🔧 文本输入区域 */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-xl font-bold text-yellow-400">
                        Image Description
                      </Label>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          const currentPrompt = uploadedImages.length > 0 ? editPrompt : textPrompt
                          
                          if (!currentPrompt.trim()) {
                            const aiOptimizedPrompts = [
                              "A photorealistic portrait of a wise elderly wizard with flowing silver beard, intricate robes, magical aura, studio lighting, highly detailed",
                              "Modern minimalist architecture, clean lines, glass and steel, natural lighting, professional photography, architectural digest style",
                              "Vibrant street art mural, urban setting, colorful graffiti, dynamic composition, street photography, high contrast",
                              "Serene Japanese garden, cherry blossoms, koi pond, traditional architecture, soft morning light, zen atmosphere",
                              "Futuristic cyberpunk cityscape, neon lights, rain-soaked streets, flying vehicles, blade runner aesthetic, cinematic lighting"
                            ]
                            const optimizedPrompt = aiOptimizedPrompts[Math.floor(Math.random() * aiOptimizedPrompts.length)]
                            
                            if (uploadedImages.length > 0) {
                              setEditPrompt(optimizedPrompt)
                            } else {
                              setTextPrompt(optimizedPrompt)
                            }
                          } else {
                            const enhancedPrompt = `${currentPrompt}, photorealistic, highly detailed, professional quality, perfect lighting, sharp focus, 8k resolution`
                            
                            if (uploadedImages.length > 0) {
                              setEditPrompt(enhancedPrompt)
                            } else {
                              setTextPrompt(enhancedPrompt)
                            }
                          }
                        }}
                        className="h-10 text-base bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                      >
                        <Sparkles className="w-5 h-5 mr-2" />
                        AI Optimize
                      </Button>
                    </div>
                    
                    <Textarea
                      placeholder={uploadedImages.length > 0 
                        ? "Describe how to edit the image... (e.g., 'make it anime style', 'add sunglasses', 'change to winter scene')"
                        : "Describe the image you want to create... (e.g., 'a majestic eagle soaring over mountains')"
                      }
                      value={uploadedImages.length > 0 ? editPrompt : textPrompt}
                      onChange={(e) => {
                        if (uploadedImages.length > 0) {
                          setEditPrompt(e.target.value)
                        } else {
                          setTextPrompt(e.target.value)
                        }
                      }}
                      className="min-h-[140px] text-lg bg-gray-900 text-white border-gray-600 focus:border-yellow-400 focus:ring-yellow-400/50"
                      style={{ fontSize: '18px', lineHeight: '1.6' }}
                    />
                  </div>

                  {/* 🔧 上传图像区域 */}
                  <div>
                    <Label className="text-xl font-bold mb-3 block text-yellow-400">
                      Reference Images (Optional)
                    </Label>
                    <div 
                      className="border-2 border-dashed border-gray-600 hover:border-yellow-400 rounded-lg p-8 text-center cursor-pointer transition-all duration-200 bg-gray-900/30 hover:bg-gray-800/50 min-h-[160px] flex flex-col justify-center"
                      onClick={() => {
                        if (multiFileInputRef.current) {
                          multiFileInputRef.current.value = ''
                        }
                        multiFileInputRef.current?.click()
                      }}
                      onDragOver={handleDragOver}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <input
                        ref={multiFileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleMultiImageUpload}
                        className="hidden"
                      />
                      {uploadedImages.length > 0 ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            {uploadedImages.slice(0, 4).map((url, index) => (
                              <SmartImagePreview
                                key={index}
                                url={url}
                                alt={`Reference ${index + 1}`}
                                index={index}
                                onRemove={() => removeUploadedImage(index)}
                              />
                            ))}
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (multiFileInputRef.current) {
                                multiFileInputRef.current.value = ''
                              }
                              multiFileInputRef.current?.click()
                            }}
                            className="h-12 text-base bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                          >
                            Add More ({uploadedImages.length})
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <ImageIcon className="h-24 w-24 text-gray-400 mx-auto mb-4" />
                          <p className="text-xl text-white mb-3 font-semibold">
                            Click, drag & drop, or paste images
                          </p>
                          <p className="text-base text-gray-300">
                            Supports JPG, PNG, WebP (optional)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 🔧 图像数量和比例 */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-xl font-bold mb-3 block text-yellow-400">Images Count</Label>
                    <select
                      value={numImages.toString()}
                      onChange={(e) => {
                        const selectedCount = parseInt(e.target.value)
                        if (canUseImageCount(selectedCount)) {
                          setNumImages(selectedCount)
                        }
                      }}
                      className="w-full p-4 border border-gray-600 rounded-lg text-lg bg-gray-900 text-white h-14 focus:border-yellow-400 focus:ring-yellow-400/50"
                      style={{ fontSize: '18px' }}
                    >
                      {imageCountOptions.map((option) => (
                        <option 
                          key={option.value} 
                          value={option.value}
                          disabled={!canUseImageCount(option.value)}
                        >
                          {option.label}
                          {!canUseImageCount(option.value) ? " (Upgrade required)" : ""}
                        </option>
                      ))}
                    </select>
                    {!canUseImageCount(numImages) && (
                      <div className="mt-3 text-base text-yellow-300 bg-orange-900/20 border border-orange-600/30 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <Lock className="h-5 w-5 text-orange-400" />
                          <span className="text-orange-300 font-semibold">
                            {getUpgradeMessage(numImages)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-xl font-bold mb-3 block text-yellow-400">
                      {uploadedImages.length > 0 ? "Output Ratio" : "Aspect Ratio"}
                    </Label>
                    <select
                      value={aspectRatio}
                      onChange={(e) => setAspectRatio(e.target.value)}
                      className="w-full p-4 border border-gray-600 rounded-lg text-lg bg-gray-900 text-white h-14 focus:border-yellow-400 focus:ring-yellow-400/50"
                      style={{ fontSize: '18px' }}
                    >
                      {aspectRatioOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.icon} {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 🔧 安全验证和生成按钮 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
                  {/* 🔧 安全验证区域 */}
                  <div className="flex flex-col justify-center">
                    <div className="space-y-6">
                      {/* 🔧 安全验证组件 */}
                      <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <Shield className="h-6 w-6 text-green-400" />
                          <Label className="text-lg font-bold text-green-400">Security Verification</Label>
                        </div>
                        <StandardTurnstile 
                          onVerify={setTurnstileToken}
                          onError={() => setError("Verification failed. Please try again.")}
                          theme="dark"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 🔧 生成按钮区域 */}
                  <div className="flex flex-col justify-center">
                    <div className="text-center">
                      <Label className="text-2xl font-bold flex items-center justify-center gap-3 text-yellow-400 mb-6">
                        <Zap className="h-8 w-8" />
                        Generate Images
                      </Label>
                      <Button 
                        onClick={
                          uploadedImages.length > 0 ? handleImageEdit : handleTextToImage
                        }
                        disabled={
                          isGenerating || 
                          (uploadedImages.length === 0 && !textPrompt.trim())
                        }
                        className="w-full h-24 text-2xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black border-0 shadow-2xl hover:shadow-3xl transition-all duration-300"
                        size="lg"
                      >
                        {isGenerating ? (
                          <div className="flex items-center justify-center gap-4">
                            <Loader2 className="h-8 w-8 animate-spin" />
                            <span className="text-xl">Generating...</span>
                            {countdown > 0 && (
                              <span className="text-lg opacity-80">
                                ~{countdown}s
                              </span>
                            )}
                          </div>
                        ) : (
                          <>
                            <Zap className="mr-4 h-8 w-8" />
                            <span className="text-2xl">Generate</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* 🔧 图片展示区域 */}
      <section className="py-6 pb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-3xl sm:text-4xl font-bold flex items-center gap-3 text-white">
            <ImageIcon className="h-8 w-8" />
            Generated Images
          </h2>
          <CreditDisplay 
            showBuyButton={true}
            className="flex-shrink-0"
          />
        </div>

        {generatedImages.length === 0 ? (
          <Card className="h-[500px]">
            <CardContent className="h-full flex items-center justify-center">
              <div className="text-center">
                {isGenerating ? (
                  <>
                    <Loader2 className="h-32 w-32 text-primary/50 mx-auto mb-8 animate-spin" />
                    <h3 className="text-4xl font-bold text-white mb-4">
                      Creating your image...
                    </h3>
                    {countdown > 0 && (
                      <p className="text-2xl text-gray-300 font-semibold">
                        Estimated time remaining: ~{countdown} seconds
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-40 w-40 text-gray-400 mx-auto mb-10" />
                    <h3 className="text-4xl font-bold text-white mb-6">
                      Generated images will appear here
                    </h3>
                    <p className="text-xl text-gray-300 max-w-lg mx-auto leading-relaxed">
                      {uploadedImages.length > 0 
                        ? `Ready to edit ${uploadedImages.length} image${uploadedImages.length > 1 ? 's' : ''}. Add your editing instructions and click the generate button.`
                        : "Enter a description and click generate to create new images."
                      }
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {generatedImages.map((image, index) => (
                <Card key={index} className="group overflow-hidden border-2 hover:border-yellow-400 transition-all duration-300 shadow-lg hover:shadow-2xl">
                  <div className="relative">
                    <img 
                      src={image.url} 
                      alt={`Generated ${index + 1}`}
                      className="w-full aspect-square object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDownloadImage(image)}
                        title="Download image"
                        className="h-12 w-12 p-0 bg-purple-600 hover:bg-purple-700 text-white border-purple-600 shadow-lg text-lg"
                      >
                        <Download className="h-6 w-6" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <p className="text-lg text-white mb-4 line-clamp-2 leading-relaxed font-medium">
                      "{image.prompt}"
                    </p>
                    <div className="flex items-center justify-between text-base mb-6">
                      <Badge variant="outline" className="text-base px-4 py-2 bg-blue-600/20 text-blue-300 border-blue-500">
                        {image.action.replace('-', ' ')}
                      </Badge>
                      <span className="text-gray-300 font-semibold text-base">
                        {image.width && image.height 
                          ? `${image.width}×${image.height}`
                          : aspectRatio
                        }
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="h-12 text-base bg-blue-600 hover:bg-blue-700 text-white border-blue-600 font-semibold"
                        onClick={async () => {
                          const linkToCopy = (image as any).fal_url || image.url
                          await handleCopyLink(linkToCopy)
                        }}
                        title="Copy image URL"
                      >
                        <Copy className="w-5 h-5 mr-2" />
                        COPY
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const openUrl = (image as any).fal_url || image.url
                          window.open(openUrl, '_blank', 'noopener,noreferrer')
                        }}
                        title="Open in new page"
                        className="h-12 text-base bg-green-600 hover:bg-green-700 text-white border-green-600 font-semibold"
                      >
                        <Eye className="w-5 h-5 mr-2" />
                        VIEW
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDownloadImage(image)}
                        title="Download image"
                        className="h-12 text-base bg-purple-600 hover:bg-purple-700 text-white border-purple-600 font-semibold"
                      >
                        <Download className="w-5 h-5 mr-2" />
                        SAVE
                      </Button>
                    </div>

                    {/* 🔧 快速编辑区域 */}
                    <div className="space-y-4 pt-4 border-t border-gray-600">
                      <div className="flex items-center gap-3 mb-3">
                        <Edit className="h-5 w-5 text-yellow-400" />
                        <span className="text-lg font-bold text-yellow-400">Quick Edit</span>
                      </div>
                      <div className="flex gap-2">
                        {["Add sunglasses", "Make anime style", "Winter scene"].map((suggestion, i) => (
                          <Button
                            key={i}
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickEdit(image, suggestion)}
                            className="text-sm h-10 bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-600 flex-1 font-medium"
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Custom edit instruction..."
                          className="flex-1 h-12 text-base bg-gray-900 border-gray-600 text-white focus:border-yellow-400"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              const input = e.target as HTMLInputElement
                              if (input.value.trim()) {
                                handleQuickEdit(image, input.value.trim())
                                input.value = ''
                              }
                            }
                          }}
                          style={{ fontSize: '16px' }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement
                            if (input?.value.trim()) {
                              handleQuickEdit(image, input.value.trim())
                              input.value = ''
                            }
                          }}
                          className="h-12 px-4 text-base bg-yellow-600 hover:bg-yellow-700 text-black border-yellow-600 font-bold"
                        >
                          <Edit className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
