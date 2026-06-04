import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-finance";
import {
  Lightbulb,
  PlusCircle,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  Check,
  Target,
  FileText,
  Zap,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { IdeaProject, ProjectStage } from "@shared/schema";

const PROJECT_COLORS: { value: string; label: string; ring: string; bg: string; dot: string }[] = [
  { value: "violet", label: "Violeta", ring: "ring-violet-500", bg: "bg-violet-500", dot: "bg-violet-500" },
  { value: "blue", label: "Azul", ring: "ring-blue-500", bg: "bg-blue-500", dot: "bg-blue-500" },
  { value: "emerald", label: "Verde", ring: "ring-emerald-500", bg: "bg-emerald-500", dot: "bg-emerald-500" },
  { value: "amber", label: "Âmbar", ring: "ring-amber-500", bg: "bg-amber-500", dot: "bg-amber-500" },
  { value: "rose", label: "Rosa", ring: "ring-rose-500", bg: "bg-rose-500", dot: "bg-rose-500" },
  { value: "sky", label: "Azul Céu", ring: "ring-sky-500", bg: "bg-sky-500", dot: "bg-sky-500" },
];

function colorDot(color: string) {
  const found = PROJECT_COLORS.find(c => c.value === color);
  return found?.dot ?? "bg-violet-500";
}

function colorRing(color: string) {
  const found = PROJECT_COLORS.find(c => c.value === color);
  return found?.ring ?? "ring-violet-500";
}

function colorBg(color: string) {
  const found = PROJECT_COLORS.find(c => c.value === color);
  return found?.bg ?? "bg-violet-500";
}

const DEFAULT_STAGE_SETS: { label: string; stages: string[] }[] = [
  { label: "Padrão (5 etapas)", stages: ["Diagnóstico", "Planejamento", "Execução", "Monitoramento", "Otimização"] },
  { label: "Produto / App", stages: ["Ideia & Validação", "Pesquisa de Mercado", "MVP", "Desenvolvimento", "Testes", "Lançamento", "Crescimento"] },
  { label: "Curso Online", stages: ["Estruturação", "Gravação", "Plataforma", "Teste Beta", "Lançamento", "Escala"] },
  { label: "Negócio / Empresa", stages: ["Diagnóstico", "Organização Financeira", "Operação", "Crescimento", "Case de Sucesso"] },
  { label: "Personalizado", stages: [] },
];

function useIdeaProjects() {
  return useQuery<IdeaProject[]>({ queryKey: ["/api/idea-projects"] });
}

function useProjectStages(projectId: number | null) {
  return useQuery<ProjectStage[]>({
    queryKey: ["/api/idea-projects", projectId, "stages"],
    queryFn: () => projectId ? apiRequest("GET", `/api/idea-projects/${projectId}/stages`).then(r => r.json()) : Promise.resolve([]),
    enabled: projectId !== null,
  });
}

export default function IdeaProjects() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: user } = useUser();

  const { data: projects = [], isLoading: loadingProjects } = useIdeaProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const { data: stages = [], isLoading: loadingStages } = useProjectStages(selectedProjectId);

  const [selectedStageId, setSelectedStageId] = useState<number | null>(null);
  const [editingStageId, setEditingStageId] = useState<number | null>(null);

  // Auto-select first project
  useEffect(() => {
    if (projects.length > 0 && selectedProjectId === null) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  // Clear stage selection when project changes
  useEffect(() => {
    setSelectedStageId(null);
    setEditingStageId(null);
  }, [selectedProjectId]);

  const invalidateProjects = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/idea-projects"] });
  }, [queryClient]);

  const invalidateStages = useCallback(() => {
    if (selectedProjectId !== null) {
      queryClient.invalidateQueries({ queryKey: ["/api/idea-projects", selectedProjectId, "stages"] });
    }
  }, [queryClient, selectedProjectId]);

  // ── Project mutations ─────────────────────────────────────────────────────
  const createProject = useMutation({
    mutationFn: (data: { name: string; description?: string; color: string; seedStages?: string[] }) =>
      apiRequest("POST", "/api/idea-projects", data).then(r => r.json()),
    onSuccess: (newProject: IdeaProject) => {
      invalidateProjects();
      setSelectedProjectId(newProject.id);
      toast({ title: "Projeto criado!" });
    },
  });

  const updateProject = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<IdeaProject> }) =>
      apiRequest("PATCH", `/api/idea-projects/${id}`, data).then(r => r.json()),
    onSuccess: () => { invalidateProjects(); toast({ title: "Projeto atualizado" }); },
  });

  const deleteProject = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/idea-projects/${id}`),
    onSuccess: (_, id) => {
      invalidateProjects();
      if (selectedProjectId === id) setSelectedProjectId(null);
      toast({ title: "Projeto removido" });
    },
  });

  // ── Stage mutations ───────────────────────────────────────────────────────
  const createStage = useMutation({
    mutationFn: ({ projectId, name }: { projectId: number; name: string }) =>
      apiRequest("POST", `/api/idea-projects/${projectId}/stages`, { name }).then(r => r.json()),
    onSuccess: () => { invalidateStages(); toast({ title: "Etapa adicionada" }); },
  });

  const updateStage = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProjectStage> }) =>
      apiRequest("PATCH", `/api/project-stages/${id}`, data).then(r => r.json()),
    onSuccess: () => invalidateStages(),
  });

  const deleteStage = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/project-stages/${id}`),
    onSuccess: (_, id) => {
      invalidateStages();
      if (selectedStageId === id) setSelectedStageId(null);
      toast({ title: "Etapa removida" });
    },
  });

  const reorderStages = useMutation({
    mutationFn: ({ projectId, orderedIds }: { projectId: number; orderedIds: number[] }) =>
      apiRequest("POST", `/api/idea-projects/${projectId}/stages/reorder`, { orderedIds }),
    onSuccess: () => invalidateStages(),
  });

  // ── New project form ──────────────────────────────────────────────────────
  const [showNewProject, setShowNewProject] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState("violet");
  const [newStageSet, setNewStageSet] = useState(0);
  const [customStagesText, setCustomStagesText] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectDesc, setEditProjectDesc] = useState("");
  const [editProjectColor, setEditProjectColor] = useState("violet");

  function handleCreateProject() {
    if (!newName.trim()) return toast({ title: "Erro", description: "Nome é obrigatório", variant: "destructive" });
    const preset = DEFAULT_STAGE_SETS[newStageSet];
    let seedStages = preset.stages;
    if (preset.stages.length === 0) {
      seedStages = customStagesText.split("\n").map(s => s.trim()).filter(Boolean);
      if (seedStages.length === 0) return toast({ title: "Erro", description: "Adicione ao menos uma etapa", variant: "destructive" });
    }
    createProject.mutate({ name: newName.trim(), description: newDesc.trim() || undefined, color: newColor, seedStages });
    setShowNewProject(false);
    setNewName(""); setNewDesc(""); setNewColor("violet"); setNewStageSet(0); setCustomStagesText("");
  }

  function handleUpdateProject() {
    if (!editProjectName.trim() || !editingProjectId) return;
    updateProject.mutate({ id: editingProjectId, data: { name: editProjectName.trim(), description: editProjectDesc.trim() || undefined, color: editProjectColor } });
    setEditingProjectId(null);
  }

  // ── Stage inline editing ──────────────────────────────────────────────────
  const [stageDraft, setStageDraft] = useState<Partial<ProjectStage>>({});
  const [addingStage, setAddingStage] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [editingStageName, setEditingStageName] = useState<number | null>(null);
  const [stageNameDraft, setStageNameDraft] = useState("");

  function openStageEdit(stage: ProjectStage) {
    if (editingStageId === stage.id) { setEditingStageId(null); return; }
    setEditingStageId(stage.id);
    setSelectedStageId(stage.id);
    setStageDraft({
      name: stage.name,
      objective: stage.objective ?? "",
      nextSteps: stage.nextSteps ?? "",
      blockers: stage.blockers ?? "",
      revenuePotential: stage.revenuePotential ?? "",
      isActive: stage.isActive,
    });
  }

  function saveStage() {
    if (!editingStageId) return;
    updateStage.mutate({ id: editingStageId, data: stageDraft }, {
      onSuccess: () => {
        toast({ title: "Etapa salva!" });
        setEditingStageId(null);
      },
    });
  }

  function moveStage(index: number, direction: "up" | "down") {
    if (!selectedProjectId) return;
    const newOrder = [...stages];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
    reorderStages.mutate({ projectId: selectedProjectId, orderedIds: newOrder.map(s => s.id) });
  }

  function setStageActive(stageId: number) {
    stages.forEach(s => {
      updateStage.mutate({ id: s.id, data: { isActive: s.id === stageId } });
    });
    toast({ title: "Etapa ativa atualizada" });
  }

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-12">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground" data-testid="text-page-title">Gestão de Ideias</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie projetos com etapas personalizáveis — do diagnóstico ao lançamento.</p>
        </div>
        <Button className="rounded-2xl font-bold shrink-0" onClick={() => setShowNewProject(true)} data-testid="button-new-project">
          <PlusCircle className="w-4 h-4 mr-2" /> Novo Projeto
        </Button>
      </div>

      {/* Loading state */}
      {loadingProjects && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}

      {/* Empty state */}
      {!loadingProjects && projects.length === 0 && (
        <Card className="p-10 rounded-3xl border-2 border-dashed border-muted text-center" data-testid="text-no-projects">
          <Lightbulb className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-display font-bold text-xl text-foreground mb-2">Nenhum projeto criado</p>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Crie um projeto e defina as etapas da sua jornada — produto, curso, negócio ou qualquer ideia que queira estruturar.
          </p>
          <Button className="rounded-2xl font-bold" onClick={() => setShowNewProject(true)} data-testid="button-create-first">
            <PlusCircle className="w-4 h-4 mr-2" /> Criar Primeiro Projeto
          </Button>
        </Card>
      )}

      {/* Project list + stages */}
      {projects.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 lg:gap-6 items-start">

          {/* Left: Project list */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-3">Projetos</p>
            {projects.map(p => (
              <div key={p.id} className="relative group">
                {editingProjectId === p.id ? (
                  <Card className="p-3 rounded-2xl border-2 border-primary/30 space-y-2">
                    <input
                      className="w-full p-2 text-sm rounded-xl border border-input bg-background outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                      value={editProjectName}
                      onChange={e => setEditProjectName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleUpdateProject(); if (e.key === "Escape") setEditingProjectId(null); }}
                      autoFocus
                      data-testid={`input-edit-project-name-${p.id}`}
                    />
                    <input
                      className="w-full p-2 text-xs rounded-xl border border-input bg-background outline-none focus:ring-2 focus:ring-primary/20 text-muted-foreground"
                      placeholder="Descrição (opcional)"
                      value={editProjectDesc}
                      onChange={e => setEditProjectDesc(e.target.value)}
                      data-testid={`input-edit-project-desc-${p.id}`}
                    />
                    <div className="flex gap-1.5 flex-wrap">
                      {PROJECT_COLORS.map(c => (
                        <button key={c.value} onClick={() => setEditProjectColor(c.value)}
                          className={`w-5 h-5 rounded-full ${c.dot} ${editProjectColor === c.value ? `ring-2 ring-offset-1 ${c.ring}` : ""}`}
                          data-testid={`btn-edit-color-${c.value}`} />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="rounded-xl flex-1" onClick={handleUpdateProject} data-testid="button-save-project-edit">
                        <Check className="w-3.5 h-3.5 mr-1" /> Salvar
                      </Button>
                      <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setEditingProjectId(null)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <button
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                      selectedProjectId === p.id
                        ? "border-primary/30 bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/20 hover:bg-muted/30"
                    }`}
                    onClick={() => setSelectedProjectId(p.id)}
                    data-testid={`button-select-project-${p.id}`}
                  >
                    <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${colorDot(p.color)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-foreground truncate">{p.name}</p>
                      {p.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{p.description}</p>}
                    </div>
                  </button>
                )}

                {editingProjectId !== p.id && (
                  <div className="absolute right-2 top-2 hidden group-hover:flex gap-1">
                    <button
                      className="w-6 h-6 rounded-lg bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                      onClick={() => {
                        setEditingProjectId(p.id);
                        setEditProjectName(p.name);
                        setEditProjectDesc(p.description ?? "");
                        setEditProjectColor(p.color);
                      }}
                      data-testid={`button-edit-project-${p.id}`}
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      className="w-6 h-6 rounded-lg bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                      onClick={() => deleteProject.mutate(p.id)}
                      data-testid={`button-delete-project-${p.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Right: Stages */}
          <div className="space-y-4">
            {selectedProject && (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl ${colorBg(selectedProject.color)} flex items-center justify-center shrink-0`}>
                      <Target className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h2 className="font-display font-bold text-lg text-foreground" data-testid="text-selected-project-name">{selectedProject.name}</h2>
                      <p className="text-xs text-muted-foreground">{stages.length} etapa{stages.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs border-primary/20 text-primary font-bold"
                    onClick={() => setAddingStage(true)}
                    data-testid="button-add-stage"
                  >
                    <PlusCircle className="w-3.5 h-3.5 mr-1" /> Nova Etapa
                  </Button>
                </div>

                {/* Add stage inline */}
                {addingStage && (
                  <Card className="p-4 rounded-2xl border-2 border-primary/20 bg-primary/5 flex items-center gap-3" data-testid="form-add-stage">
                    <input
                      autoFocus
                      placeholder="Nome da nova etapa..."
                      className="flex-1 p-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                      value={newStageName}
                      onChange={e => setNewStageName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && newStageName.trim() && selectedProjectId) {
                          createStage.mutate({ projectId: selectedProjectId, name: newStageName.trim() });
                          setNewStageName("");
                          setAddingStage(false);
                        }
                        if (e.key === "Escape") { setAddingStage(false); setNewStageName(""); }
                      }}
                      data-testid="input-new-stage-name"
                    />
                    <Button size="sm" className="rounded-xl shrink-0" onClick={() => {
                      if (newStageName.trim() && selectedProjectId) {
                        createStage.mutate({ projectId: selectedProjectId, name: newStageName.trim() });
                        setNewStageName(""); setAddingStage(false);
                      }
                    }} data-testid="button-confirm-add-stage">
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="rounded-xl shrink-0" onClick={() => { setAddingStage(false); setNewStageName(""); }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </Card>
                )}

                {/* Loading stages */}
                {loadingStages && (
                  <div className="flex items-center justify-center py-10">
                    <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                )}

                {/* Stages list */}
                {!loadingStages && stages.length === 0 && (
                  <Card className="p-8 rounded-2xl border-2 border-dashed border-muted text-center">
                    <p className="text-sm text-muted-foreground">Nenhuma etapa. Adicione a primeira etapa do projeto.</p>
                  </Card>
                )}

                {!loadingStages && stages.map((stage, index) => (
                  <Card
                    key={stage.id}
                    className={`rounded-3xl border transition-all overflow-hidden ${
                      stage.isActive
                        ? "border-primary/40 bg-primary/5 shadow-sm"
                        : editingStageId === stage.id
                        ? "border-primary/30 shadow-md"
                        : "border-border hover:border-primary/20"
                    }`}
                    data-testid={`card-stage-${stage.id}`}
                  >
                    {/* Stage header */}
                    <div className="flex items-center gap-3 p-4">
                      {/* Reorder buttons */}
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button
                          disabled={index === 0}
                          className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                          onClick={() => moveStage(index, "up")}
                          data-testid={`button-move-up-${stage.id}`}
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={index === stages.length - 1}
                          className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                          onClick={() => moveStage(index, "down")}
                          data-testid={`button-move-down-${stage.id}`}
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Step number + active indicator */}
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 cursor-pointer transition-all ${
                          stage.isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        }`}
                        onClick={() => setStageActive(stage.id)}
                        title="Definir como etapa ativa"
                        data-testid={`badge-stage-number-${stage.id}`}
                      >
                        {stage.isActive ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                      </div>

                      {/* Stage name — inline editable */}
                      <div className="flex-1 min-w-0">
                        {editingStageName === stage.id ? (
                          <input
                            autoFocus
                            className="w-full p-1.5 text-base font-bold rounded-lg border border-primary/30 bg-background outline-none focus:ring-2 focus:ring-primary/20"
                            value={stageNameDraft}
                            onChange={e => setStageNameDraft(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter") {
                                if (stageNameDraft.trim()) updateStage.mutate({ id: stage.id, data: { name: stageNameDraft.trim() } }, { onSuccess: () => invalidateStages() });
                                setEditingStageName(null);
                              }
                              if (e.key === "Escape") setEditingStageName(null);
                            }}
                            onBlur={() => {
                              if (stageNameDraft.trim()) updateStage.mutate({ id: stage.id, data: { name: stageNameDraft.trim() } }, { onSuccess: () => invalidateStages() });
                              setEditingStageName(null);
                            }}
                            data-testid={`input-stage-name-${stage.id}`}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-display font-bold text-foreground text-base" data-testid={`text-stage-name-${stage.id}`}>{stage.name}</span>
                            {stage.isActive && (
                              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">Ativa</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 shrink-0">
                        <button
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                          onClick={() => { setEditingStageName(stage.id); setStageNameDraft(stage.name); }}
                          title="Renomear etapa"
                          data-testid={`button-rename-stage-${stage.id}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                            editingStageId === stage.id ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary"
                          }`}
                          onClick={() => openStageEdit(stage)}
                          title="Editar detalhes da etapa"
                          data-testid={`button-edit-stage-${stage.id}`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                          onClick={() => deleteStage.mutate(stage.id)}
                          title="Excluir etapa"
                          data-testid={`button-delete-stage-${stage.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Stage preview chips (if has data) */}
                    {editingStageId !== stage.id && (stage.objective || stage.blockers || stage.nextSteps || stage.revenuePotential) && (
                      <div className="px-4 pb-3 flex flex-wrap gap-2">
                        {stage.objective && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-lg">
                            <Target className="w-3 h-3 shrink-0" /> Objetivo definido
                          </span>
                        )}
                        {stage.nextSteps && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2.5 py-1 rounded-lg">
                            <Zap className="w-3 h-3 shrink-0" /> Próximos passos
                          </span>
                        )}
                        {stage.blockers && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-lg">
                            <AlertTriangle className="w-3 h-3 shrink-0" /> Bloqueios
                          </span>
                        )}
                        {stage.revenuePotential && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-lg">
                            <TrendingUp className="w-3 h-3 shrink-0" /> Potencial definido
                          </span>
                        )}
                      </div>
                    )}

                    {/* Stage edit panel */}
                    {editingStageId === stage.id && (
                      <div className="px-4 pb-5 border-t border-border/50 mt-1 pt-4 space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-1.5">
                            <Target className="w-3 h-3" /> Objetivo da Etapa
                          </label>
                          <textarea
                            rows={2}
                            placeholder="Qual é o objetivo desta etapa? O que precisa ser alcançado?"
                            className="w-full p-3 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed"
                            value={stageDraft.objective ?? ""}
                            onChange={e => setStageDraft(d => ({ ...d, objective: e.target.value }))}
                            data-testid={`textarea-objective-${stage.id}`}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-1.5">
                            <Zap className="w-3 h-3 text-blue-500" /> Próximos Passos
                          </label>
                          <textarea
                            rows={3}
                            placeholder="Quais são as ações concretas a realizar nesta etapa?"
                            className="w-full p-3 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed"
                            value={stageDraft.nextSteps ?? ""}
                            onChange={e => setStageDraft(d => ({ ...d, nextSteps: e.target.value }))}
                            data-testid={`textarea-next-steps-${stage.id}`}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3 text-amber-500" /> Bloqueios
                          </label>
                          <textarea
                            rows={2}
                            placeholder="O que pode travar o avanço? Quais obstáculos existem?"
                            className="w-full p-3 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed"
                            value={stageDraft.blockers ?? ""}
                            onChange={e => setStageDraft(d => ({ ...d, blockers: e.target.value }))}
                            data-testid={`textarea-blockers-${stage.id}`}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-1.5">
                            <TrendingUp className="w-3 h-3 text-emerald-500" /> Potencial de Renda
                          </label>
                          <textarea
                            rows={2}
                            placeholder="Qual o potencial financeiro desta etapa? Estimativa de receita, economy ou impacto?"
                            className="w-full p-3 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed"
                            value={stageDraft.revenuePotential ?? ""}
                            onChange={e => setStageDraft(d => ({ ...d, revenuePotential: e.target.value }))}
                            data-testid={`textarea-revenue-${stage.id}`}
                          />
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-muted-foreground">Etapa Ativa</label>
                            <button
                              className={`w-10 h-5 rounded-full transition-all relative ${stageDraft.isActive ? "bg-primary" : "bg-muted"}`}
                              onClick={() => setStageDraft(d => ({ ...d, isActive: !d.isActive }))}
                              data-testid={`toggle-active-${stage.id}`}
                            >
                              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${stageDraft.isActive ? "left-5" : "left-0.5"}`} />
                            </button>
                          </div>
                          <div className="flex-1" />
                          <Button size="sm" variant="ghost" className="rounded-xl text-sm" onClick={() => setEditingStageId(null)} data-testid={`button-cancel-edit-${stage.id}`}>
                            Cancelar
                          </Button>
                          <Button size="sm" className="rounded-xl text-sm font-bold" onClick={saveStage} data-testid={`button-save-stage-${stage.id}`}>
                            <Check className="w-3.5 h-3.5 mr-1" /> Salvar Etapa
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* New project modal */}
      {showNewProject && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowNewProject(false)}>
          <Card className="w-full max-w-lg p-6 rounded-3xl shadow-2xl relative max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="modal-new-project">
            <Button variant="ghost" size="icon" className="absolute top-4 right-4 w-8 h-8" onClick={() => setShowNewProject(false)} data-testid="button-close-modal">
              <X className="w-5 h-5" />
            </Button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-bold text-xl">Novo Projeto</h3>
                <p className="text-xs text-muted-foreground">Defina nome, cor e metodologia de etapas</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Name */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Nome do Projeto</label>
                <input
                  autoFocus
                  placeholder="Ex: Mente Financeira, Brazza, Curso de Inglês..."
                  className="w-full h-14 px-5 rounded-2xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleCreateProject(); }}
                  data-testid="input-new-project-name"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Descrição (opcional)</label>
                <input
                  placeholder="Breve descrição do projeto..."
                  className="w-full h-12 px-5 rounded-2xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  data-testid="input-new-project-desc"
                />
              </div>

              {/* Color */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Cor do Projeto</label>
                <div className="flex gap-3 flex-wrap">
                  {PROJECT_COLORS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => setNewColor(c.value)}
                      className={`w-8 h-8 rounded-xl ${c.dot} transition-all ${newColor === c.value ? `ring-2 ring-offset-2 ${c.ring}` : "opacity-60 hover:opacity-100"}`}
                      title={c.label}
                      data-testid={`btn-color-${c.value}`}
                    />
                  ))}
                </div>
              </div>

              {/* Stage set selector */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Metodologia de Etapas</label>
                <div className="space-y-2">
                  {DEFAULT_STAGE_SETS.map((set, i) => (
                    <button
                      key={i}
                      onClick={() => setNewStageSet(i)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                        newStageSet === i ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/20"
                      }`}
                      data-testid={`btn-stage-set-${i}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-foreground">{set.label}</span>
                        {newStageSet === i && <Check className="w-4 h-4 text-primary" />}
                      </div>
                      {set.stages.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">{set.stages.join(" → ")}</p>
                      )}
                    </button>
                  ))}
                </div>

                {newStageSet === DEFAULT_STAGE_SETS.length - 1 && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] ml-1">Etapas personalizadas — uma por linha</label>
                    <textarea
                      rows={5}
                      placeholder={"Etapa 1\nEtapa 2\nEtapa 3\n..."}
                      className="w-full p-3.5 rounded-2xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed"
                      value={customStagesText}
                      onChange={e => setCustomStagesText(e.target.value)}
                      data-testid="textarea-custom-stages"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button className="flex-1 rounded-2xl font-bold" onClick={handleCreateProject} disabled={createProject.isPending} data-testid="button-create-project">
                  {createProject.isPending ? "A criar..." : "Criar Projeto"}
                </Button>
                <Button variant="outline" className="rounded-2xl" onClick={() => setShowNewProject(false)}>Cancelar</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
