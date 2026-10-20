import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import JSZip from "jszip";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const extractZipImages = async (zipFile: File): Promise<File[]> => {
  const jszip = new JSZip();
  const zipContent = await jszip.loadAsync(zipFile);
  const imageFiles: File[] = [];

  for (const [filename, fileData] of Object.entries(zipContent.files)) {
    if (!fileData.dir && /\.(png|jpe?g)$/i.test(filename)) {
      const fileBlob = await fileData.async("blob");
      imageFiles.push(new File([fileBlob], filename, { type: fileBlob.type }));
    }
  }

  return imageFiles;
};

export const createBlobUrlFromFile = async (file: File) => {
  if (file.stream) {
    const stream = file.stream();
    const blob = await new Response(stream).blob();
    const url = URL.createObjectURL(blob);
    return url;
  }

  throw new Error("File stream not available");
};

export const downloadBlob = (name: string, blobUrl: string) => {
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = name;
  a.click();
  a.remove();
};

export function getImageDimensions(
  imageUrl: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = (error) =>
      reject(new Error(`Failed to load image: ${error}`));
    img.src = imageUrl;
  });
}

export function rgbToHex(r: number, g: number, b: number): string {
  // Ensure the RGB values are within the range of 0 to 255
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));

  // Convert each component to a hexadecimal string and pad with zero if necessary
  const hexR = r.toString(16).padStart(2, "0");
  const hexG = g.toString(16).padStart(2, "0");
  const hexB = b.toString(16).padStart(2, "0");

  // Combine the hexadecimal components into a single string
  return `#${hexR}${hexG}${hexB}`;
}

export function hexToRgb(
  hex: string,
): { r: number; g: number; b: number } | null {
  // Remove the hash at the start if it's there
  hex = hex.replace(/^#/, "");

  // Check if the hex is valid (either 3 or 6 characters long)
  if (hex.length !== 3 && hex.length !== 6) {
    return null; // Invalid hex format
  }

  // If the hex is 3 characters, expand it to 6 characters
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }

  // Parse the red, green, and blue values
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  return { r, g, b };
}

export function isValidHexColor(hex: string): boolean {
  // Regular expression to match valid HEX color codes
  const hexPattern = /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
  return hexPattern.test(hex);
}
