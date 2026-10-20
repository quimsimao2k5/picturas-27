import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addProject,
  addProjectImages,
  addProjectTool,
  deleteProject,
  deleteProjectImages,
  deleteProjectTool,
  downloadProjectImages,
  downloadProjectImage,
  downloadProjectResults,
  processProject,
  updateProject,
  updateProjectTool,
  previewProjectImage,
  cancelProjectProcess, 
  reorderProjectTools,
  listProjectShareLinks,
  createProjectShareLink,
  revokeShareLink,
  clearProjectTools,
  setProjectDirty,  
} from "../projects";
import { downloadProjectPdf } from "../projects";
import { createBlobUrlFromFile, downloadBlob } from "../utils";
import { validateSession, SessionData } from "../session";
import type { ProjectTool, ProjectToolResponse } from "../projects";
import { assistantSuggest, AssistantSuggestion } from "../projects";

function bumpProjectVersion(
  qc: ReturnType<typeof useQueryClient>,
  queryKey: unknown[],
  newVersionHeader?: string,
) {
  const v = Number(newVersionHeader);
  if (!Number.isFinite(v)) return;

  qc.setQueryData(queryKey, (old: any) => {
    if (!old) return old;
    return { ...old, version: v };
  });
}

export const useAddProject = (uid: string, token: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: addProject,
    onSuccess: () => {
      qc.invalidateQueries({
        refetchType: "all",
        queryKey: ["projects", uid, token],
      });
    },
  });
};

export const useDeleteProject = (
  uid: string,
  pid: string,
  token: string,
  ownerId?: string,
  shareId?: string,
) => {
  const qc = useQueryClient();
  const projectKey = ["project", uid, pid, token, ownerId, shareId];

  return useMutation({
    mutationFn: (args: { projectVersion: number }) =>
      deleteProject({
        uid,
        pid,
        token,
        ownerId,
        shareId,
        projectVersion: args.projectVersion,
      }),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects", uid, token], refetchType: "all" });
      qc.invalidateQueries({ queryKey: projectKey, refetchType: "all" });
      qc.invalidateQueries({ queryKey: ["projectImages", uid, pid, token, ownerId, shareId], refetchType: "all" });
      qc.invalidateQueries({ queryKey: ["projectResults", uid, pid, token, ownerId, shareId], refetchType: "all" });
    },
  });
};

export const useUpdateProject = (
  uid: string,
  pid: string,
  token: string,
  ownerId?: string,
  shareId?: string,
) => {
  const qc = useQueryClient();
  const projectKey = ["project", uid, pid, token, ownerId, shareId];

  return useMutation({
    mutationFn: (args: { name: string; projectVersion: number }) =>
      updateProject({
        uid,
        pid,
        token,
        ownerId,
        shareId,
        name: args.name,
        projectVersion: args.projectVersion,
      }),

    onSuccess: (newVersionHeader) => {
      bumpProjectVersion(qc, projectKey, newVersionHeader);
      qc.invalidateQueries({ queryKey: ["projects", uid, token], refetchType: "all" });
      qc.invalidateQueries({ queryKey: projectKey, refetchType: "all" });
    },
  });
};


export const useDownloadProjectPdf = () => {
  return useMutation({
    mutationFn: downloadProjectPdf,
    onSuccess: async (project) => {
      const blobUrl = await createBlobUrlFromFile(project.file);
      downloadBlob(project.file.name, blobUrl);
    },
  });
};

export const useAddProjectImages = (uid: string, pid: string, token: string, ownerId?: string, shareId?: string) => {
  const qc = useQueryClient();
  const projectKey = ["project", uid, pid, token, ownerId, shareId];

  return useMutation({
    mutationFn: (args: { images: File[]; projectVersion: number }) =>
      addProjectImages({
        uid,
        pid,
        token,
        images: args.images,
        ownerId,
        shareId,
        projectVersion: args.projectVersion,
      }),

    onSuccess: (newVersionHeader) => {
      bumpProjectVersion(qc, projectKey, newVersionHeader);
      qc.invalidateQueries({ queryKey: projectKey, refetchType: "all" });
      qc.invalidateQueries({ queryKey: ["projectImages", uid, pid, token, ownerId, shareId], refetchType: "all" });
    },
  });
};

