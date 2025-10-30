"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Users, CheckSquare, Search, Bell, User, Sparkles, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/chatbot", label: "Chatbot", icon: MessageCircle },
  { href: "/students", label: "Students", icon: Users },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/agent-dashboard", label: "Agent", icon: Brain },
];

interface HeaderProps {
  onCommandPaletteOpen?: () => void;
}

export function Header({ onCommandPaletteOpen }: HeaderProps = {}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/60">
      <div className="container flex h-20 items-center justify-between px-4 gap-4">
        {/* Logo and Tagline */}
        <Link href="/chatbot" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-hover text-white font-bold text-lg shadow-md">
            C
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg hidden sm:inline-block text-text-primary">CAMP</span>
            <span className="text-xs text-text-tertiary hidden md:inline-block font-medium">College App Management</span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center space-x-1 ml-8">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "gap-2 transition-all duration-300",
                    isActive
                      ? "bg-primary text-white shadow-md hover:bg-primary-hover"
                      : "text-text-secondary hover:text-text-primary hover:bg-background/50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline font-medium">{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Right Side Actions */}
        <div className="flex items-center space-x-3 ml-auto">
          {/* AI Assistant Button */}
          <Button
            variant="outline"
            className="gap-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-all duration-300"
            onClick={onCommandPaletteOpen}
          >
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="hidden md:inline font-medium">AI Assistant</span>
            <kbd className="hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

          {/* Search */}
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary pointer-events-none" />
            <Input
              placeholder="Search students, tasks, colleges..."
              className="w-64 pl-10 pr-10 bg-background/50 border-border/50 focus:border-primary focus:bg-background transition-all duration-300 text-sm"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors opacity-0 hover:opacity-100" aria-label="Clear search">
              ✕
            </button>
          </div>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative hover:bg-background/50 transition-colors">
                <Bell className="h-5 w-5 text-text-secondary" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-error animate-pulse"></span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-96 overflow-y-auto">
                <div className="p-4 text-sm text-text-secondary text-center">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-text-tertiary" />
                  <p>No new notifications</p>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-background/50 transition-colors">
                <Avatar>
                  <AvatarImage src="" alt="User" />
                  <AvatarFallback className="bg-primary text-white font-semibold">U</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Help</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <form action="/auth/logout" method="POST">
                  <button type="submit" className="w-full text-left">
                    Logout
                  </button>
                </form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

