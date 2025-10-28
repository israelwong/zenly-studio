"use client";

import { useRef } from "react";

interface Props {
  src: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  poster?: string;
  controls?: boolean;
}

function VideoPlayer({ src, autoPlay = true, muted = true, loop = true, poster = "", controls = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <video
      ref={videoRef}
      className="md:max-w-full mx-auto w-full -z-10"
      preload="auto"
      autoPlay={autoPlay}
      loop={loop}
      muted={muted}
      playsInline
      poster={poster}
      controls={controls}
    >
      <source src={src} />
      Tu navegador no soporta el elemento de video.
    </video>
  );
}

export default VideoPlayer;