export const useDeleteProjectImages = (
  uid: string,
  pid: string,
  token: string,
  ownerId?: string,
  shareId?: string,
) => {
  const qc = useQueryClient();
  const projectKey = ["project", uid, pid, token, ownerId, shareId];

  return useMutation({
    mutationFn: (args: { imageIds: string[]; projectVersion: number }) =>
      deleteProjectImages({
        uid,
        pid,
        token,
        imageIds: args.imageIds,
        ownerId,
        shareId,
        projectVersion: args.projectVersion,
      }),

    onSuccess: (newVersionHeader) => {
      bumpProjectVersion(qc, projectKey, newVersionHeader);
      qc.invalidateQueries({ queryKey: projectKey, refetchType: "all" });
      qc.invalidateQueries({
        queryKey: ["projectImages", uid, pid, token, ownerId, shareId],
        refetchType: "all",
      });
    },
  });
};

export const useDownloadProjectImage = (edited?: boolean) => {
  return useMutation({
    mutationFn: downloadProjectImage,
    onSuccess: async (image) => {
      const blobUrl = await createBlobUrlFromFile(image.file);
      downloadBlob(
        edited ? image.name.split(".")[0] + "_edited" : image.name,
        blobUrl,
      );
    },
  });
};

export const useDownloadProject = () => {
  return useMutation({
    mutationFn: downloadProjectImages,
    onSuccess: async (project) => {
      const blobUrl = await createBlobUrlFromFile(project.file);
      // usar o nome *do ficheiro*, que já tem .zip
      downloadBlob(project.file.name, blobUrl);
    },
  });
};

export const useDownloadProjectResults = () => {
  return useMutation({
    mutationFn: downloadProjectResults,
    onSuccess: async (project) => {
      const blobUrl = await createBlobUrlFromFile(project.file);
      // respeita o nome criado na função
      downloadBlob(project.file.name, blobUrl);
    },
  });
};

export const useProcessProject = (
  uid: string,
  pid: string,
  token: string,
  ownerId?: string,
  shareId?: string,
) => {
  const qc = useQueryClient();
  const projectKey = ["project", uid, pid, token, ownerId, shareId];
  const resultsKey = ["projectResults", uid, pid, token, ownerId, shareId];

  return useMutation({
    mutationFn: (args: { projectVersion: number }) =>
      processProject({
        uid: shareId ? (ownerId ?? uid) : uid,  
        pid,
        token,
        ownerId,
        shareId,
        projectVersion: args.projectVersion,
        runnerUserId: uid,
      }),

    onSuccess: async (newVersionHeader) => {
      // 1) atualizar a versão local (se vier header)
      bumpProjectVersion(qc, projectKey, newVersionHeader);

      // 2) invalidar queries que certamente mudam
      qc.invalidateQueries({ queryKey: projectKey, refetchType: "all" });
      qc.invalidateQueries({ queryKey: resultsKey, refetchType: "all" });

      // 3) atualizar sessão / remaining_operations 
      const raw = localStorage.getItem("session");

      if (!raw) {
        qc.invalidateQueries({ refetchType: "all", queryKey: ["session"] });
        return;
      }

      try {
        const current = JSON.parse(raw) as SessionData;

        const updated = await validateSession({
          userId: current.user._id,
          token: current.token,
        });

        const newSession: SessionData = {
          user: updated.user,
          token: updated.token,
        };

        localStorage.setItem("session", JSON.stringify(newSession));
        qc.setQueryData(["session"], newSession);

        window.dispatchEvent(new Event("session-updated"));
      } catch (err) {
        console.error("Error updating session after processing project:", err);
        qc.invalidateQueries({ refetchType: "all", queryKey: ["session"] });
      }
    },
  });
};


export const useAddProjectTool = (uid: string, pid: string, token: string, ownerId?: string,  shareId?: string,) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { tool: ProjectTool; projectVersion: number }) =>
      addProjectTool({
        uid, pid, token, ownerId, shareId,
        tool: args.tool,
        projectVersion: args.projectVersion,
      }),

    onSuccess: (newVersionHeader) => {
      bumpProjectVersion(qc, ["project", uid, pid, token, ownerId, shareId], newVersionHeader);
      qc.invalidateQueries({ refetchType: "all", queryKey: ["project", uid, pid, token, ownerId, shareId] });
      qc.invalidateQueries({ refetchType: "all", queryKey: ["projectResults", uid, pid, token, ownerId, shareId] });
    },
  });
};

