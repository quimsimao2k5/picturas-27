import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAddProject } from "@/lib/mutations/projects";
import ImageSubmissionArea from "../image-submission-area";
import { useSession } from "@/providers/session-provider";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/error-messages";

export default function NewProjectDialog({
  files = [],
  setFiles,
  children,
}: {
  files?: File[];
  setFiles?: (files: File[]) => void;
  children: React.ReactNode;
}) {
  const { toast } = useToast();
  const router = useRouter();

  const [open, setOpen] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const session = useSession();
  const addProject = useAddProject(session.user._id, session.token);

  function handleCreate() {
    addProject.mutate(
      {
        uid: session.user._id,
        token: session.token,
        name: name,
        images: imageFiles,
      },
      {
        onSuccess: (project) => {
          setOpen(false);
          toast({
              title: "Projeto criado com sucesso",
              description: "As imagens foram adicionadas ao novo projeto.",
          });
          if (project) router.push(`/dashboard/${project._id}`);
        },
        onError: (error) => {
          const { title, description } = getErrorMessage("project-create", error);
          toast({
            title,
            description,
            variant: "destructive",
          });
        },
      },
    );
  }

  useEffect(() => {
    if (files.length > 0) {
      setOpen(true);
    }
  }, [files]);

  useEffect(() => {
    setName("");
    setImageFiles([]);
    if (setFiles && open === false) setFiles([]);
  }, [open, setFiles]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        <Label htmlFor="project-name">Project Name</Label>
        <Input
          id="project-name"
          placeholder="Enter project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <ImageSubmissionArea
          onDrop={(files) => setImageFiles(files)}
          receivedFiles={files}
        />
        <DialogFooter>
          <Button
            onClick={() => handleCreate()}
            disabled={imageFiles.length <= 0 || name === ""}
            className="inline-flex items-center gap-1"
          >
            <span>Create</span>
            {addProject.isPending && (
              <LoaderCircle className="size-[1em] animate-spin" />
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
