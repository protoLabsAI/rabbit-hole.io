/**
 * YouTube Processor Service Configuration
 * Centralized configuration for YouTube video processing
 */

const DEFAULT_SERVICE_URL = "http://localhost:8001";

export const youtubeProcessorConfig = {
  /**
   * Get the YouTube processor service URL from environment or default
   */
  getServiceUrl: (): string => {
    if (typeof process !== "undefined" && process.env) {
      return process.env.YOUTUBE_PROCESSOR_URL || DEFAULT_SERVICE_URL;
    }
    return DEFAULT_SERVICE_URL;
  },

  /**
   * Get health check endpoint URL
   */
  getHealthUrl: (): string => {
    return `${youtubeProcessorConfig.getServiceUrl()}/health`;
  },

  /**
   * Get process endpoint URL (for YouTube URLs)
   */
  getProcessUrl: (): string => {
    return `${youtubeProcessorConfig.getServiceUrl()}/process`;
  },

  /**
   * Get upload endpoint URL (for direct file uploads)
   */
  getUploadUrl: (): string => {
    return `${youtubeProcessorConfig.getServiceUrl()}/upload`;
  },

  /**
   * Get download-url endpoint URL (for generic video URLs)
   */
  getDownloadUrlEndpoint: (): string => {
    return `${youtubeProcessorConfig.getServiceUrl()}/download-url`;
  },

  defaults: {
    timeout: 300000, // 5 minutes for video processing
    quality: "720p" as "720p" | "1080p",
  },
};

/**
 * Helper function to get service URL (convenience export)
 */
export function getYouTubeProcessorServiceUrl(): string {
  return youtubeProcessorConfig.getServiceUrl();
}

/**
 * Check if YouTube processor service is configured
 */
export async function isYouTubeProcessorAvailable(): Promise<boolean> {
  try {
    const response = await fetch(youtubeProcessorConfig.getHealthUrl(), {
      method: "GET",
    });
    return response.ok;
  } catch {
    return false;
  }
}