export const usePreviewProjectResult = (
  uid: string,
  pid: string,
  token: string,
  ownerId: string,
  shareId?: string,
) => {
  const qc = useQueryClient();
  const projectKey = ["project", uid, pid, token, ownerId, shareId];

  return useMutation({
    mutationFn: (args: { imageId: string; projectVersion: number }) =>
      previewProjectImage({   
        uid: shareId ? (ownerId ?? uid) : uid,  
        pid,
        imageId: args.imageId,
        token,
        ownerId,
        shareId,
        projectVersion: args.projectVersion,
        runnerUserId: uid,
      }),
    onSuccess: (newVersionHeader) => {
      // se o backend devolver header aqui, atualiza localmente
      bumpProjectVersion(qc, projectKey, newVersionHeader);
      qc.invalidateQueries({ queryKey: projectKey, refetchType: "all" });
      qc.invalidateQueries({
        queryKey: ["projectResults", uid, pid, token, ownerId, shareId],
        refetchType: "all",
      });
    },
  });
};

export const useUpdateProjectTool = (uid: string, pid: string, token: string, ownerId: string, shareId?: string) => {
  const qc = useQueryClient();
  const projectKey = ["project", uid, pid, token, ownerId, shareId];

  return useMutation({
    mutationFn: (args: { toolId: string; toolParams: any; projectVersion: number; opId?: string; }) =>
      updateProjectTool({
        uid,
        pid,
        toolId: args.toolId,
        toolParams: args.toolParams,
        token,
        ownerId,
        shareId,
        projectVersion: args.projectVersion,
      }),

    onSuccess: (newVersionHeader) => {
      bumpProjectVersion(qc, projectKey, newVersionHeader);
      qc.invalidateQueries({ queryKey: projectKey, refetchType: "all" });
      qc.invalidateQueries({ queryKey: ["projectResults", uid, pid, token, ownerId, shareId], refetchType: "all" });
    },
  });
};

export const useDeleteProjectTool = (
  uid: string,
  pid: string,
  token: string,
  ownerId?: string,
  shareId?: string,
) => {
  const qc = useQueryClient();
  const projectKey = ["project", uid, pid, token, ownerId, shareId];

  return useMutation({
    mutationFn: (args: { toolId: string; projectVersion: number; opId?: string }) =>
      deleteProjectTool({
        uid,
        pid,
        toolId: args.toolId,
        token,
        ownerId: ownerId ?? uid,
        shareId,
        projectVersion: args.projectVersion,
      }),

    onSuccess: (newVersionHeader) => {
      bumpProjectVersion(qc, projectKey, newVersionHeader);
      qc.invalidateQueries({ queryKey: projectKey, refetchType: "all" });
      qc.invalidateQueries({
        queryKey: ["projectResults", uid, pid, token, ownerId, shareId],
        refetchType: "all",
      });
    },
  });
};

export const useReorderProjectTools = (
  uid: string,
  pid: string,
  token: string,
  ownerId?: string,
  shareId?: string,
) => {
  const qc = useQueryClient();
  const projectKey = ["project", uid, pid, token, ownerId, shareId];

  return useMutation({
    mutationFn: (args: { tools: ProjectToolResponse[]; projectVersion: number; opId?: string }) =>
      reorderProjectTools({
        uid,
        pid,
        tools: args.tools,
        token,
        ownerId,
        shareId,
        projectVersion: args.projectVersion,
      }),
    onSuccess: (newVersionHeader) => {
      bumpProjectVersion(qc, projectKey, newVersionHeader);
      qc.invalidateQueries({ queryKey: projectKey, refetchType: "all" });
      qc.invalidateQueries({
        queryKey: ["projectResults", uid, pid, token, ownerId, shareId],
        refetchType: "all",
      });
    },
  });
};

