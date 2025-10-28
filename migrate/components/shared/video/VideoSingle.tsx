'use client'
import React from 'react'
import VideoPlayer from './VideoPlayer'

interface VideoSingleProps {
    src: string
    autoPlay?: boolean
    muted?: boolean
    loop?: boolean
    poster?: string
    className?: string
    maxWidth?: string
}

export default function VideoSingle({
    src,
    autoPlay = true,
    muted = true,
    loop = true,
    poster,
    className = '',
    maxWidth = 'max-w-screen-md'
}: VideoSingleProps) {
    return (
        <div className={`${maxWidth} mx-auto ${className}`}>
            <VideoPlayer
                src={src}
                autoPlay={autoPlay}
                muted={muted}
                loop={loop}
                poster={poster}
            />
        </div>
    )
}
