"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { isImageFile, isPdfFile, cn } from "@/lib/utils";
import { PdfThumbnail } from "./PdfThumbnail";
import { ImageLightbox } from "./ImageLightbox";

interface Props {
  fileUrl: string;
  fileName: string;
  questThumbnailUrl?: string | null;
  onClick?: () => void;
  className?: string;
}

export function SubmissionPreview({
  fileUrl,
  fileName,
  questThumbnailUrl,
  onClick,
  className,
}: Props) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const isImage = isImageFile(fileName);
  const isPdf = isPdfFile(fileName);

  if (isImage) {
    return (
      <div className={cn("relative overflow-hidden", className)}>
        {imgError ? (
          <div className="flex h-full w-full items-center justify-center bg-gray-100">
            <FileText size={24} className="text-gray-400" />
          </div>
        ) : (
          <img
            src={fileUrl}
            alt={fileName}
            className="h-full w-full cursor-pointer object-contain"
            onClick={(e) => { e.stopPropagation(); setLightboxOpen(true); }}
            onError={() => setImgError(true)}
          />
        )}
        <ImageLightbox
          src={fileUrl}
          alt={fileName}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      </div>
    );
  }

  if (isPdf) {
    return (
      <PdfThumbnail
        pdfUrl={fileUrl}
        fallbackImageUrl={questThumbnailUrl}
        fileName={fileName}
        className={className}
        onClick={onClick}
      />
    );
  }

  // Other file types — show quest thumbnail or gradient placeholder
  if (questThumbnailUrl) {
    return (
      <div className={cn("overflow-hidden", className)} onClick={onClick}>
        <img
          src={questThumbnailUrl}
          alt={fileName}
          className="h-full w-full cursor-pointer object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#1E3A8A] to-[#3D5BAA]",
        className,
      )}
      onClick={onClick}
    >
      <FileText size={28} className="text-white/50" />
      <p className="max-w-full truncate px-2 text-[10px] text-white/50">{fileName}</p>
    </div>
  );
}
