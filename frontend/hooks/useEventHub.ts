"use client";

import * as signalR from "@microsoft/signalr";
import { useEffect, useRef, useState } from "react";
import { EventComment } from "@/types";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000").trim();

export interface HubTrack {
  index: number;
  eventTrackId: number;
  trackId: number;
  title: string;
  artist: string;
  audioUrl: string;
  coverImageUrl: string;
  duration: string;
  genre: string | null;
  startedAt: string;
}

export function useEventHub(
  eventId: number,
  token?: string | null,
  onNewComment?: (comment: EventComment) => void,
  onCountdownStarted?: (seconds: number) => void,
  onTrackChanged?: (track: HubTrack) => void,
  onEventStarted?: () => void,
) {
  const [eventStatus, setEventStatus] = useState<string | null>(null);
  const [approvedUserId, setApprovedUserId] = useState<string | null>(null);
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const onNewCommentRef = useRef(onNewComment);
  onNewCommentRef.current = onNewComment;
  const onCountdownStartedRef = useRef(onCountdownStarted);
  onCountdownStartedRef.current = onCountdownStarted;
  const onTrackChangedRef = useRef(onTrackChanged);
  onTrackChangedRef.current = onTrackChanged;
  const onEventStartedRef = useRef(onEventStarted);
  onEventStartedRef.current = onEventStarted;

  useEffect(() => {
    const builder = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/event`, token
        ? { accessTokenFactory: () => token }
        : {})
      .withAutomaticReconnect()
      .build();

    builder.on("TrackChanged", (track: HubTrack) => {
      onTrackChangedRef.current?.(track);
    });

    builder.on("CountdownStarted", (seconds: number) => {
      onCountdownStartedRef.current?.(seconds);
    });

    builder.on("EventStarted", () => {
      onEventStartedRef.current?.();
    });

    builder.on("EventEnded", () => {
      setEventStatus("Ended");
    });

    builder.on("NewComment", (comment: EventComment) => {
      onNewCommentRef.current?.(comment);
    });

    builder.on("RequestApproved", (userId: string) => {
      setApprovedUserId(userId);
    });

    let stopped = false;
    builder.start()
      .then(() => {
        if (stopped) { builder.stop(); return; }
        builder.invoke("JoinEvent", eventId);
      })
      .catch(() => {});

    connectionRef.current = builder;

    return () => {
      stopped = true;
      if (builder.state !== signalR.HubConnectionState.Connecting) {
        builder.invoke("LeaveEvent", eventId).catch(() => {});
      }
      builder.stop();
    };
  }, [eventId, token]);

  return { eventStatus, approvedUserId };
}
