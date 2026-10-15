"use client";

import { useEffect, useState } from "react";
import { Toast } from "@/components/ui/Toast";

const VISIBLE_MS = 3000;

/**
 * Shows a toast after a redirect like `/pantry?saved=…`, then drops the query
 * param so a reload or a shared link doesn't show it again. Give it a fresh
 * `key` per save so a second save shows it again.
 */
export function FlashToast({ message, param }: { message: string; param: string }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete(param);
    window.history.replaceState(window.history.state, "", url);
    const timer = setTimeout(() => setVisible(false), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [param]);
  return visible ? <Toast>{message}</Toast> : null;
}
