import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  SlidersHorizontal, 
  TrendingUp, 
  CreditCard, 
  BookOpen, 
  Sparkles,
  Shield,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
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
  { title: "Dívidas", href: "/dividas", icon: Shield },
  { title: "Educação", href: "/educacao", icon: BookOpen },
  { title: "Planos & Pagamento", href: "/planos", icon: Sparkles, highlight: true },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { logout } = useAuth();

  return (
    <Sidebar variant="inset" className="border-r border-border/50 bg-sidebar/50 backdrop-blur-xl">
      <SidebarContent className="pt-6">
        <div className="px-6 mb-8">
          <h2 className="text-xl font-bold font-display tracking-tight text-primary leading-tight">Mente Financeira</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5 tracking-wider uppercase font-medium">Prosperar é Viver</p>
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
                            ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md shadow-emerald-500/25 hover:from-emerald-700 hover:to-emerald-600 hover:text-white'
                            : 'bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 hover:text-primary-foreground' 
                          : isHighlight
                            ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300'
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

      <SidebarFooter className="p-6 space-y-4">
        <Button
          variant="outline"
          className="w-full rounded-xl gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => logout()}
          data-testid="button-logout-sidebar"
        >
          <LogOut className="w-4 h-4" />
          <span className="font-medium text-sm">Sair</span>
        </Button>
        <div className="relative overflow-hidden rounded-2xl p-4 text-center border border-primary/20 dark:border-primary/30 bg-gradient-to-br from-primary/5 via-blue-50/50 to-primary/10 dark:from-primary/10 dark:via-blue-950/20 dark:to-primary/5 shadow-sm">
          <div className="absolute top-1 right-2 text-primary/30 dark:text-primary/25 animate-pulse">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="absolute bottom-1 left-2 text-primary/20 dark:text-primary/15">
            <Sparkles className="w-3 h-3" />
          </div>
          <p className="text-xs uppercase tracking-widest font-semibold mb-1 text-primary/70 dark:text-primary/60" data-testid="text-mission-label">Missão SGS Group</p>
          <p className="text-sm font-display italic text-primary dark:text-primary/80" data-testid="text-mission-quote">"Foco na Solução"</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
