"use client"

import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, ArrowLeftRight, Receipt, LucideIcon } from "lucide-react"
import React from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface NavItem {
  title: string
  url: string
  icon: LucideIcon
}

const items: NavItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Accounts",
    url: "/dashboard/accounts",
    icon: Users,
  },
  {
    title: "Transfer",
    url: "/dashboard/transfer",
    icon: ArrowLeftRight,
  },
  {
    title: "Transactions",
    url: "/dashboard/transactions",
    icon: Receipt,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { state } = useSidebar()

  const isItemActive = (itemUrl: string): boolean => {
    if (itemUrl === '/dashboard' && pathname !== '/dashboard') {
      return false
    }
    return pathname.startsWith(itemUrl) && (pathname === itemUrl || pathname.charAt(itemUrl.length) === '/')
  }

  return (
    <Sidebar collapsible="icon" variant="floating" className="rounded-xl font-montserrat">
      <SidebarContent className="flex flex-col">
        <div className="grow">
          <SidebarGroup>
            <SidebarGroupLabel className="px-2 py-1 text-xl font-bold mb-6 font-montserrat">MiniWallet</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton
                          asChild
                          isActive={isItemActive(item.url)}
                          className={state === "collapsed" ? "justify-center" : ""}
                        >
                          <a href={item.url} className={`flex items-center ${state === "expanded" ? "gap-2" : "justify-center w-full"}`}>
                            <item.icon className="h-4 w-4" />
                            <span className={`text-sm font-montserrat ${state === "expanded" ? "opacity-100" : "opacity-0 w-0 hidden"}`}>{item.title}</span>
                          </a>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      {state === "collapsed" && (
                        <TooltipContent side="right"><p>{item.title}</p></TooltipContent>
                      )}
                    </Tooltip>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>
      </SidebarContent>
    </Sidebar>
  )
}