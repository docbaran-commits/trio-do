"use client"

import { useEffect } from "react"

export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (!("serviceWorker" in navigator)) return
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? ""
    navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/`, updateViaCache: "none" }).catch(() => {
      // The list still works without offline caching.
    })
  }, [])

  return null
}
