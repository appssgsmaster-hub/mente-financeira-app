import { Link, useLocation } from "wouter";
import { useState } from "react";
import {
  LayoutDashboard,
  SlidersHorizontal,
  TrendingUp,
  CreditCard,
  BookOpen,
  Sparkles,
  Target,
  LogOut,
  BarChart3,
  User,
  Building2,
  ArrowLeftRight,
  Check,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useUser, useSwitchAccountType } from "@/hooks/use-finance";
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
import { useToast } from "@/hooks/use-toast";

const BASE_NAV_ITEMS: { title: string; href: string; icon: typeof LayoutDashboard; highlight?: boolean; businessOnly?: boolean }[] = [
  { title: "Painel", href: "/", icon: LayoutDashboard },
  { title: "Ajustes", href: "/ajustes", icon: SlidersHorizontal },
  { title: "Projeções", href: "/projecoes", icon: TrendingUp },
  { title: "Pagamentos", href: "/pagamentos", icon: CreditCard },
  { title: "Plano de Quitação", href: "/dividas", icon: Target },
  { title: "Resultados", href: "/resultados", icon: BarChart3, businessOnly: true },
  { title: "Educação", href: "/educacao", icon: BookOpen },
  { title: "Planos & Pagamento", href: "/planos", icon: Sparkles, highlight: true },
];

const MODE_CONFIG = {
  personal: {
    label: "Conta Pessoal",
    sublabel: "Gestão Pessoal & Família",
    icon: User,
    badge: "Pessoal",
    gradient: "from-violet-600 to-blue-600",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    border: "border-violet-200 dark:border-violet-800/60",
    text: "text-violet-700 dark:text-violet-300",
    badgeBg: "bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300",
    iconBg: "bg-violet-100 dark:bg-violet-900/50",
    switchTo: "business" as const,
    switchLabel: "Trocar para Empresarial",
  },
  business: {
    label: "Conta Empresarial",
    sublabel: "Gestão Empresarial",
    icon: Building2,
    badge: "Empresarial",
    gradient: "from-emerald-600 to-green-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800/60",
    text: "text-emerald-700 dark:text-emerald-300",
    badgeBg: "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
    switchTo: "personal" as const,
    switchLabel: "Trocar para Pessoal",
  },
};

export function AppSidebar() {
  const [location] = useLocation();
  const { logout } = useAuth();
  const { data: user } = useUser();
  const { toast } = useToast();
  const { mutate: switchMode, isPending: isSwitching } = useSwitchAccountType();

  const [confirmingSwitch, setConfirmingSwitch] = useState(false);

  const accountType = (user?.accountType as "personal" | "business") || "personal";
  const isBusiness = accountType === "business";
  const mode = MODE_CONFIG[accountType];
  const ModeIcon = mode.icon;
  const NAV_ITEMS = BASE_NAV_ITEMS.filter(item => !item.businessOnly || isBusiness);

  function handleSwitchConfirm() {
    switchMode(mode.switchTo, {
      onSuccess: () => {
        const next = MODE_CONFIG[mode.switchTo];
        toast({
          title: `Ambiente alterado`,
          description: `Agora em ${next.label}`,
        });
        setConfirmingSwitch(false);
      },
      onError: () => {
        toast({ title: "Erro ao trocar de conta", variant: "destructive" });
        setConfirmingSwitch(false);
      },
    });
  }

  return (
    <Sidebar variant="inset" className="border-r border-border/50 bg-sidebar/50 backdrop-blur-xl">
      <SidebarContent className="pt-6">
        {/* Logo */}
        <div className="px-6 mb-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
            <span className="text-white font-bold text-sm tracking-tight">MF</span>
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold font-display tracking-tight text-primary leading-tight">Mente Financeira</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5 tracking-wider uppercase font-medium">Prosperar é Viver</p>
          </div>
        </div>

        {/* Mode indicator */}
        <div className="px-4 mb-4">
          <div className={`rounded-2xl border p-3.5 ${mode.bg} ${mode.border} transition-all duration-300`} data-testid="sidebar-mode-indicator">
            {!confirmingSwitch ? (
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${mode.iconBg}`}>
                  <ModeIcon className={`w-5 h-5 ${mode.text}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-bold uppercase tracking-wider leading-tight ${mode.text}`}>{mode.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{user?.name?.split(" ")[0] || "—"}</p>
                </div>
                <button
                  onClick={() => setConfirmingSwitch(true)}
                  className={`p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${mode.text} shrink-0`}
                  title={mode.switchLabel}
                  data-testid="button-switch-mode"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className={`text-xs font-semibold text-center ${mode.text}`}>
                  Trocar para{" "}
                  <span className="font-bold">{MODE_CONFIG[mode.switchTo].label}</span>?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleSwitchConfirm}
                    disabled={isSwitching}
                    className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg transition-colors ${mode.bg} ${mode.border} border ${mode.text} hover:opacity-80`}
                    data-testid="button-confirm-switch"
                  >
                    {isSwitching ? (
                      <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    Confirmar
                  </button>
                  <button
                    onClick={() => setConfirmingSwitch(false)}
                    disabled={isSwitching}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="button-cancel-switch"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
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
