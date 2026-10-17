"use client";

import { useEffect } from "react";
import { track, type TrackProps } from "@/lib/analytics";

/**
 * Sends one event when a server-rendered page appears, for facts only the server
 * knows (what was searched, how many results came back). Renders nothing.
 */
export function TrackOnMount({ name, props }: { name: string; props?: TrackProps }) {
  // The props object is new on every render; the event is about this page showing, once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => track(name, props), []);
  return null;
}
