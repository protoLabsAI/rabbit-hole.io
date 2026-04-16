"use client";

/**
 * YouTube Processor Playground
 *
 * Interactive component for testing the YouTube processor service.
 * Supports both direct processing and background job queue.
 */

import { useState, useRef } from "react";

import { Icon } from "@protolabsai/icon-system";
import { useEnqueueYouTube } from "@protolabsai/sidequest-utils/client";
import { JobStatusTracker } from "@protolabsai/sidequest-utils/components";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@protolabsai/ui/atoms";
import { useToast } from "@protolabsai/ui/hooks";

import {
  useYouTubeProcess,
  useYouTubeUpload,
  useYouTubeDownloadURL,
  useYouTubeProcessorHealth,
  useYouTubeDownload,
} from "../../client";

interface YouTubePlaygroundProps {
  defaultUserId?: string;
  defaultWorkspaceId?: string;
}

export function YouTubePlayground({
  defaultUserId = "demo_user",
  defaultWorkspaceId = "demo_workspace",
}: YouTubePlaygroundProps) {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [genericUrl, setGenericUrl] = useState("");
  const [userId] = useState(defaultUserId);
  const [workspaceId] = useState(defaultWorkspaceId);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [useJobQueue, setUseJobQueue] = useState(true);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobResult, setJobResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Transcription options
  const [includeTranscript, setIncludeTranscript] = useState(true);
  const [transcriptionProvider, setTranscriptionProvider] = useState<
    "groq" | "openai" | "local"
  >("groq");
  const [transcriptionLanguage, setTranscriptionLanguage] = useState("");

  // Direct processing hooks
  const {
    mutate: processYouTube,
    isPending: isProcessing,
    error: processError,
    data: processData,
    reset: resetProcess,
  } = useYouTubeProcess();

  // Job queue hook
  const {
    mutate: enqueueYouTube,
    isPending: isEnqueuing,
    error: enqueueError,
    data: enqueueData,
    reset: resetEnqueue,
  } = useEnqueueYouTube();

  const {
    mutate: uploadFile,
    isPending: isUploading,
    error: uploadError,
    data: uploadData,
    reset: resetUpload,
  } = useYouTubeUpload();

  const {
    mutate: downloadUrl,
    isPending: isDownloading,
    error: downloadError,
    data: downloadData,
    reset: resetDownload,
  } = useYouTubeDownloadURL();

  const {
    data: healthData,
    isLoading: isCheckingHealth,
    refetch: checkHealth,
  } = useYouTubeProcessorHealth();

  const { mutate: downloadFiles, isPending: isDownloadingFiles } =
    useYouTubeDownload();

  const handleProcessYouTube = () => {
    if (!youtubeUrl.trim()) return;

    if (useJobQueue) {
      // Enqueue job for background processing
      enqueueYouTube(
        {
          url: youtubeUrl,
          quality: "720p",
          workspaceId,
          includeTranscript,
          transcriptionProvider,
          transcriptionLanguage: transcriptionLanguage || undefined,
        },
        {
          onSuccess: (data) => {
            setCurrentJobId(data.jobId);
            console.log("Job enqueued:", data.jobId);
            toast({
              title: "Job Enqueued",
              description: `Processing started${includeTranscript ? " with transcription" : ""}. Job ID: ${data.jobId.slice(0, 8)}...`,
            });
          },
        }
      );
    } else {
      // Direct processing (original behavior)
      processYouTube({
        url: youtubeUrl,
        userId,
        workspaceId,
        quality: "720p",
        includeTranscript,
        transcriptionProvider,
        transcriptionLanguage: transcriptionLanguage || undefined,
      });
    }
  };

  const handleJobComplete = (result: any) => {
    console.log("Job completed:", result);
    console.log("Result keys:", Object.keys(result || {}));
    console.log("Has videoKey:", !!result?.videoKey);
    console.log("Has audioKey:", !!result?.audioKey);
    setJobResult(result);
  };

  const handleJobError = (error: string) => {
    console.error("Job failed:", error);
  };

  const handleDownloadFiles = (data: any) => {
    if (!data.videoKey || !data.audioKey) {
      toast({
        title: "Download Unavailable",
        description: "File information not available",
        variant: "destructive",
      });
      return;
    }

    downloadFiles({
      videoKey: data.videoKey,
      audioKey: data.audioKey,
      videoId: data.videoId,
      title: data.title,
      // Include transcript if available
      transcriptKey: data.transcriptKey,
      transcript: data.transcript,
    });
  };

  const handleUploadFile = () => {
    if (!selectedFile) return;
    uploadFile({
      file: selectedFile,
      userId,
      workspaceId,
    });
  };

  const handleDownloadUrl = () => {
    if (!genericUrl.trim()) return;
    downloadUrl({
      url: genericUrl,
      userId,
      workspaceId,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const isServiceOnline = healthData?.status === "healthy";

  const isProcessingBusy = useJobQueue ? isEnqueuing : isProcessing;
  const processingError = useJobQueue ? enqueueError : processError;

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">YouTube Processor Playground</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => checkHealth()}
            disabled={isCheckingHealth}
          >
            {isCheckingHealth ? "Checking..." : "Check Service"}
          </Button>
          {healthData && (
            <Badge variant={isServiceOnline ? "default" : "destructive"}>
              {isServiceOnline ? "Service Online" : "Service Offline"}
            </Badge>
          )}
        </div>
      </div>

      {healthData && (
        <Card>
          <CardHeader>
            <CardTitle>Service Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Version:</span>{" "}
                {healthData.version}
              </div>
              <div>
                <span className="font-medium">FFmpeg:</span>{" "}
                {healthData.ffmpeg_available ? "✓" : "✗"}
              </div>
              <div>
                <span className="font-medium">FFprobe:</span>{" "}
                {healthData.ffprobe_available ? "✓" : "✗"}
              </div>
              <div>
                <span className="font-medium">yt-dlp:</span>{" "}
                {healthData.ytdlp_version}
              </div>
            </div>
            {healthData.transcription_providers && (
              <div className="pt-3 border-t">
                <span className="text-sm font-medium">
                  Transcription Providers:
                </span>
                <div className="flex gap-2 mt-2">
                  {healthData.transcription_providers.map((provider: any) => (
                    <Badge
                      key={provider.name}
                      variant={provider.available ? "default" : "outline"}
                      className="text-xs"
                    >
                      {provider.name} {provider.available ? "✓" : "✗"}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Processing Mode Toggle */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="job-queue-mode" className="text-sm font-medium">
                Background Job Queue
              </Label>
              <p className="text-xs text-muted-foreground">
                {useJobQueue
                  ? "Jobs are processed in background queue (recommended for production)"
                  : "Direct processing with immediate response (testing only)"}
              </p>
            </div>
            <Switch
              id="job-queue-mode"
              checked={useJobQueue}
              onCheckedChange={setUseJobQueue}
            />
          </div>
        </CardContent>
      </Card>

      {/* Transcription Options */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Transcription</CardTitle>
            <Switch
              id="include-transcript"
              checked={includeTranscript}
              onCheckedChange={setIncludeTranscript}
            />
          </div>
        </CardHeader>
        {includeTranscript && (
          <CardContent className="pt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="transcription-provider">Provider</Label>
                <Select
                  value={transcriptionProvider}
                  onValueChange={(v) =>
                    setTranscriptionProvider(v as "groq" | "openai" | "local")
                  }
                >
                  <SelectTrigger id="transcription-provider">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="groq">Groq (Free)</SelectItem>
                    <SelectItem value="openai">OpenAI ($0.006/min)</SelectItem>
                    <SelectItem value="local">
                      Local (faster-whisper)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {transcriptionProvider === "groq" &&
                    "Free tier, auto-chunks files >25MB"}
                  {transcriptionProvider === "openai" &&
                    "Best quality, auto-chunks files >25MB"}
                  {transcriptionProvider === "local" &&
                    "Self-hosted, no size limits"}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="transcription-language">
                  Language (optional)
                </Label>
                <Input
                  id="transcription-language"
                  placeholder="en, es, fr, etc."
                  value={transcriptionLanguage}
                  onChange={(e) => setTranscriptionLanguage(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for auto-detection
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Tabs defaultValue="youtube" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="youtube">YouTube URL</TabsTrigger>
          <TabsTrigger value="upload">Upload File</TabsTrigger>
          <TabsTrigger value="generic">Generic URL</TabsTrigger>
        </TabsList>

        <TabsContent value="youtube" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Process YouTube Video</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="youtube-url">YouTube URL</Label>
                <Input
                  id="youtube-url"
                  placeholder="https://youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleProcessYouTube}
                  disabled={isProcessingBusy || !youtubeUrl.trim()}
                >
                  {isProcessingBusy
                    ? useJobQueue
                      ? "Enqueueing..."
                      : "Processing..."
                    : useJobQueue
                      ? "Enqueue Job"
                      : "Process Video"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setYoutubeUrl("");
                    resetProcess();
                    resetEnqueue();
                    setCurrentJobId(null);
                    setJobResult(null);
                  }}
                >
                  Clear
                </Button>
              </div>

              {/* Job Queue Status Tracker */}
              {useJobQueue && currentJobId && (
                <>
                  <JobStatusTracker
                    jobId={currentJobId}
                    onComplete={handleJobComplete}
                    onError={handleJobError}
                  />

                  {/* Download Button - Shows after job completion */}
                  {jobResult && (
                    <div className="mt-4 p-4 bg-success-50 border border-success-200 rounded-lg space-y-3">
                      <div className="flex items-center gap-2">
                        <Icon
                          name="Check"
                          className="h-5 w-5 text-success-600"
                        />
                        <p className="text-sm font-medium text-success-900">
                          Processing Complete!
                        </p>
                      </div>
                      <Button
                        onClick={() => handleDownloadFiles(jobResult)}
                        disabled={isDownloadingFiles}
                        className="w-full"
                        variant="default"
                        size="lg"
                      >
                        {isDownloadingFiles ? (
                          <>
                            <Icon
                              name="Loader2"
                              className="mr-2 h-5 w-5 animate-spin"
                            />
                            Preparing Download...
                          </>
                        ) : (
                          <>
                            <Icon name="Download" className="mr-2 h-5 w-5" />
                            Download Video + Audio
                            {jobResult.transcript ? " + Transcript" : ""} (ZIP)
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-success-700">
                        Video ID: {jobResult.videoId || "Unknown"}
                      </p>

                      {/* Transcript Preview */}
                      {jobResult.transcript ? (
                        <div className="mt-3 pt-3 border-t border-success-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-success-900">
                              Transcript Preview
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {jobResult.transcript.chunks_processed} chunk
                              {jobResult.transcript.chunks_processed > 1
                                ? "s"
                                : ""}{" "}
                              • {jobResult.transcript.provider}
                            </Badge>
                          </div>
                          <Textarea
                            value={
                              jobResult.transcript.text?.slice(0, 1000) +
                                (jobResult.transcript.text?.length > 1000
                                  ? "..."
                                  : "") || ""
                            }
                            readOnly
                            className="text-xs h-32 bg-background-secondary"
                          />
                          <p className="text-xs text-success-700 mt-1">
                            {jobResult.transcript.text?.length || 0} characters
                            • Language:{" "}
                            {jobResult.transcript.language || "auto"}
                          </p>
                        </div>
                      ) : includeTranscript ? (
                        <div className="mt-3 pt-3 border-t border-warning-200">
                          <p className="text-xs text-warning-700">
                            ⚠️ Transcription was requested but not returned.
                            Check job-processor and youtube-processor logs.
                          </p>
                          <details className="mt-2">
                            <summary className="text-xs cursor-pointer text-muted-foreground">
                              Debug: Job Result
                            </summary>
                            <pre className="text-[10px] overflow-auto max-h-32 bg-muted p-2 rounded mt-1">
                              {JSON.stringify(jobResult, null, 2)}
                            </pre>
                          </details>
                        </div>
                      ) : null}
                    </div>
                  )}
                </>
              )}

              {/* Direct Processing Error */}
              {!useJobQueue && processingError && (
                <div className="p-4 bg-destructive/10 border border-destructive rounded-md">
                  <p className="text-sm text-destructive font-medium">Error:</p>
                  <p className="text-sm text-destructive/80">
                    {processingError.message}
                  </p>
                </div>
              )}

              {/* Direct Processing Success */}
              {!useJobQueue && processData && (
                <div className="p-4 bg-success/10 border border-success rounded-md">
                  <p className="text-sm text-success font-medium mb-2">
                    Success!
                  </p>
                  <pre className="text-xs overflow-auto max-h-96 bg-muted p-2 rounded border border-border">
                    {JSON.stringify(processData, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Video File</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file-upload">Video File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept="video/mp4,video/webm,video/x-matroska,video/quicktime"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedFile.name} (
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleUploadFile}
                  disabled={isUploading || !selectedFile}
                >
                  {isUploading ? "Uploading..." : "Upload Video"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                    resetUpload();
                  }}
                >
                  Clear
                </Button>
              </div>
              {uploadError && (
                <div className="p-4 bg-destructive/10 border border-destructive rounded-md">
                  <p className="text-sm text-destructive font-medium">Error:</p>
                  <p className="text-sm text-destructive/80">
                    {uploadError.message}
                  </p>
                </div>
              )}
              {uploadData && (
                <div className="p-4 bg-success/10 border border-success rounded-md">
                  <p className="text-sm text-success font-medium mb-2">
                    Success!
                  </p>
                  <pre className="text-xs overflow-auto max-h-96 bg-muted p-2 rounded border border-border">
                    {JSON.stringify(uploadData, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Download from Generic URL</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="generic-url">Video URL</Label>
                <Input
                  id="generic-url"
                  placeholder="https://example.com/video.mp4"
                  value={genericUrl}
                  onChange={(e) => setGenericUrl(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Supports: .mp4, .webm, .mkv, .mov
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleDownloadUrl}
                  disabled={isDownloading || !genericUrl.trim()}
                >
                  {isDownloading ? "Downloading..." : "Download Video"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setGenericUrl("");
                    resetDownload();
                  }}
                >
                  Clear
                </Button>
              </div>
              {downloadError && (
                <div className="p-4 bg-destructive/10 border border-destructive rounded-md">
                  <p className="text-sm text-destructive font-medium">Error:</p>
                  <p className="text-sm text-destructive/80">
                    {downloadError.message}
                  </p>
                </div>
              )}
              {downloadData && (
                <div className="p-4 bg-success/10 border border-success rounded-md">
                  <p className="text-sm text-success font-medium mb-2">
                    Success!
                  </p>
                  <pre className="text-xs overflow-auto max-h-96 bg-muted p-2 rounded border border-border">
                    {JSON.stringify(downloadData, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
