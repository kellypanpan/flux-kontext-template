"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { LogoVariants } from "@/components/Logo"
import { ChevronDown, User, LogOut, Code, BookOpen } from "lucide-react"
// 导入文案系统
import { common } from "@/lib/content"

export function Navigation() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isResourcesMenuOpen, setIsResourcesMenuOpen] = useState(false)
  
  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.resources-dropdown') && !target.closest('.user-dropdown')) {
        setIsResourcesMenuOpen(false)
        setIsUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const navLinks = [
    { href: "/", label: common.navigation.home },
    { href: "/generate", label: common.navigation.generate },
    { href: "/pricing", label: common.navigation.pricing },
    { 
      href: "/resources", 
      label: common.navigation.resources,
      hasDropdown: true,
      subItems: [
        { href: "/resources", label: common.navigation.resourcesHub, icon: BookOpen },
        { href: "/resources/api", label: common.navigation.apiDocs, icon: Code }
      ]
    }
  ]

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" })
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 modern-nav">
      <div className="container mx-auto px-4 h-20 flex items-center">
        {/* 左侧：Logo */}
        <div className="flex-shrink-0">
          <LogoVariants.Navigation />
        </div>
        
        {/* 中间：桌面端导航菜单 - 居中显示 */}
        <nav className="hidden md:flex items-center justify-center flex-1 space-x-8">
          {navLinks.map((link) => (
            <div key={link.href} className="relative">
              {link.hasDropdown ? (
                // Resources下拉菜单
                <div className="relative resources-dropdown">
                  <button
                    onClick={() => setIsResourcesMenuOpen(!isResourcesMenuOpen)}
                    className={`flex items-center space-x-2 relative px-4 py-2 rounded-lg transition-all duration-300 hover:bg-orange-500/10 ${
                      pathname.startsWith('/resources') 
                        ? 'text-orange-400 bg-orange-500/10' 
                        : 'text-gray-300 hover:text-orange-400'
                    }`}
                  >
                    <span className="font-medium">{link.label}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isResourcesMenuOpen ? 'rotate-180' : ''}`} />
                    {pathname.startsWith('/resources') && (
                      <div className="absolute -bottom-2 left-4 right-4 h-0.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-full" />
                    )}
                  </button>
                  
                  {/* Resources下拉菜单内容 */}
                  {isResourcesMenuOpen && (
                    <div className="absolute top-full left-0 mt-3 w-64 modern-card rounded-xl py-3 z-[9999]">
                      {link.subItems?.map((subItem) => (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          className="flex items-center space-x-3 px-4 py-3 text-sm transition-all duration-200 hover:bg-orange-500/10 text-gray-300 hover:text-orange-400"
                          onClick={() => setIsResourcesMenuOpen(false)}
                        >
                          <subItem.icon className="w-5 h-5 text-orange-400" />
                          <span className="font-medium">{subItem.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // 普通导航链接
                <Link 
                  href={link.href} 
                  className={`relative px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:bg-orange-500/10 ${
                    pathname === link.href 
                      ? 'text-orange-400 bg-orange-500/10' 
                      : 'text-gray-300 hover:text-orange-400'
                  }`}
                >
                  {link.label}
                  {pathname === link.href && (
                    <div className="absolute -bottom-2 left-4 right-4 h-0.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-full" />
                  )}
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* 右侧：桌面端用户状态和按钮 */}
        <div className="hidden md:flex items-center space-x-4 flex-shrink-0">
          {status === "loading" ? (
            <div className="w-8 h-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          ) : session ? (
            // 已登录状态
            <div className="relative user-dropdown">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-3 p-3 rounded-xl modern-card hover:bg-orange-500/10 transition-all duration-300"
              >
                {session.user?.image ? (
                  <img 
                    src={session.user.image} 
                    alt={session.user.name || "User"} 
                    className="w-8 h-8 rounded-full border-2 border-orange-500/30"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
                <span className="text-sm font-medium text-gray-300">{session.user?.name || session.user?.email}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* 用户下拉菜单 */}
              {isUserMenuOpen && (
                <div className="absolute top-full right-0 mt-3 w-52 modern-card rounded-xl py-3 z-[9999]">
                  <Link
                    href="/dashboard"
                    className="flex items-center space-x-3 px-4 py-3 text-sm transition-all duration-200 hover:bg-orange-500/10 text-gray-300 hover:text-orange-400"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <User className="w-4 h-4" />
                    <span className="font-medium">{common.navigation.dashboard}</span>
                  </Link>
                  <hr className="my-2 border-gray-700/50" />
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center space-x-3 px-4 py-3 text-sm transition-all duration-200 hover:bg-red-500/10 text-gray-300 hover:text-red-400"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="font-medium">{common.buttons.signOut}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            // 未登录状态
            <div className="flex items-center space-x-3">
              <Link href="/auth/signin">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-300 hover:text-orange-400 hover:bg-orange-500/10 font-medium px-6 py-2 rounded-lg transition-all duration-300"
                >
                  {common.navigation.login}
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button 
                  size="sm" 
                  className="modern-button font-medium px-6 py-2 text-sm rounded-lg"
                >
                  {common.buttons.signUp}
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* 移动端汉堡菜单按钮 */}
        <div className="md:hidden flex-shrink-0">
          <button
            className="p-3 hover:bg-orange-500/10 rounded-lg transition-all duration-300"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            <div className="w-6 h-6 flex flex-col justify-center items-center">
              <span className={`block w-5 h-0.5 bg-gray-300 transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-1' : ''}`} />
              <span className={`block w-5 h-0.5 bg-gray-300 transition-all duration-300 mt-1 ${isMobileMenuOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-5 h-0.5 bg-gray-300 transition-all duration-300 mt-1 ${isMobileMenuOpen ? '-rotate-45 -translate-y-1' : ''}`} />
            </div>
          </button>
        </div>
      </div>

      {/* 移动端菜单 */}
      {isMobileMenuOpen && (
        <div className="md:hidden modern-card mx-4 mb-4 rounded-xl overflow-hidden">
          <nav className="py-4 space-y-2">
            {navLinks.map((link) => (
              <div key={link.href}>
                <Link
                  href={link.href}
                  className={`block px-6 py-3 text-base font-medium transition-all duration-200 ${
                    pathname === link.href || pathname.startsWith(link.href)
                      ? 'text-orange-400 bg-orange-500/10'
                      : 'text-gray-300 hover:text-orange-400 hover:bg-orange-500/10'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
                {link.hasDropdown && link.subItems?.map((subItem) => (
                  <Link
                    key={subItem.href}
                    href={subItem.href}
                    className="block px-10 py-2 text-sm text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 transition-all duration-200"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {subItem.label}
                  </Link>
                ))}
              </div>
            ))}
            
            {/* 移动端用户操作 */}
            {!session && (
              <div className="pt-4 border-t border-gray-700/50 space-y-2 px-6">
                <Link href="/auth/signin" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start text-gray-300 hover:text-orange-400 hover:bg-orange-500/10">
                    {common.navigation.login}
                  </Button>
                </Link>
                <Link href="/auth/signup" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button className="w-full modern-button">
                    {common.buttons.signUp}
                  </Button>
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  )
} 