export const useCancelProjectProcess = (
  uid: string,
  pid: string,
  token: string,
  ownerId?: string,
  shareId?: string,
) => {
  const qc = useQueryClient();
  const projectKey = ["project", uid, pid, token, ownerId, shareId];

  return useMutation({
    mutationFn: (args: { projectVersion: number }) =>
      cancelProjectProcess({ uid, pid, token, ownerId, shareId, projectVersion: args.projectVersion }),

    onSuccess: (newVersionHeader) => {
      bumpProjectVersion(qc, projectKey, newVersionHeader);
      qc.invalidateQueries({ queryKey: projectKey, refetchType: "all" });
      qc.invalidateQueries({
        queryKey: ["projectResults", uid, pid, token, ownerId, shareId],
        refetchType: "all",
      });
    },
  });
};

// ================== SHARING / LINKS ==================

export const useCreateShareLink = (userId: string, projectId: string, token: string) => {
  const qc = useQueryClient();
  const projectKey = ["project", userId, projectId, token, undefined, undefined];

  return useMutation({
    mutationFn: (args: { permission: "read" | "edit"; projectVersion: number }) =>
      createProjectShareLink({
        userId,
        projectId,
        permission: args.permission,
        token,
        projectVersion: args.projectVersion,
      }),

    onSuccess: (resp) => {
      // resp.newVersionHeader vem do projects.ts
      bumpProjectVersion(qc, projectKey, resp.newVersionHeader);

      qc.invalidateQueries({ queryKey: ["projectShareLinks", userId, projectId], refetchType: "all" });
      qc.invalidateQueries({ queryKey: projectKey, refetchType: "all" });
    },
  });
};

export const useRevokeShareLink = (userId: string, projectId: string, token: string) => {
  const qc = useQueryClient();
  const projectKey = ["project", userId, projectId, token, undefined, undefined];

  return useMutation({
    mutationFn: (args: { shareId: string; projectVersion: number }) =>
      revokeShareLink({
        userId,
        projectId,
        shareId: args.shareId,
        token,
        projectVersion: args.projectVersion,
      }),

    onSuccess: (_resp, _vars, ctx) => {
      // revokeShareLink retorna { newVersionHeader }
      bumpProjectVersion(qc, projectKey, _resp.newVersionHeader);

      qc.invalidateQueries({ queryKey: ["projectShareLinks", userId, projectId], refetchType: "all" });
      qc.invalidateQueries({ queryKey: projectKey, refetchType: "all" });
    },
  });
};


export const useClearProjectTools = (
  uid: string,
  pid: string,
  token: string,
  ownerId?: string,
  shareId?: string,
) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: { toolIds: string[]; projectVersion: number; opId?: string }) =>
      clearProjectTools({
        uid,
        pid,
        token,
        toolIds: params.toolIds,
        ownerId: ownerId ?? uid,
        shareId,
        projectVersion: params.projectVersion,
      }),
    onSuccess: (newVersionHeader) => {
      bumpProjectVersion(qc, ["project", uid, pid, token, ownerId, shareId], newVersionHeader);
      qc.invalidateQueries({ queryKey: ["projectResults", uid, pid, token, ownerId, shareId], refetchType: "all" });
    },
  });
};

export const useAssistantSuggest = (
  uid: string,
  pid: string,
  token: string,
  ownerId?: string,
  shareId?: string,
) => {
  const qc = useQueryClient();
  const projectKey = ["project", uid, pid, token, ownerId, shareId];

  return useMutation({
      mutationFn: (args: { message: string; currentTools: ProjectToolResponse[]; projectVersion: number; imgId?: string }) =>
      assistantSuggest({
        uid: shareId ? (ownerId ?? uid) : uid,
        pid,
        token,
        ownerId,
        shareId,
        message: args.message,
        currentTools: args.currentTools,
        projectVersion: args.projectVersion,
        imgId: args.imgId,
      }),

    onSuccess: (resp) => {
      bumpProjectVersion(qc, projectKey, resp.newVersionHeader);
      // não é preciso invalidar aqui obrigatoriamente (só sugestões)
    },
  });
};

export const useSetProjectDirty = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: setProjectDirty,
    onSuccess: (resp, vars) => {
      const projectKey = ["project", vars.userId, vars.projectId, vars.token, vars.ownerId, vars.shareId];
      bumpProjectVersion(qc, projectKey, resp.newVersionHeader);
    },
  });
};

