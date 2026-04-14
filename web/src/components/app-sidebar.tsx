import { BotIcon, FlaskConicalIcon, HouseIcon, MessageSquareIcon } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar'

type AppSidebarProps = {
  appVersion: string
}

type NavigationItem = {
  title: string
  icon: typeof HouseIcon
  to: string
}

const navigationItems: NavigationItem[] = [
  {
    title: 'Home',
    to: '/',
    icon: HouseIcon,
  },
  {
    title: 'Chat',
    to: '/chat',
    icon: MessageSquareIcon,
  },
  {
    title: 'Test route',
    to: '/test/test1',
    icon: FlaskConicalIcon,
  },
]

export function AppSidebar({ appVersion }: AppSidebarProps) {
  const location = useLocation()

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="Avatar home">
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <BotIcon />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Avatar</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">
                    Frontend shell
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.to}
                    tooltip={item.title}
                  >
                    <Link to={item.to}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-0">
        <SidebarSeparator />
        <div className="flex flex-col gap-2 px-2 pt-3 group-data-[collapsible=icon]:hidden">
          <Badge variant="outline" className="w-fit">
            v{appVersion}
          </Badge>
          <p className="text-xs leading-5 text-sidebar-foreground/70">
            Official shadcn sidebar primitives now link the home shell, AgentScope chat, and sandbox route.
          </p>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
