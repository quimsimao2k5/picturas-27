import Link from "next/link";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../ui/dialog";
import { Ellipsis, Pencil, Trash } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { useDeleteProject, useUpdateProject } from "@/lib/mutations/projects";
import { Input } from "../ui/input";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/providers/session-provider";
import { Project } from "@/lib/projects";
import { getErrorMessage } from "@/lib/error-messages";
import { useQueryClient } from "@tanstack/react-query";
import type { SingleProject } from "@/lib/projects";
import { useSearchParams } from "next/navigation";


export default function ProjectItem({ p }: { p: Project }) {
  const router = useRouter();
  const path = usePathname();
  const { toast } = useToast();

  const [open, setOpen] = useState<boolean>(false);
  const [option, setOption] = useState<"rename" | "delete">("rename");
  const [newName, setNewName] = useState<string>(p.name);

  const session = useSession();
  const qc = useQueryClient();
  const searchParams = useSearchParams();

  const ownerId = searchParams.get("owner") ?? session.user._id;
  const shareId = searchParams.get("share") ?? undefined;

  const projectKey = ["project", session.user._id, p._id, session.token, ownerId, shareId];

  const cached = qc.getQueryData<SingleProject>(projectKey);
  const projectVersion = cached?.version; // versão REAL

  const deleteProject = useDeleteProject(
    session.user._id,
    p._id,
    session.token,
  );
  const updateProject = useUpdateProject(
    session.user._id,
    p._id,
    session.token,
  );

  useEffect(() => {
    if (deleteProject.isError) {
      const { title, description } = getErrorMessage(
        "project-delete",
        deleteProject.error,
      );
      toast({
        title,
        description,
        variant: "destructive",
      });
      deleteProject.reset();
    }

    if (updateProject.isError) {
      const { title, description } = getErrorMessage(
        "project-update",
        updateProject.error,
      );
      toast({
        title,
        description,
        variant: "destructive",
      });
      updateProject.reset();
    }
  }, [deleteProject, updateProject, toast]);

  return (
    <SidebarMenuItem>
      <Dialog open={open} onOpenChange={setOpen}>
        <SidebarMenuButton
          asChild
          isActive={path.includes(`/dashboard/${p._id}`)}
          className="h-fit py-1 flex items-center"
        >
          <Link href={`/dashboard/${p._id}`}>{p.name}</Link>
        </SidebarMenuButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction className="pb-1">
              <Ellipsis />
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start">
            <DropdownMenuItem>
              <DialogTrigger
                className="flex justify-between w-full items-center"
                onClick={() => setOption("rename")}
              >
                <p>Rename</p>
                <Pencil className="size-[1em]" />
              </DialogTrigger>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <DialogTrigger
                className="flex justify-between w-full items-center"
                onClick={() => setOption("delete")}
              >
                <span>Delete</span>
                <Trash className="size-[1em]" />
              </DialogTrigger>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DialogContent>
          <DialogHeader>
            {option === "rename" ? (
              <DialogTitle>Rename Project</DialogTitle>
            ) : (
              <>
                <DialogTitle>Are you sure?</DialogTitle>
                <DialogDescription>
                  This action cannot be undone.
                </DialogDescription>
              </>
            )}
          </DialogHeader>
          {option === "rename" && (
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          )}
          <DialogFooter>
            <Button
              onClick={() => {
                if (!projectVersion) {
                  toast({
                    title: "Não foi possível obter a versão do projeto",
                    description: "Abre o projeto primeiro (ou aguarda carregar) e tenta novamente.",
                    variant: "destructive",
                  });
                  return;
                }
                if (option === "rename")
                  updateProject.mutate({
                    name: newName,
                    projectVersion: p.version,
                  });
                else {
                  router.push("/dashboard");
                  deleteProject.mutate(
                    { projectVersion },
                    {
                      onSuccess: () => {
                        toast({
                          title: "Project deleted successfully.",
                        });
                      },
                    },
                  );
                }
                setOpen(false);
              }}
              variant={option === "rename" ? "default" : "destructive"}
            >
              {option === "rename" ? "Save" : "Permanently Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarMenuItem>
  );
}
