import { LoaderCircle, Sparkle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/providers/session-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import { useEffect, useMemo, useState } from "react";
import {
  useCurrentImage,
  usePreview,
  useProjectInfo,
  useUnsavedChanges,
  useCanEditProject,
} from "@/providers/project-provider";
import {
  useAddProjectTool,
  useDeleteProjectTool,
  usePreviewProjectResult,
  useUpdateProjectTool,
} from "@/lib/mutations/projects";
import { ProjectTool, ProjectToolResponse } from "@/lib/projects";
import { useGetSocket } from "@/lib/queries/projects";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import { getErrorMessage } from "@/lib/error-messages";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface ToolbarButtonProps {
  open?: boolean;
  setOpen?: (open: boolean) => void;
  icon: LucideIcon;
  label: string;
  disabled?: boolean;
  isDefault?: boolean;
  isPremium?: boolean;
  tool: Omit<ProjectTool, "position">;
  children?: React.ReactNode;
  noParams?: boolean;
  onDefault?: () => void;
}

export function ToolbarButton({
  
  open = false,
  setOpen = () => {},
  icon: Icon,
  label,
  disabled = false,
  isDefault = false,
  isPremium = false,
  tool,
  children,
  noParams = false,
  onDefault = () => {},
}: ToolbarButtonProps) {
  const router = useRouter();
  const session = useSession();
  const project = useProjectInfo();
  const preview = usePreview();
  const { setHasUnsavedChanges } = useUnsavedChanges();
  const { toast } = useToast();
  const canEdit = useCanEditProject();

  const socket = useGetSocket(session.token);
  const searchParams = useSearchParams();
  const ownerParam = searchParams.get("owner") ?? session.user._id;
  const shareParam = searchParams.get("share") ?? undefined;

  const qc = useQueryClient();

  // memo para não recriar array a cada render (ajuda também)
  const projectKey = useMemo(
    () => ["project", session.user._id, project._id, session.token, ownerParam, shareParam],
    [session.user._id, project._id, session.token, ownerParam, shareParam],
  );

  const handleProjectConflict = (error: any) => {
    const status = error?.response?.status;

    if (status === 409) {
      toast({
        title: "Conflito de edição",
        description:
          "O projeto foi alterado por outro utilizador. Atualizámos para a versão mais recente.",
        variant: "destructive",
      });

      qc.invalidateQueries({ queryKey: projectKey, refetchType: "all" });
      return true;
    }

    return false;
  };

  const variant =
    project.tools.find((t) => t.procedure === tool.procedure) !== undefined
      ? "default"
      : "outline";

  const currentImage = useCurrentImage();

  const addTool = useAddProjectTool(
    session.user._id,
    project._id,
    session.token,
    ownerParam,
    shareParam,
  );

  const updateTool = useUpdateProjectTool(
    session.user._id,
    project._id,
    session.token,
    ownerParam,
    shareParam,
  );

  const deleteTool = useDeleteProjectTool(
    session.user._id,
    project._id,
    session.token,
    ownerParam,
    shareParam,
  );

  const previewEdits = usePreviewProjectResult(
    session.user._id,
    project._id,
    session.token,
    ownerParam,
    shareParam,
  );

  const [prevTool, setPrevTool] = useState<ProjectToolResponse | undefined>(undefined);
  const [waiting, setWaiting] = useState(false);
  const [timedout, setTimedout] = useState(false);

  function handleDeleteTool() {
    if (!canEdit) return;
    if (!prevTool) return;

    deleteTool.mutate(
      { toolId: prevTool._id, projectVersion: project.version },
      {
        onError: (error) => {
          if (handleProjectConflict(error)) return;
          const { title, description } = getErrorMessage("project-update", error);
          toast({ title, description, variant: "destructive" });
        },
      },
    );
  }

  function handlePreview() {

    if (!canEdit) return;
    previewEdits.mutate(
      { imageId: currentImage?._id ?? "", projectVersion: project.version },
      {
        onSuccess: () => {
          setWaiting(true);
          preview.setWaiting(tool.procedure);

          setTimeout(() => setTimedout(true), 10000 * (project.tools.length + 1));
        },
        onError: (error) => {
          if (handleProjectConflict(error)) return;
          const { title, description } = getErrorMessage("project-process", error);
          toast({ title, description, variant: "destructive" });
        },
      },
    );
  }

  function handleAddTool(runPreview?: boolean) {
    
    if (!canEdit) return;
    const afterSuccess = () => {
      setHasUnsavedChanges(false); // acabou de guardar
      if (runPreview) handlePreview();
    };

    if (prevTool) {
      updateTool.mutate(
        { toolId: prevTool._id, toolParams: tool.params, projectVersion: project.version },
        {
          onSuccess: afterSuccess,
          onError: (error) => {
            if (handleProjectConflict(error)) return;
            const { title, description } = getErrorMessage("project-update", error);
            toast({ title, description, variant: "destructive" });
          },
        },
      );
    } else {
      addTool.mutate(
        { tool: { ...tool, position: project.tools.length }, projectVersion: project.version },
        {
          onSuccess: afterSuccess,
          onError: (error) => {
            if (handleProjectConflict(error)) return;
            const { title, description } = getErrorMessage("project-update", error);
            toast({ title, description, variant: "destructive" });
          },
        },
      );
    }

    setOpen(false);
  }

  function handleClick() {

     if (!canEdit) {
      toast({
        title: "Read-only",
        description: "Este projeto foi partilhado com permissão de leitura.",
        variant: "destructive",
      });
      return;
    }

    if (isPremium && session.user.type === "anonymous") {
      router.push("/login");
      return;
    }

    if (noParams) {
      if (prevTool) handleDeleteTool();
      else handleAddTool(true);
    }
  }

  useEffect(() => {
    if (!timedout) return;

    if (waiting) {
      setWaiting(false);
      preview.setWaiting("");
      toast({
        title: "Ups! An error occurred.",
        description: "The preview took too long to load.",
        variant: "destructive",
      });
    }

    setTimedout(false);
  }, [timedout, waiting, preview]);

  useEffect(() => {
    const s = socket.data;
    if (!s) return;

    const onPreviewReady = () => {
      setWaiting(false);
      preview.setWaiting("");
    };

    s.on("preview-ready", onPreviewReady);

    return () => {
      s.off("preview-ready", onPreviewReady);
    };
  }, [socket.data, preview]);

  useEffect(() => {
    setPrevTool(project.tools.find((t) => t.procedure === tool.procedure));
  }, [project.tools, tool.procedure]);

  const locked = !canEdit;

  const uiDisabled =
    disabled ||
    locked ||
    (preview.waiting !== tool.procedure && preview.waiting !== "");

  const lockReason = "Read-only (não podes editar)";

  const TButton = () => (
    <Tooltip>
      <Button
        variant={variant}
        className={`size-8 relative ${
          isPremium && variant === "default" ? "bg-indigo-500 hover:bg-indigo-400" : ""
        }`}
        disabled={uiDisabled}
        onClick={handleClick}
      >
        {waiting ? (
          <LoaderCircle className="animate-spin" />
        ) : (
          <>
            {isPremium ? (
              <TooltipTrigger asChild>
                <div
                  className={
                    isPremium && variant === "default" ? "text-white" : "text-indigo-500"
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                  <Sparkle className="h-3 w-3 absolute -top-1 -right-1" />
                  <span className="sr-only">{label}</span>
                </div>
              </TooltipTrigger>
            ) : (
              <>
                <Icon className="h-3.5 w-3.5" />
                <span className="sr-only">{label}</span>
              </>
            )}
          </>
        )}
      </Button>
      <TooltipContent className="ml-2 bg-indigo-500" side="right">
        {label}
      </TooltipContent>
    </Tooltip>
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      {!locked && !((isPremium && session.user.type === "anonymous") || noParams) ? (
        <DropdownMenuTrigger asChild disabled={uiDisabled}>
          <div>
            <TButton />
          </div>
        </DropdownMenuTrigger>
      ) : (
        <div>
          <TButton />
        </div>
      )}


      {!locked && (
        <DropdownMenuContent
          className="w-[--radix-dropdown-menu-trigger-width] min-w-64 rounded-lg"
          side="right"
          align="end"
          sideOffset={4}
        >

        <DropdownMenuLabel className="text-sm p-1">{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="p-1">{children}</div>
        <DropdownMenuSeparator />

        <div className="flex w-full gap-1 items-center">
          <Button
            variant="outline"
            className="h-6 text-xs"
            onClick={() => {
              handleDeleteTool();
              onDefault();
            }}
            disabled={isDefault}
          >
            Default
          </Button>

          <Button
            variant="outline"
            onClick={() => handleAddTool(true)}
            className="h-6 text-xs"
            disabled={isDefault}
          >
            Preview
          </Button>

          <Button
            onClick={() => handleAddTool(false)}
            disabled={isDefault}
            className="h-6 text-xs w-full"
          >
            Save
          </Button>
        </div>
      </DropdownMenuContent>
    )}
    </DropdownMenu>
  );
}
