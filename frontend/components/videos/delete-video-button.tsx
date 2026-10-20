"use client";

// FA5 / E13: delete an available video (REQ-VID-LIB-057, 058).
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/providers/session-provider";
import { useDeleteVideo } from "@/lib/mutations/videos";
import { describeVideoError, formatBytes, Video } from "@/lib/videos";

export default function DeleteVideoButton({ video }: { video: Video }) {
  const session = useSession();
  const remove = useDeleteVideo(session.user._id, session.token);
  const { toast } = useToast();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-destructive" aria-label={`Delete ${video.name}`}>
          <Trash2 /> Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete video?</AlertDialogTitle>
          <AlertDialogDescription>
            &quot;{video.name}&quot; will be permanently removed from your library and{" "}
            {formatBytes(video.sizeBytes)} of storage will be freed. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() =>
              remove.mutate(video._id, {
                onSuccess: () => toast({ title: "Video deleted", description: `"${video.name}" was deleted.` }),
                onError: (err) => {
                  const { code, message } = describeVideoError(err);
                  toast({
                    title: code === "video_in_use" ? "Video in use" : "Could not delete the video",
                    description: message,
                    variant: "destructive",
                  });
                },
              })
            }
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
