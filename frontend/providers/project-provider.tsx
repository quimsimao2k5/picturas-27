"use client";

import {
  ProjectImage,
  SingleProject,
  ProjectToolResponse,
} from "@/lib/projects";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { useSession } from "@/providers/session-provider";
import { useQueryClient } from "@tanstack/react-query";
import { useSetProjectDirty } from "@/lib/mutations/projects";
import { useToast } from "@/hooks/use-toast";
import { useGetSocket } from "@/lib/queries/projects";

interface ProjectContextData {
  project: SingleProject;
  setProjectTools: (tools: ProjectToolResponse[]) => void;
  currentImage: ProjectImage | null;
  preview: {
    waiting: string;
    setWaiting: (waiting: string) => void;
  };
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (dirty: boolean) => void;
  canEdit: boolean;
}

const ProjectContext = createContext<ProjectContextData | undefined>(undefined);

export function ProjectProvider({
  children,
  project,
  currentImage,
  preview,
  ownerId,
  shareId,
  canEdit = true,
}: {
  children: React.ReactNode;
  project: SingleProject;
  currentImage: ProjectImage | null;
  preview: {
    waiting: string;
    setWaiting: (waiting: string) => void;
  };
  ownerId?: string;
  shareId?: string;
  canEdit?: boolean;
}) {
  const session = useSession();
  const socket = useGetSocket(session.token);
  const qc = useQueryClient();
  const { toast } = useToast();

  const [version, setVersion] = useState<number>(Number(project.version) || 0);

  const [tools, setTools] = useState(project.tools);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // entrar na room do projeto
  useEffect(() => {
    if (!socket.data) return;
    const projectId = project._id;
    socket.data.emit("join-project", projectId);

    return () => {
      socket.data?.emit("leave-project", projectId);
    };
  }, [socket.data, project._id]);

  // manter state tools alinhado com o project vindo do backend
  useEffect(() => {
    if (hasUnsavedChanges) return;
    setTools(project.tools);
  }, [project.tools, hasUnsavedChanges]);


  // só limpar o sentinel do Apply (não mexe no hasUnsavedChanges)
  useEffect(() => {
    if (preview.waiting === "__APPLY_DONE__") {
      preview.setWaiting("");
    }
  }, [preview.waiting, preview]);

  // -------------------- DIRTY SYNC (RNF46/RF50 server-side) --------------------
  const setDirtyMut = useSetProjectDirty();

  // guarda a versão “mais recente” conhecida sem depender só de props
  const vLocalRef = useRef<number>(Number(project.version) || 0);

  useEffect(() => {
    const v = Number(project.version);
    if (Number.isFinite(v)) {
      vLocalRef.current = v;
      setVersion(v);
    }
  }, [project.version]);

  function getLatestVersion() {
    const projectKey = ["project", session.user._id, project._id, session.token, ownerId, shareId];
    const cached = qc.getQueryData<any>(projectKey);
    const vCached = Number(cached?.version);

    const candidates = [vLocalRef.current, vCached].filter(Number.isFinite) as number[];
    return candidates.length ? Math.max(...candidates) : vLocalRef.current;
  }

  // evita repetir chamadas se o boolean não mudou
  const lastDirtySent = useRef<boolean | null>(null);
  // evita toasts repetidos se o backend falhar em loop
  const lastErrorAt = useRef<number>(0);

  useEffect(() => {

      if (!canEdit) {
      lastDirtySent.current = false;
      if (hasUnsavedChanges) setHasUnsavedChanges(false);
      return;
    }

    if (lastDirtySent.current === hasUnsavedChanges) return;
    lastDirtySent.current = hasUnsavedChanges;

    // se a mutation não está pronta (ex: sem sessão), não faz nada
    if (!session?.token || !session?.user?._id || !project?._id) return;

    const v = getLatestVersion();
    if (!Number.isFinite(v)) return;

      setDirtyMut.mutate(
        {
        userId: session.user._id,
        projectId: project._id,
        token: session.token,
        ownerId,
        shareId,
        dirty: hasUnsavedChanges,
        projectVersion: v,
      },
      {
        onSuccess: (resp: any) => {
          const newV = Number(resp?.newVersionHeader);
          if (Number.isFinite(newV)) {
            vLocalRef.current = newV;
            setVersion(newV); // <- ESTA LINHA é a diferença
          }
        },
        onError: (err: any) => {
          // 409 é “normal” se alguém mexeu na versão entre cliques — não precisa toast
          const status = err?.status ?? err?.response?.status;
          if (status === 409) return;

          // throttling de toast (ex: offline)
          const now = Date.now();
          if (now - lastErrorAt.current < 4000) return;
          lastErrorAt.current = now;

          toast({
            variant: "destructive",
            title: "Erro ao sincronizar alterações",
            description:
              "Não foi possível atualizar no servidor o estado de alterações não guardadas. Tenta novamente.",
          });
        },
      },
    );
  }, [hasUnsavedChanges, canEdit]); // intencional: só reage ao toggle true/false
  // ---------------------------------------------------------------------------

  const seenOps = useRef<Set<string>>(new Set());
  const applyingRemote = useRef(false);

  useEffect(() => {
    if (!socket.data) return;

    const handler = (msg: any) => {
      const { op } = msg || {};
      if (!op) return;

      const opId = op.opId ?? null;
      if (opId && seenOps.current.has(opId)) return;
      if (opId) seenOps.current.add(opId);

      const newV = Number(op.newVersion);
      if (Number.isFinite(newV) && newV <= version) return;

      applyingRemote.current = true;
      try {
        // atualiza version primeiro
        if (Number.isFinite(newV)) {
          vLocalRef.current = newV;
          setVersion(newV);
        }

        // aplica operação
        switch (op.type) {
          case "TOOL_ADDED": {
            const tool = op.payload?.tool;
            if (tool) {
              setTools((prev) => {
                // evitar duplicates por id
                if (prev.some((t: any) => String(t._id) === String(tool._id))) return prev;
                const next = [...prev, tool].sort((a: any, b: any) => a.position - b.position);
                return next;
              });
            } else {
              // fallback seguro
              qc.invalidateQueries({ queryKey: ["project", ownerId ?? session.user._id, project._id, session.token, ownerId, shareId] });
            }
            break;
          }

          case "TOOL_REMOVED": {
            const toolId = op.payload?.toolId;
            if (toolId) {
              setTools((prev) => prev.filter((t: any) => String(t._id) !== String(toolId)));
            } else {
              qc.invalidateQueries({ queryKey: ["project", ownerId ?? session.user._id, project._id, session.token, ownerId, shareId] });
            }
            break;
          }

          case "TOOLS_REORDERED": {
            const toolsFromServer = op.payload?.tools;
            if (Array.isArray(toolsFromServer)) {
              setTools(toolsFromServer);
            } else {
              qc.invalidateQueries({ queryKey: ["project", ownerId ?? session.user._id, project._id, session.token, ownerId, shareId] });
            }
            break;
          }

          case "PROJECT_CLEARED": {
            setTools([]);
            break;
          }

          case "TOOL_UPDATED": {
            const toolId = op.payload?.toolId;
            const params = op.payload?.params;

            if (toolId && params) {
              setTools((prev) =>
                prev.map((t: any) =>
                  String(t._id) === String(toolId) ? { ...t, params } : t
                )
              );
            } else {
              qc.invalidateQueries({ queryKey: ["project", ownerId ?? session.user._id, project._id, session.token, ownerId, shareId] });
            }
            break;
          }

          default: {
            // evento desconhecido -> resync
            qc.invalidateQueries({ queryKey: ["project", ownerId ?? session.user._id, project._id, session.token, ownerId, shareId] });
          }
        }

        // opcional: atualizar resultados/previews se estiverem a ser mostrados
        qc.invalidateQueries({ queryKey: ["projectResults", ownerId ?? session.user._id, project._id, session.token, ownerId, shareId] });

      } finally {
        applyingRemote.current = false;
      }
    };

    socket.data.on("project-op", handler);
    return () => {
      socket.data.off("project-op", handler);
    };
  }, [socket.data, version, qc, session.user._id, session.token, project._id, ownerId, shareId]);

  return (
    <ProjectContext.Provider
      value={{
        project: { ...project, tools, version },
        setProjectTools: setTools,
        currentImage,
        preview,
        hasUnsavedChanges,
        canEdit,
        setHasUnsavedChanges: (dirty: boolean) => {
          if (!canEdit) return;
          setHasUnsavedChanges(dirty);
        },
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectInfo() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProjectInfo() must be used within a ProjectProvider");
  }
  return context.project;
}

export function useSetProjectTools() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useSetProjectTools() must be used within a ProjectProvider");
  }
  return context.setProjectTools;
}

export function useCurrentImage() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useCurrentImage() must be used within a ProjectProvider");
  }
  return context.currentImage;
}

export function usePreview() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("usePreview() must be used within a ProjectProvider");
  }
  return context.preview;
}

export function useUnsavedChanges() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useUnsavedChanges() must be used within a ProjectProvider");
  }
  return {
    hasUnsavedChanges: context.hasUnsavedChanges,
    setHasUnsavedChanges: context.setHasUnsavedChanges,
  };
}

export function useCanEditProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useCanEditProject() must be used within a ProjectProvider");
  }
  return context.canEdit;
}
