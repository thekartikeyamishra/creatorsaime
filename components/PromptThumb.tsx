"use client";

/* eslint-disable @next/next/no-img-element -- static export: no runtime Image optimizer; dimensions are explicit so there is no CLS */
import { useState } from "react";

/**
 * The 4:5 thumbnail on a prompt card.
 *
 * Why this is a client component: the generated preview images live in
 * public/prompts/ and are wired up by scripts/wire-images.mjs. If a file is
 * ever missing, renamed, or fails to load, we must NOT show a broken-image
 * icon — we fall back to the procedural gradient the design was built around.
 * That needs an onError handler, which requires the client.
 *
 * `gradient` is computed on the server from a stable hash of the prompt id, so
 * server and client render the same thing and there is no hydration mismatch.
 */
export default function PromptThumb({
  src,
  alt,
  gradient,
  priority = false,
}: {
  src?: string;
  alt: string;
  gradient: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  if (!showImage) {
    return (
      <div className="relative aspect-[4/5] w-full" style={{ backgroundImage: gradient }}>
        <div className="grain absolute inset-0 opacity-[0.14]" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      width={800}
      height={1000}
      onError={() => setFailed(true)}
      className="aspect-[4/5] w-full object-cover"
      style={{ backgroundImage: gradient }}
    />
  );
}
