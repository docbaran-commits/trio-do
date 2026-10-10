"use client"

import { XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

export type InstallKind = "safari" | "ios-other" | "other"

const COPY: Record<InstallKind, string> = {
  safari:
    "Tap the Share button, then Add to Home Screen. 3 Lists opens full screen, and your tasks stay on this phone.",
  "ios-other":
    "iPhone can only add this from Safari. Open this same page in Safari, tap Share, then Add to Home Screen.",
  other:
    "On your iPhone, open this page in Safari. Tap Share, then Add to Home Screen. It opens full screen, like an app, and the list stays on that phone.",
}

export function InstallHint({
  kind,
  onDismiss,
}: {
  kind: InstallKind
  onDismiss: () => void
}) {
  return (
    <aside className="rounded-2xl border bg-card px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-heading text-lg leading-tight">Keep it on your iPhone</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onDismiss}
          aria-label="Dismiss install instructions"
        >
          <XIcon />
        </Button>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{COPY[kind]}</p>
    </aside>
  )
}

export function detectInstall(): { standalone: boolean; kind: InstallKind } {
  const nav = window.navigator as Navigator & { standalone?: boolean }
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true
  const ua = nav.userAgent
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (nav.platform === "MacIntel" && nav.maxTouchPoints > 1)
  const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
  const kind: InstallKind = !iOS ? "other" : safari ? "safari" : "ios-other"
  return { standalone, kind }
}
