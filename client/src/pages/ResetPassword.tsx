import { useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Erro", description: "As senhas não coincidem", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Erro", description: "A senha deve ter pelo menos 6 caracteres", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/reset-password", { token, password });
      setSuccess(true);
    } catch (err: any) {
      let msg = "Erro ao redefinir senha";
      try {
        const data = JSON.parse(err.message.replace(/^\d+:\s*/, ""));
        if (data.message) msg = data.message;
      } catch {}
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="p-8 rounded-3xl max-w-md w-full text-center">
          <h2 className="text-xl font-display font-bold text-foreground mb-4">Link inválido</h2>
          <p className="text-muted-foreground mb-6">Este link de redefinição de senha é inválido ou expirou.</p>
          <Button onClick={() => setLocation("/auth")} className="rounded-xl" data-testid="button-back-to-login">
            Voltar ao login
          </Button>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="p-8 rounded-3xl max-w-md w-full text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-display font-bold text-foreground mb-2" data-testid="text-reset-success">Senha redefinida!</h2>
          <p className="text-muted-foreground mb-6">Sua senha foi alterada com sucesso. Agora você pode fazer login com sua nova senha.</p>
          <Button onClick={() => setLocation("/auth")} className="rounded-xl w-full" data-testid="button-go-to-login">
            Ir para o login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <Card className="p-8 rounded-3xl border-border/50 shadow-xl">
          <h2 className="text-2xl font-display font-bold text-foreground mb-2" data-testid="text-reset-title">
            Redefinir senha
          </h2>
          <p className="text-muted-foreground mb-6">
            Digite sua nova senha abaixo.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  data-testid="input-new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 rounded-xl pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar nova senha</Label>
              <Input
                id="confirm-password"
                data-testid="input-confirm-password"
                type={showPassword ? "text" : "password"}
                placeholder="Repita a nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-12 rounded-xl"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-lg font-semibold"
              disabled={loading}
              data-testid="button-submit-reset"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Redefinir Senha"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setLocation("/auth")}
              className="text-sm text-primary hover:underline font-medium"
              data-testid="button-back-to-login-from-reset"
            >
              Voltar ao login
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
