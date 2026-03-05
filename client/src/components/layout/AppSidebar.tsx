import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  SlidersHorizontal, 
  TrendingUp, 
  CreditCard, 
  BookOpen, 
  Sparkles
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

const NAV_ITEMS: { title: string; href: string; icon: typeof LayoutDashboard; highlight?: boolean }[] = [
  { title: "Painel", href: "/", icon: LayoutDashboard },
  { title: "Ajustes", href: "/ajustes", icon: SlidersHorizontal },
  { title: "Projeções", href: "/projecoes", icon: TrendingUp },
  { title: "Pagamentos", href: "/pagamentos", icon: CreditCard },
  { title: "Educação", href: "/educacao", icon: BookOpen },
  { title: "Planos & Pagamento", href: "/planos", icon: Sparkles, highlight: true },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar variant="inset" className="border-r border-border/50 bg-sidebar/50 backdrop-blur-xl">
      <SidebarContent className="pt-6">
        <div className="px-6 mb-8">
          <h2 className="text-2xl font-bold font-display tracking-tight text-primary">SGS Group</h2>
          <p className="text-xs text-muted-foreground mt-1 tracking-wider uppercase">Mente Financeira</p>
        </div>
        
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2 px-4">
              {NAV_ITEMS.map((item) => {
                const isActive = location === item.href;
                const isHighlight = item.highlight === true;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      className={`
                        h-11 px-4 rounded-xl transition-all duration-300
                        ${isActive 
                          ? isHighlight
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-white shadow-md shadow-amber-500/30 hover:from-amber-600 hover:to-yellow-500 hover:text-white'
                            : 'bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 hover:text-primary-foreground' 
                          : isHighlight
                            ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-300'
                            : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
                        }
                      `}
                    >
                      <Link href={item.href} className="flex items-center gap-3">
                        <item.icon className={`w-5 h-5 ${isHighlight && !isActive ? 'animate-pulse' : ''}`} />
                        <span className="font-medium text-sm">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-6">
        <div className="relative overflow-hidden rounded-2xl p-4 text-center border border-amber-300/40 dark:border-amber-500/30 bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100/80 dark:from-amber-950/40 dark:via-yellow-950/30 dark:to-amber-900/20 shadow-sm">
          <div className="absolute top-1 right-2 text-amber-400/60 dark:text-amber-400/40 animate-pulse">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="absolute bottom-1 left-2 text-amber-300/40 dark:text-amber-500/30">
            <Sparkles className="w-3 h-3" />
          </div>
          <p className="text-xs uppercase tracking-widest font-semibold mb-1 text-amber-700 dark:text-amber-400" data-testid="text-mission-label">Missão SGS Group</p>
          <p className="text-sm font-display italic text-amber-900 dark:text-amber-200" data-testid="text-mission-quote">"Foco na Solução"</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
