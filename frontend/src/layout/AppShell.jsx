"use client";

import { createElement, useState } from "react";
import { Menu } from "lucide-react";
import Header from "@/layout/Header";
import AlertsDrawer from "@/components/alerts/AlertsDrawer";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export default function AppShell({ sidebar, children, sidebarProps = {} }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const SidebarComponent = sidebar;

  return (
    <div className="min-h-screen w-full flex flex-col md:grid md:grid-cols-[auto_1fr] bg-slate-50">

      {/* === MOBILE SIDEBAR (Sheet) === */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-[280px] border-r border-slate-200">
          {SidebarComponent && (
            <div className="h-full overflow-hidden">
              {createElement(SidebarComponent, {
                collapsed: false,
                onToggle: () => setMobileOpen(false),
                isMobile: true,
                ...sidebarProps,
              })}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* === DESKTOP SIDEBAR === */}
      <aside
        className={cn(
          "hidden md:block sticky top-0 h-screen overflow-hidden border-r border-slate-200 bg-white z-40 transition-all duration-300 ease-in-out",
          collapsed ? "w-[72px]" : "w-[240px]"
        )}
      >
        {SidebarComponent &&
          createElement(SidebarComponent, {
            collapsed,
            onToggle: () => setCollapsed((v) => !v),
            ...sidebarProps,
          })}
      </aside>

      {/* === MAIN CONTENT AREA === */}
      <div className="flex flex-col min-w-0 min-h-screen">

        {/* HEADER */}
        <header className="sticky top-0 z-30 flex items-center h-14 bg-blue-50/10 backdrop-blur-xl border-b border-blue-100/20 px-4 shadow-sm w-full">
          <div className="md:hidden mr-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(true)}
              className="md:hidden"
            >
              <Menu className="w-5 h-5 text-slate-700" />
            </Button>
          </div>

          <div className="flex-1 min-w-0">
            <Header className="h-full" showBurger={false} />
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 p-1 md:p-2 overflow-x-hidden w-full max-w-[1920px] mx-auto">
          {children}
        </main>
      </div>

      {/* ALERTS DRAWER (Fixed avec overlay et blur) */}
      <AlertsDrawer />
    </div>
  );
}
