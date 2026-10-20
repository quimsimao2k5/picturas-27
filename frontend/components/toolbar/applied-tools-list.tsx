"use client";

import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableToolItem } from "./sortable-tool-item";
import { useProjectInfo, useSetProjectTools, useCurrentImage } from "@/providers/project-provider";
import { useSession } from "@/providers/session-provider";
import {
  useReorderProjectTools,
  useDeleteProjectTool,
  useClearProjectTools,
  usePreviewProjectResult
} from "@/lib/mutations/projects";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "next/navigation";
import { getErrorMessage } from "@/lib/error-messages";
import { Undo2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

export function AppliedToolsList() {
  const project = useProjectInfo();
  const setTools = useSetProjectTools();
  const session = useSession();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") ?? "edit";
  const ownerParam = searchParams.get("owner") ?? session.user._id;
  const shareId = searchParams.get("share") ?? undefined;

  const qc = useQueryClient();

  const reorder = useReorderProjectTools(
    session.user._id,
    project._id,
    session.token,
    ownerParam,
    shareId,
  );

  const deleteTool = useDeleteProjectTool(
    session.user._id,
    project._id,
    session.token,
    ownerParam,
    shareId,
  );

  const clearTools = useClearProjectTools(
    session.user._id,
    project._id,
    session.token,
    ownerParam,
    shareId,
  );

  const preview = usePreviewProjectResult(
    session.user._id,
    project._id,
    session.token,
    ownerParam,
    shareId,
  );

  const { toast } = useToast();

  const tools = project.tools;

  const currentImage = useCurrentImage();
  const imageId = currentImage?._id;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const resultsQueryKey = [
    "projectResults",
    session.user._id,
    project._id,
    session.token,
    ownerParam,
    shareId
  ];

  function clearResultsCache() {
    // remove imediatamente o que está a ser mostrado em "mode results"
    qc.removeQueries({ queryKey: resultsQueryKey });
  }

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tools.findIndex((t) => t._id === active.id);
    const newIndex = tools.findIndex((t) => t._id === over.id);

    const sorted = arrayMove(tools, oldIndex, newIndex);

    const withPositions = sorted.map((t, index) => ({
      ...t,
      position: index,
    }));

    // update UI immediately
    setTools(withPositions);

    const opId = crypto.randomUUID();

    reorder.mutate(
      { tools: withPositions, projectVersion: project.version, opId },
      {
        onSuccess: () => {
          // reorder também invalida resultados (a pipeline mudou)
          clearResultsCache();

          if (mode === "edit" && imageId) {
            preview.mutate({
              imageId,
              projectVersion: project.version,
            });
          }
        },
        onError: (error) => {
          console.error("Erro ao reordenar:", error);
          const { title, description } = getErrorMessage("project-update", error);
          toast({
            title,
            description,
            variant: "destructive",
          });
        },
      },
    );
  }

  function handleRemove(id: string) {
    const opId = crypto.randomUUID();
    deleteTool.mutate(
      {
        toolId: id,
        projectVersion: project.version,
        opId,
      },
      {
        onSuccess: () => {
          setTools(tools.filter((t) => t._id !== id));

          // pipeline mudou => resultados atuais já não servem
          clearResultsCache();

          // se estiver em edit, podes forçar preview (opcional)
          if (mode === "edit" && imageId) {
            preview.mutate({ imageId, projectVersion: project.version });
          }
        },
        onError: (error) => {
          const { title, description } = getErrorMessage("project-update", error);
          toast({ title, description, variant: "destructive" });
        },
      }
    );
  }

  function handleUndo() {
    if (tools.length === 0) {
      toast({
        title: "Nada para reverter",
        description: "Ainda não aplicaste nenhuma edição nesta sessão.",
      });
      return;
    }

    const lastTool = tools[tools.length - 1];
    const opId = crypto.randomUUID();

    deleteTool.mutate(
      {
        toolId: lastTool._id,
        projectVersion: project.version,
        opId,
      },
      {
        onSuccess: () => {
          const updated = tools.slice(0, -1);
          setTools(updated);

          // pipeline mudou => limpar results 
          clearResultsCache();

          // preview (edit mode)
          if (mode === "edit" && imageId) {
            // se não houver tools, não faz sentido preview com pipeline vazia
            if (updated.length > 0) {
              preview.mutate({ imageId, projectVersion: project.version });
            }
          }
        },
        onError: (error) => {
          const { title, description } = getErrorMessage("project-update", error);
          toast({ title, description, variant: "destructive" });
        },
      },
    );
  }

  function handleReset() {
    if (tools.length === 0) {
      toast({
        title: "Nada para limpar",
        description: "Este projeto já está na versão original.",
      });
      return;
    }

    const ids = tools.map((t) => t._id);
    const opId = crypto.randomUUID();

    clearTools.mutate(
      { toolIds: ids, projectVersion: project.version, opId },
      {
        onSuccess: () => {
          setTools([]);

          // pipeline mudou => limpar results 
          clearResultsCache();

          toast({
            title: "Edições removidas",
            description: "A imagem voltou à versão original.",
          });
        },
        onError: (error) => {
          const { title, description } = getErrorMessage("project-update", error);
          toast({ title, description, variant: "destructive" });
        },
      },
    );
  }

  return (
    <div className="mt-3 flex w-full flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">Applied</span>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={handleUndo}
            disabled={tools.length === 0 || deleteTool.isPending}
            title="Reverter última edição"
          >
            <Undo2 className="h-3 w-3" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleReset}
            disabled={tools.length === 0 || clearTools.isPending}
            title="Reset para versão original"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {tools.length === 0 && (
        <p className="text-[11px] text-gray-400">
          Nenhuma ferramenta aplicada
        </p>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={tools.map((t) => t._id)} strategy={verticalListSortingStrategy}>
          <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
            {tools.map((tool) => (
              <SortableToolItem key={tool._id} tool={tool} onRemove={handleRemove} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
