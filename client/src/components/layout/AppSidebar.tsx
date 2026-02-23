import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  SlidersHorizontal, 
  TrendingUp, 
  CreditCard, 
  BookOpen, 
  Star 
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

const NAV_ITEMS = [
  { title: "Painel", href: "/", icon: LayoutDashboard },
  { title: "Ajustes", href: "/ajustes", icon: SlidersHorizontal },
  { title: "Projeções", href: "/projecoes", icon: TrendingUp },
  { title: "Pagamentos", href: "/pagamentos", icon: CreditCard },
  { title: "Educação", href: "/educacao", icon: BookOpen },
  { title: "Planos & Pagamento", href: "/planos", icon: Star },
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
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      className={`
                        h-11 px-4 rounded-xl transition-all duration-300
                        ${isActive 
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 hover:text-primary-foreground' 
                          : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
                        }
                      `}
                    >
                      <Link href={item.href} className="flex items-center gap-3">
                        <item.icon className="w-5 h-5" />
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
        <div className="bg-primary/5 rounded-2xl p-4 text-center border border-primary/10">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Missão SGS Group</p>
          <p className="text-sm font-display italic text-foreground">"Foco na Solução"</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
