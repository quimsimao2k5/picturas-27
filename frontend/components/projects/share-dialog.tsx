"use client";

import { useState } from "react";
import { useSession } from "@/providers/session-provider";
import { useProjectShareLinks } from "@/lib/queries/projects";

import {
  useCreateShareLink,
  useRevokeShareLink,
} from "@/lib/mutations/projects";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy } from "lucide-react";
import type { ShareLink } from "@/lib/projects";
import { useUnsavedChanges } from "@/providers/project-provider";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

type Props = {
  projectId: string;
  projectVersion: number;
};

export function ShareProjectDialog({ projectId, projectVersion }: Props) {
  const [open, setOpen] = useState(false);
  const [lastCreatedUrl, setLastCreatedUrl] = useState<string | null>(null);
  const session = useSession();

  const [vLocal, setVLocal] = useState<number>(projectVersion);
  const qc = useQueryClient();
  const projectKey = ["project", session.user._id, projectId, session.token, undefined, undefined];

  function getLatestVersion() {
    const cached = qc.getQueryData<any>(projectKey);
    const vCached = cached?.version;
    const candidates = [projectVersion, vLocal, vCached].filter(Number.isFinite) as number[];
    return Math.max(...candidates);
  }


  const { hasUnsavedChanges } = useUnsavedChanges();

  const { data: links, isLoading } = useProjectShareLinks(
    session.user._id,
    projectId,
    session.token,
  );

  const createLink = useCreateShareLink(
    session.user._id,
    projectId,
    session.token,
  );

  const revokeLink = useRevokeShareLink(
    session.user._id,
    projectId,
    session.token,
  );

  const [permission, setPermission] = useState<"read" | "edit">("read");

  const handleCreate = () => {
    // bloquear partilha se houver alterações não guardadas
    if (hasUnsavedChanges) {
      toast({
        variant: "destructive",
        title: "Alterações não guardadas",
        description:
          "Ainda tens alterações por guardar neste projeto. Guarda antes de criar um link de partilha, para garantir que quem recebe o link vê a versão correta.",
      });
      return;
    }

    const v = getLatestVersion();
      if (!Number.isFinite(v)) {
        toast({ variant: "destructive", title: "Erro", description: "Versão do projeto indisponível. Recarrega a página." });
        return;
      }

    createLink.mutate(
      { permission, projectVersion: getLatestVersion() },
      {
        onSuccess: (resp) => {
          setLastCreatedUrl(resp.data.url);
          const newV = Number(resp.newVersionHeader);
          if (Number.isFinite(newV)) setVLocal(newV);
        },
      }
    );

  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* opcional: indicador visual de unsaved aqui */}
        <Button variant="outline">
          <span className="inline-flex items-center gap-1">
            Share
            {hasUnsavedChanges && (
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
            )}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="space-y-4">
        <DialogHeader>
          <DialogTitle>Share project</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm font-medium">Generate new link</p>
          <div className="flex gap-2 items-center">
            <Select
              value={permission}
              onValueChange={(v) => setPermission(v as "read" | "edit")}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="read">View only</SelectItem>
                <SelectItem value="edit">Can edit</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleCreate}
              disabled={createLink.isPending}
            >
              {createLink.isPending ? "Creating..." : "Create link"}
            </Button>
          </div>
          {lastCreatedUrl && (
            <div className="mt-2 flex items-center gap-2 text-xs break-all border rounded px-2 py-1">
              <span className="flex-1">{lastCreatedUrl}</span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleCopy(lastCreatedUrl)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Active links</p>
          {isLoading && (
            <p className="text-xs text-muted-foreground">Loading...</p>
          )}

          {!isLoading && (!links || links.length === 0) && (
            <p className="text-xs text-muted-foreground">
              No links created yet.
            </p>
          )}

          {!isLoading && links && links.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto text-xs">
              {links.map((l: ShareLink) => (
                <div
                  key={l.id}
                  className="flex flex-col gap-1 border rounded px-2 py-1"
                >
                  <div className="flex justify-between items-center">
                    <span>
                      {l.permission.toUpperCase()}{" "}
                      {l.revoked && (
                        <span className="ml-1 text-red-500">(revoked)</span>
                      )}
                    </span>
                    {!l.revoked && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          revokeLink.mutate(
                            { shareId: l.id, projectVersion: getLatestVersion() },
                            {
                              onSuccess: (resp) => {
                                const newV = Number(resp.newVersionHeader);
                                if (Number.isFinite(newV)) setVLocal(newV);
                              },
                            }
                          )
                        }
                        disabled={revokeLink.isPending}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 break-all">
                    <span className="flex-1">
                      {window.location.origin}/share/{l.id}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        handleCopy(`${window.location.origin}/share/${l.id}`)
                      }
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}