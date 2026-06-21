"use client";

import * as signalR from "@microsoft/signalr";
import { useEffect, useRef, useState } from "react";
import { EventComment } from "@/types";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000").trim();

export function useEventHub(
  eventId: number,
  token?: string | null,
  onNewComment?: (comment: EventComment) => void,
) {
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [eventStatus, setEventStatus] = useState<string | null>(null);
  const [approvedUserId, setApprovedUserId] = useState<string | null>(null);
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const onNewCommentRef = useRef(onNewComment);
  onNewCommentRef.current = onNewComment;

  useEffect(() => {
    const builder = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/event`, token
        ? { accessTokenFactory: () => token }
        : {})
      .withAutomaticReconnect()
      .build();

    builder.on("TrackChanged", (index: number) => {
      setCurrentTrackIndex(index);
      setCountdown(null);
    });

    builder.on("CountdownStarted", (seconds: number) => {
      setCountdown(seconds);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) { clearInterval(interval); return null; }
          return prev - 1;
        });
      }, 1000);
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

    builder.start()
      .then(() => builder.invoke("JoinEvent", eventId))
      .catch(console.error);

    connectionRef.current = builder;

    return () => {
      builder.invoke("LeaveEvent", eventId).catch(() => {});
      builder.stop();
    };
  }, [eventId, token]);

  return { currentTrackIndex, countdown, eventStatus, approvedUserId };
}
