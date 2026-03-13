/**
 * Jitsi Meet React Component
 *
 * Embeds Jitsi Meet video conferencing with JWT authentication.
 */

"use client";

import { useEffect, useRef } from "react";

import type { CreateRoomResponse } from "../types";

// Jitsi Meet External API types
declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export interface JitsiMeetProps {
  roomConfig: CreateRoomResponse;
  width?: string | number;
  height?: string | number;
  onReady?: () => void;
  onParticipantJoined?: (participant: any) => void;
  onParticipantLeft?: (participant: any) => void;
  onVideoConferenceJoined?: () => void;
  onVideoConferenceLeft?: () => void;
  className?: string;
}

export function JitsiMeet({
  roomConfig,
  width = "100%",
  height = "100%",
  onReady,
  onParticipantJoined,
  onParticipantLeft,
  onVideoConferenceJoined,
  onVideoConferenceLeft,
  className,
}: JitsiMeetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);

  useEffect(() => {
    // Load Jitsi Meet External API script
    const loadJitsiScript = () => {
      return new Promise<void>((resolve, reject) => {
        if (window.JitsiMeetExternalAPI) {
          resolve();
          return;
        }

        const script = document.createElement("script");
        script.src = `https://${roomConfig.jitsiDomain}/external_api.js`;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () =>
          reject(new Error("Failed to load Jitsi Meet API"));
        document.head.appendChild(script);
      });
    };

    // Initialize Jitsi Meet
    const initJitsi = async () => {
      if (!containerRef.current) return;

      try {
        await loadJitsiScript();

        // Clean up previous instance
        if (apiRef.current) {
          apiRef.current.dispose();
        }

        // Create new Jitsi instance
        const api = new window.JitsiMeetExternalAPI(roomConfig.jitsiDomain, {
          roomName: roomConfig.roomId,
          width,
          height,
          parentNode: containerRef.current,
          jwt: roomConfig.jwtToken,
          configOverwrite: {
            startWithAudioMuted: roomConfig.roomConfig.startWithAudioMuted,
            startWithVideoMuted: roomConfig.roomConfig.startWithVideoMuted,
            enableWelcomePage: roomConfig.roomConfig.enableWelcomePage,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            BRAND_WATERMARK_LINK: "",
            MOBILE_APP_PROMO: false,
            TOOLBAR_BUTTONS: [
              "microphone",
              "camera",
              "desktop",
              "fullscreen",
              "fodeviceselection",
              "hangup",
              "chat",
              "settings",
              "videoquality",
              "filmstrip",
              "tileview",
            ],
          },
        });

        apiRef.current = api;

        // Event listeners
        api.addEventListener("videoConferenceJoined", () => {
          onReady?.();
          onVideoConferenceJoined?.();
        });

        api.addEventListener("videoConferenceLeft", () => {
          onVideoConferenceLeft?.();
        });

        api.addEventListener("participantJoined", (participant: any) => {
          onParticipantJoined?.(participant);
        });

        api.addEventListener("participantLeft", (participant: any) => {
          onParticipantLeft?.(participant);
        });

        // Log when ready
        console.log("✅ Jitsi Meet initialized:", roomConfig.roomId);
      } catch (error) {
        console.error("Failed to initialize Jitsi Meet:", error);
      }
    };

    initJitsi();

    // Cleanup
    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, [
    roomConfig,
    width,
    height,
    onReady,
    onParticipantJoined,
    onParticipantLeft,
    onVideoConferenceJoined,
    onVideoConferenceLeft,
  ]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
      }}
    />
  );
}
