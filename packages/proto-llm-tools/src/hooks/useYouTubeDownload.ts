/**
 * Hook for downloading processed YouTube files
 */

import { useMutation } from "@tanstack/react-query";

import { useToast } from "@protolabsai/ui/hooks";

export interface DownloadFilesParams {
  videoKey: string;
  audioKey: string;
  videoId: string;
  title?: string;
  // Transcript options
  transcriptKey?: string;
  transcript?: { text: string };
}

export function useYouTubeDownload() {
  const { toast } = useToast();

  return useMutation<void, Error, DownloadFilesParams>({
    mutationFn: async (params) => {
      const response = await fetch("/api/youtube/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: "Download failed",
        }));
        throw new Error(error.error || "Download failed");
      }

      // Get blob from response
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `youtube_${params.videoId}.zip`;

      a.download = filename;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Download Started",
        description: "Your files are being downloaded as a ZIP archive.",
      });
    },
    onError: (error) => {
      toast({
        title: "Download Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
