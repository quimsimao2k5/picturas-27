import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import AppDropzone from "./app-dropzone";
import { FileImage, ImagePlus, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { HoverCard, HoverCardTrigger } from "./ui/hover-card";
import { HoverCardContent } from "@radix-ui/react-hover-card";
import ImagePreview from "./image-preview";
import { extractZipImages } from "@/lib/utils";

export default function ImageSubmissionArea({
  receivedFiles = [],
  onDrop,
}: {
  receivedFiles?: File[];
  onDrop: (files: File[]) => void;
}) {
  const [files, setFiles] = useState<File[]>([]);

  const handleDrop = async (acceptedFiles: File[]) => {
    const compatibleFileTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "application/zip",
    ];

    // Extract images from zip files and filter out incompatible files
    const compatibleFiles: File[] = [];
    for (const file of acceptedFiles) {
      if (file.type === "application/zip") {
        const extractedFiles = await extractZipImages(file);
        compatibleFiles.push(...extractedFiles);
      } else if (compatibleFileTypes.includes(file.type)) {
        compatibleFiles.push(file);
      }
    }

    // Handle duplicate names
    const duplicateNames = new Set<string>();
    files.forEach((file) => duplicateNames.add(file.name));
    const uniqueFiles = compatibleFiles.map((file) => {
      if (duplicateNames.has(file.name)) {
        const newFile = new File(
          [file],
          `${file.name.split(".")[0]} (${duplicateNames.size}).${file.name.split(".")[1]}`,
        );
        duplicateNames.add(newFile.name);
        return newFile;
      }
      duplicateNames.add(file.name);
      return file;
    });

    setFiles((prevFiles) => [...prevFiles, ...uniqueFiles]);
    onDrop(uniqueFiles);
  };

  useEffect(() => {
    if (receivedFiles.length > 0) {
      setFiles(receivedFiles);
      onDrop(receivedFiles);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receivedFiles]);

  return (
    <div>
      {files.length <= 0 ? (
        <div className="h-64">
          <AppDropzone onDrop={handleDrop}>
            <div className="flex flex-col gap-4 items-center justify-center max-w-[20rem]">
              <ImagePlus size={64} />
              <p className="font-medium text-lg">
                Drag and drop images or a .zip
              </p>
            </div>
          </AppDropzone>
        </div>
      ) : (
        <ScrollArea className="w-full rounded-xl border max-h-64 overflow-scroll">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
            {files.map((file, index) => (
              <HoverCard key={file.name + index}>
                <HoverCardTrigger>
                  <Card
                    key={index}
                    className="overflow-hidden hover:-translate-y-1 transition-all"
                  >
                    <CardContent className="py-2 px-3 relative">
                      <div className="flex flex-col items-center justify-center pointer-events-none">
                        <FileImage className="w-10 h-7 text-primary mb-1" />
                        <p className="text-xs text-center truncate w-full">
                          {file.name}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setFiles((prevFiles) =>
                            prevFiles.filter((_, i) => i !== index),
                          );
                          onDrop(files.filter((_, i) => i !== index));
                        }}
                        className="absolute top-0 right-0 text-foreground/50 hover:text-foreground p-1"
                      >
                        <X className="size-[1em]" />
                      </button>
                    </CardContent>
                  </Card>
                </HoverCardTrigger>
                <HoverCardContent className="h-48 w-64 z-50">
                  <ImagePreview file={file} />
                </HoverCardContent>
              </HoverCard>
            ))}
            <div>
              <AppDropzone onDrop={handleDrop}>
                <Plus />
              </AppDropzone>
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
