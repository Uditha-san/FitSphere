import React from 'react'
import { Play, Film, ExternalLink, Sparkles } from 'lucide-react'
import type { ExerciseVideo } from '../../types/exercise'

interface ExerciseVideoPlayerProps {
  video: ExerciseVideo
  autoPlay?: boolean
  className?: string
}

export const ExerciseVideoPlayer: React.FC<ExerciseVideoPlayerProps> = ({
  video,
  autoPlay = false,
  className = '',
}) => {
  const formatDuration = (seconds?: number | null) => {
    if (!seconds || seconds <= 0) return null
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs > 0 ? `${secs}s` : ''}` : `${secs}s`
  }

  // Convert URLs into safe embed URLs if YouTube or Vimeo
  const getEmbedUrl = (url: string): string | null => {
    try {
      const urlObj = new URL(url)
      // YouTube
      if (urlObj.hostname.includes('youtube.com')) {
        const v = urlObj.searchParams.get('v')
        if (v) return `https://www.youtube-nocookie.com/embed/${v}?rel=0${autoPlay ? '&autoplay=1' : ''}`
      }
      if (urlObj.hostname === 'youtu.be') {
        const v = urlObj.pathname.slice(1)
        if (v) return `https://www.youtube-nocookie.com/embed/${v}?rel=0${autoPlay ? '&autoplay=1' : ''}`
      }
      // Vimeo
      if (urlObj.hostname.includes('vimeo.com')) {
        const parts = urlObj.pathname.split('/').filter(Boolean)
        const id = parts[parts.length - 1]
        if (id && /^\d+$/.test(id)) {
          return `https://player.vimeo.com/video/${id}?title=0&byline=0&portrait=0${autoPlay ? '&autoplay=1' : ''}`
        }
      }
    } catch {
      // Invalid URL format
    }
    return null
  }

  const embedUrl = getEmbedUrl(video.video_url)
  const isDirectVideo = /\.(mp4|webm|ogg)($|\?)/i.test(video.video_url)

  return (
    <div className={`overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-xl ${className}`}>
      {/* Video Viewport */}
      <div className="relative aspect-video w-full bg-black">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={video.title}
            className="h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : isDirectVideo ? (
          <video
            src={video.video_url}
            poster={video.thumbnail_url || undefined}
            controls
            autoPlay={autoPlay}
            className="h-full w-full object-contain"
          >
            Your browser does not support HTML5 video playback.
          </video>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
            {video.thumbnail_url ? (
              <img
                src={video.thumbnail_url}
                alt={video.title}
                className="absolute inset-0 h-full w-full object-cover opacity-40"
              />
            ) : null}
            <div className="relative z-10 flex flex-col items-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 backdrop-blur-sm border border-emerald-500/30">
                <Play className="h-6 w-6 fill-current" />
              </div>
              <p className="mb-2 text-sm font-medium text-slate-200">{video.title}</p>
              <a
                href={video.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-emerald-500"
              >
                Watch Video on External Player <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* Primary Badge Overlay */}
        {video.is_primary && (
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1 rounded-full bg-emerald-500/90 px-2.5 py-0.5 text-xs font-semibold text-white shadow-md backdrop-blur-md">
            <Sparkles className="h-3 w-3" /> Primary Technique
          </div>
        )}

        {/* Duration badge */}
        {video.duration_seconds && (
          <div className="absolute bottom-3 right-3 z-10 rounded bg-slate-900/80 px-2 py-0.5 text-xs font-mono font-medium text-slate-300 backdrop-blur-sm">
            {formatDuration(video.duration_seconds)}
          </div>
        )}
      </div>

      {/* Video Metadata Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Film className="h-4 w-4 text-emerald-400" />
              {video.title}
            </h4>
            {video.description && (
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">{video.description}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
