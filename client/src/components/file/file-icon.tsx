import {
  FileText,
  FileImage,
  FileSpreadsheet,
  FileCode,
  File as GenericFileIcon,
} from "lucide-react";

interface FileIconProps {
  mimeType: string;
  size?: number;
  className?: string;
}

export function FileIcon({ mimeType, size = 24, className = "" }: FileIconProps) {
  const iconProps = {
    size,
    className: className || "",
  };
  
  // Determine the icon based on mime type
  if (mimeType.includes("image/")) {
    return <FileImage {...iconProps} className={`text-purple-500 ${className}`} />;
  } else if (mimeType === "application/pdf") {
    return <FileText {...iconProps} className={`text-red-500 ${className}`} />;
  } else if (
    mimeType === "application/zip" ||
    mimeType === "application/x-zip-compressed" ||
    mimeType === "application/x-rar-compressed"
  ) {
    return <FileText {...iconProps} className={`text-yellow-500 ${className}`} />;
  } else if (
    mimeType.includes("text/html") ||
    mimeType.includes("application/javascript") ||
    mimeType.includes("text/css") ||
    mimeType.includes("application/json")
  ) {
    return <FileCode {...iconProps} className={`text-gray-500 ${className}`} />;
  } else if (
    mimeType.includes("application/vnd.ms-excel") ||
    mimeType.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
  ) {
    return <FileSpreadsheet {...iconProps} className={`text-green-500 ${className}`} />;
  } else if (
    mimeType.includes("application/msword") ||
    mimeType.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document") ||
    mimeType.includes("text/plain")
  ) {
    return <FileText {...iconProps} className={`text-blue-500 ${className}`} />;
  } else {
    return <GenericFileIcon {...iconProps} className={`text-gray-500 ${className}`} />;
  }
}
