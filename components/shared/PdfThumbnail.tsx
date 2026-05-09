"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  pdfUrl: string;
  fallbackImageUrl?: string | null;
  fileName?: string;
  className?: string;
  onClick?: () => void;
}

export function PdfThumbnail({ pdfUrl, fallbackImageUrl, fileName, className, onClick }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "done" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";
        const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (!cancelled) {
          setDataUrl(canvas.toDataURL("image/jpeg", 0.85));
          setState("done");
        }
      } catch (err) {
        console.error("[PdfThumbnail] render error:", err);
        if (!cancelled) setState("error");
      }
    })();
    return () => { cancelled = true; };
  }, [pdfUrl]);

  if (state === "loading") {
    return (
      <div className={cn("flex items-center justify-center bg-gray-100 animate-pulse", className)}>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
      </div>
    );
  }

  if (state === "done" && dataUrl) {
    return (
      <img
        src={dataUrl}
        alt={fileName ?? "PDF preview"}
        className={cn("w-full h-full object-contain cursor-pointer", className)}
        onClick={onClick}
      />
    );
  }

  // Error fallback
  if (fallbackImageUrl) {
    return (
      <img
        src={fallbackImageUrl}
        alt={fileName ?? "preview"}
        className={cn("w-full h-full object-cover cursor-pointer", className)}
        onClick={onClick}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#1E3A8A] to-[#3D5BAA] cursor-pointer",
        className,
      )}
      onClick={onClick}
    >
      <FileText size={28} className="text-white/50" />
      {fileName && (
        <p className="text-[10px] text-white/50 px-2 truncate max-w-full">{fileName}</p>
      )}
    </div>
  );
}
