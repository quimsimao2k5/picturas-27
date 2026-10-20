"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ImageSubmissionArea from "../image-submission-area";
import { LoaderCircle, Plus } from "lucide-react";
import { useAddProjectImages } from "@/lib/mutations/projects";
import { createBlobUrlFromFile } from "@/lib/utils";
import { useProjectInfo } from "@/providers/project-provider";
import { useSession } from "@/providers/session-provider";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-messages";

export function AddImagesDialog() {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const { toast } = useToast();

  const { _id: pid, version} = useProjectInfo();
  const session = useSession();

  const addImages = useAddProjectImages(
    session.user._id,
    pid as string,
    session.token,
  );

  function onDrop(files: File[]) {
    files.map(async (file) => {
      const url = await createBlobUrlFromFile(file);
      setImages((prevImages) => [...prevImages, url]);
    });
    setImageFiles(files);
  }

  function handleAdd() {
    addImages.mutate(
      {
        images: imageFiles,
        projectVersion: version,
      },
      {
        onSuccess: () => {
          toast({
            title: "Images added successfully.",
          });
          setOpen(false);
        },
        onError: (error) => {
          const { title, description } = getErrorMessage("project-upload", error);
          toast({
            title,
            description,
            variant: "destructive",
          });
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="inline-flex" variant="outline">
          <Plus /> Add Images
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Images</DialogTitle>
          <DialogDescription>
            Add more images to your project.
          </DialogDescription>
        </DialogHeader>
        <ImageSubmissionArea onDrop={onDrop} />
        <DialogFooter>
          <Button
            onClick={handleAdd}
            disabled={images.length === 0}
            className="inline-flex items-center gap-1"
          >
            <span>Add</span>
            {addImages.isPending && (
              <LoaderCircle className="size-[1em] animate-spin" />
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
