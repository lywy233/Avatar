import {
  BotIcon,
  ChevronsUpDownIcon,
  FlaskConicalIcon,
  FolderOpenIcon,
  HouseIcon,
  LibraryBigIcon,
  LogOutIcon,
  MessageSquareIcon,
  SettingsIcon,
  Settings2Icon,
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAgentSelection } from '@/hooks/use-agent-selection'
import { useAuth } from '@/hooks/use-auth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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

const agentNavigationItems: NavigationItem[] = [
  {
    title: 'Chat',
    to: '/chat',
    icon: MessageSquareIcon,
  },
  // TODO: Chat legacy is hidden temporarily. Remove the route and page after confirming it is no longer needed.
  // {
  //   title: 'Chat legacy',
  //   to: '/ChatTest',
  //   icon: MessageSquareIcon,
  // },
  {
    title: 'File system',
    to: '/file-system',
    icon: FolderOpenIcon,
  },
  {
    title: 'Settings',
    to: '/settings',
    icon: Settings2Icon,
  },
]

const workspaceNavigationItems: NavigationItem[] = [
  {
    title: 'Home',
    to: '/',
    icon: HouseIcon,
  },
  {
    title: 'Skills hub',
    to: '/skills-hub',
    icon: LibraryBigIcon,
  },
  {
    title: 'Model provider',
    to: '/model-provider',
    icon: SettingsIcon,
  },
  {
    title: 'Test route',
    to: '/test/test1',
    icon: FlaskConicalIcon,
  },
]

function getUserInitials(username: string | undefined): string {
  if (!username) {
    return 'AV'
  }

  return username.trim().slice(0, 2).toUpperCase() || 'AV'
}

export function AppSidebar({ appVersion }: AppSidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { agentIds, isLoading: isAgentCatalogLoading, selectedAgentId, setSelectedAgentId } = useAgentSelection()
  const { authEnabled, logout, user } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" tooltip={authEnabled ? 'Account menu' : 'Workspace menu'}>
                  <Avatar className="rounded-lg">
                    <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                      {getUserInitials(user?.username)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user?.username ?? 'Avatar'}</span>
                    <span className="truncate text-xs text-sidebar-foreground/70">
                      {authEnabled ? 'Account menu' : 'Workspace menu'}
                    </span>
                  </div>

                  <ChevronsUpDownIcon className="ml-auto group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="start" side="bottom" className="min-w-56">
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="font-semibold text-foreground">{user?.username ?? 'Avatar'}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {authEnabled ? 'Authenticated workspace' : 'Authentication disabled'}
                  </span>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                  {authEnabled ? (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to="/settings">
                          <Settings2Icon />
                          <span>Account settings</span>
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem onSelect={handleLogout}>
                        <LogOutIcon />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem asChild>
                      <Link to="/settings">
                        <Settings2Icon />
                        <span>Workspace settings</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" tooltip="Active agent">
                  <div className="flex size-8 items-center justify-center rounded-lg border border-sidebar-border/70 bg-sidebar-accent text-sidebar-accent-foreground">
                    <BotIcon className="size-4" />
                  </div>

                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{selectedAgentId}</span>
                    <span className="truncate text-xs text-sidebar-foreground/70">
                      {isAgentCatalogLoading ? 'Loading agents...' : 'Active agent'}
                    </span>
                  </div>

                  <ChevronsUpDownIcon className="ml-auto group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="start" side="bottom" className="min-w-56">
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="font-semibold text-foreground">Agent selection</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    Settings agent config will follow this selection.
                  </span>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                  {agentIds.map((agentId) => (
                    <DropdownMenuItem
                      key={agentId}
                      onSelect={() => setSelectedAgentId(agentId)}
                      className="justify-between gap-3"
                    >
                      <span>{agentId}</span>
                      {agentId === selectedAgentId ? (
                        <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                          Active
                        </Badge>
                      ) : null}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Agent · {selectedAgentId}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {agentNavigationItems.map((item) => (
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

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>App</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceNavigationItems.map((item) => (
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
            Official shadcn sidebar primitives now link the home shell, the local chat UI,
            Skills Hub, the file-system browser, Settings, model provider configuration, and the sandbox route.
          </p>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
