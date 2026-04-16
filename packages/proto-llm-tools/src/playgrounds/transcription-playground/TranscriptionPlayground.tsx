"use client";

/**
 * Transcription Playground
 *
 * Interactive component for testing transcription services.
 * Supports multiple providers: OpenAI, Groq, Local (faster-whisper).
 * Demonstrates all transcription hooks with real-time processing.
 */

import { useState, useRef } from "react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@protolabsai/ui/atoms";

import {
  useTranscribe,
  useTranslate,
  useProviderHealth,
  useTranscriptionConfig,
  type TranscriptionProvider,
  type TranscriptionModel,
  type ResponseFormat,
  type TimestampGranularity,
} from "../../client";

interface TranscriptionPlaygroundProps {
  defaultProvider?: TranscriptionProvider;
}

export function TranscriptionPlayground({
  defaultProvider = "groq",
}: TranscriptionPlaygroundProps) {
  const [selectedProvider, setSelectedProvider] =
    useState<TranscriptionProvider>(defaultProvider);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [language, setLanguage] = useState("en");
  const [prompt, setPrompt] = useState("");
  const [temperature, setTemperature] = useState(0.0);
  const [responseFormat, setResponseFormat] =
    useState<ResponseFormat>("verbose_json");
  const [includeSeg, setIncludeSeg] = useState(true);
  const [includeWord, setIncludeWord] = useState(false);
  const [diarize, setDiarize] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    provider: currentProvider,
    config,
    defaults,
    providers,
  } = useTranscriptionConfig();

  const {
    mutate: transcribe,
    isPending: isTranscribing,
    error: transcribeError,
    data: transcribeData,
    reset: resetTranscribe,
  } = useTranscribe();

  const {
    mutate: translate,
    isPending: isTranslating,
    error: translateError,
    data: translateData,
    reset: resetTranslate,
  } = useTranslate();

  const {
    data: healthData,
    isLoading: isCheckingHealth,
    refetch: checkHealth,
  } = useProviderHealth(selectedProvider);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleTranscribe = () => {
    if (!selectedFile) return;

    const timestampGranularities: TimestampGranularity[] = [];
    if (includeSeg) timestampGranularities.push("segment");
    if (includeWord) timestampGranularities.push("word");

    transcribe({
      file: selectedFile,
      provider: selectedProvider,
      model: selectedModel as TranscriptionModel | undefined,
      language: language || undefined,
      prompt: prompt || undefined,
      temperature,
      responseFormat,
      timestampGranularities,
      diarize,
      chunkingStrategy: diarize ? "auto" : undefined,
    });
  };

  const handleTranslate = () => {
    if (!selectedFile) return;

    translate({
      file: selectedFile,
      provider: selectedProvider, // Use selected provider (Groq or OpenAI both support translation)
      model: selectedModel as TranscriptionModel | undefined,
      prompt: prompt || undefined,
      temperature,
      responseFormat:
        responseFormat === "diarized_json" ? "json" : responseFormat,
    });
  };

  const handleClear = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    resetTranscribe();
    resetTranslate();
  };

  const isServiceOnline = healthData?.available || false;
  const fileSizeMB = selectedFile ? selectedFile.size / (1024 * 1024) : 0;

  // Provider-specific models
  const getModelsForProvider = (provider: TranscriptionProvider): string[] => {
    switch (provider) {
      case "openai":
        return [
          "gpt-4o-transcribe",
          "gpt-4o-mini-transcribe",
          "gpt-4o-transcribe-diarize",
          "whisper-1",
        ];
      case "groq":
        return ["whisper-large-v3", "whisper-large-v3-turbo"];
      case "local":
        return ["large-v3", "large-v2", "medium", "small", "base", "tiny"];
      default:
        return ["whisper-1"];
    }
  };

  const [selectedModel, setSelectedModel] = useState<string | undefined>(
    getModelsForProvider(selectedProvider)[0]
  );

  // Update model when provider changes
  const handleProviderChange = (provider: string) => {
    const typedProvider = provider as TranscriptionProvider;
    setSelectedProvider(typedProvider);
    setSelectedModel(getModelsForProvider(typedProvider)[0]);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Transcription Playground</h1>
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
            <CardTitle>Provider Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Provider:</span>{" "}
                {healthData.provider}
              </div>
              <div>
                <span className="font-medium">Base URL:</span>{" "}
                <code className="text-xs bg-muted px-1 rounded">
                  {healthData.baseUrl}
                </code>
              </div>
              <div>
                <span className="font-medium">Streaming:</span>{" "}
                {healthData.config.supportsStreaming ? "✓" : "✗"}
              </div>
              <div>
                <span className="font-medium">Diarization:</span>{" "}
                {healthData.config.supportsDiarization ? "✓" : "✗"}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Select
                value={selectedProvider}
                onValueChange={handleProviderChange}
              >
                <SelectTrigger id="provider">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="groq">Groq (Free)</SelectItem>
                  <SelectItem value="local">Local (faster-whisper)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {selectedProvider === "groq" && "FREE - 10,000 min/day"}
                {selectedProvider === "openai" && "$0.006/minute"}
                {selectedProvider === "local" && "Self-hosted"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger id="model">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {getModelsForProvider(selectedProvider).map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Input
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="en, es, fr, etc."
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for auto-detect
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="response-format">Response Format</Label>
              <Select
                value={responseFormat}
                onValueChange={(v) => setResponseFormat(v as ResponseFormat)}
              >
                <SelectTrigger id="response-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="verbose_json">Verbose JSON</SelectItem>
                  <SelectItem value="srt">SRT Subtitles</SelectItem>
                  <SelectItem value="vtt">VTT Subtitles</SelectItem>
                  {selectedProvider === "openai" && (
                    <SelectItem value="diarized_json">Diarized JSON</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt (Optional)</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Provide context to improve accuracy (e.g., technical terms, names, etc.)"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature: {temperature}</Label>
              <Input
                id="temperature"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-seg"
                checked={includeSeg}
                onCheckedChange={(checked) => setIncludeSeg(!!checked)}
              />
              <Label htmlFor="include-seg" className="text-sm cursor-pointer">
                Segment timestamps
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-word"
                checked={includeWord}
                onCheckedChange={(checked) => setIncludeWord(!!checked)}
              />
              <Label htmlFor="include-word" className="text-sm cursor-pointer">
                Word timestamps
              </Label>
            </div>
          </div>

          {(selectedProvider === "openai" || selectedProvider === "local") && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="diarize"
                checked={diarize}
                onCheckedChange={(checked) => setDiarize(!!checked)}
              />
              <Label htmlFor="diarize" className="text-sm cursor-pointer">
                Enable speaker diarization
              </Label>
              <span className="text-xs text-muted-foreground">
                (Identify different speakers)
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="transcribe" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transcribe">Transcribe</TabsTrigger>
          <TabsTrigger value="translate">Translate to English</TabsTrigger>
        </TabsList>

        <TabsContent value="transcribe" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transcribe Audio File</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file-transcribe">Audio File</Label>
                <Input
                  id="file-transcribe"
                  type="file"
                  accept="audio/mp3,audio/mp4,audio/mpeg,audio/mpga,audio/m4a,audio/wav,audio/webm"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedFile.name} ({fileSizeMB.toFixed(2)} MB)
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleTranscribe}
                  disabled={isTranscribing || !selectedFile}
                >
                  {isTranscribing ? "Transcribing..." : "Transcribe"}
                </Button>
                <Button variant="outline" onClick={handleClear}>
                  Clear
                </Button>
              </div>

              {transcribeError && (
                <div className="p-4 bg-error-50 border border-error-200 rounded-md">
                  <p className="text-sm text-error-900 font-medium">Error:</p>
                  <p className="text-sm text-error-700 whitespace-pre-wrap">
                    {transcribeError.message}
                  </p>
                  {selectedProvider === "local" && (
                    <p className="text-xs text-error-600 mt-2">
                      Make sure faster-whisper server is running:{" "}
                      <code>
                        cd services/faster-whisper-server && docker compose up
                        -d
                      </code>
                    </p>
                  )}
                </div>
              )}

              {transcribeData && (
                <div className="space-y-4">
                  <div className="p-4 bg-success-50 border border-success-200 rounded-md">
                    <p className="text-sm text-success-900 font-medium mb-2">
                      Transcription Complete!
                    </p>

                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium">Text:</span>
                        <p className="text-sm mt-1 p-2 bg-background-secondary rounded">
                          {transcribeData.text}
                        </p>
                      </div>

                      {transcribeData.language && (
                        <div>
                          <span className="text-sm font-medium">Language:</span>{" "}
                          {transcribeData.language}
                        </div>
                      )}

                      {transcribeData.duration && (
                        <div>
                          <span className="text-sm font-medium">Duration:</span>{" "}
                          {transcribeData.duration.toFixed(2)}s
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label>Full Response (JSON)</Label>
                    <pre className="text-xs overflow-auto max-h-96 bg-background-secondary p-4 rounded border mt-2">
                      {JSON.stringify(transcribeData, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="translate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Translate to English</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-info-50 border border-info-200 rounded-md text-sm">
                <p className="font-medium text-info-900">Note:</p>
                <p className="text-info-700">
                  Translation is supported by Groq (FREE) and OpenAI. Audio will
                  be translated to English regardless of source language.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="file-translate">Audio File</Label>
                <Input
                  id="file-translate"
                  type="file"
                  accept="audio/mp3,audio/mp4,audio/mpeg,audio/mpga,audio/m4a,audio/wav,audio/webm"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedFile.name} ({fileSizeMB.toFixed(2)} MB)
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleTranslate}
                  disabled={isTranslating || !selectedFile}
                >
                  {isTranslating ? "Translating..." : "Translate"}
                </Button>
                <Button variant="outline" onClick={handleClear}>
                  Clear
                </Button>
              </div>

              {translateError && (
                <div className="p-4 bg-error-50 border border-error-200 rounded-md">
                  <p className="text-sm text-error-900 font-medium">Error:</p>
                  <p className="text-sm text-error-700">
                    {translateError.message}
                  </p>
                </div>
              )}

              {translateData && (
                <div className="space-y-4">
                  <div className="p-4 bg-success-50 border border-success-200 rounded-md">
                    <p className="text-sm text-success-900 font-medium mb-2">
                      Translation Complete!
                    </p>

                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium">
                          English Text:
                        </span>
                        <p className="text-sm mt-1 p-2 bg-background-secondary rounded">
                          {translateData.text}
                        </p>
                      </div>

                      {translateData.duration && (
                        <div>
                          <span className="text-sm font-medium">Duration:</span>{" "}
                          {translateData.duration.toFixed(2)}s
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label>Full Response (JSON)</Label>
                    <pre className="text-xs overflow-auto max-h-96 bg-background-secondary p-4 rounded border mt-2">
                      {JSON.stringify(translateData, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
