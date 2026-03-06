import React from 'react';
import { Play, ExternalLink } from 'lucide-react';

interface YouTubePlayerProps {
  youtubeUrl: string;
  title?: string;
  className?: string;
}

/**
 * Extract YouTube video ID from various URL formats
 */
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * YouTube player that opens videos in the system browser.
 *
 * YouTube iframe/embed embeds consistently fail in Electron with Error 153
 * (video player configuration error) due to origin mismatches, cookie
 * restrictions, and CSP conflicts across all embed domains
 * (youtube.com, youtube-nocookie.com).
 *
 * This component displays the video thumbnail with a play button overlay.
 * Clicking opens the YouTube URL in the user's default browser, which is
 * the standard approach used by Electron apps (Discord, VS Code, etc.).
 */
export function YouTubePlayer({ youtubeUrl, title, className = '' }: YouTubePlayerProps) {
  const videoId = extractVideoId(youtubeUrl);

  if (!videoId) {
    return (
      <div className={`bg-card border border-card-border rounded-xl flex items-center justify-center text-text-muted text-sm p-8 ${className}`}>
        Invalid YouTube URL
      </div>
    );
  }

  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  const openVideo = () => {
    window.electronAPI.openUrl(youtubeUrl);
  };

  return (
    <div className={`relative bg-black rounded-xl overflow-hidden group cursor-pointer ${className}`} onClick={openVideo}>
      {/* 16:9 aspect ratio container */}
      <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
        <div className="absolute inset-0">
          <img
            src={thumbnailUrl}
            alt={title || 'Trailer'}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            }}
          />
          {/* Hover darken overlay */}
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />

          {/* Play button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white/90 group-hover:bg-white flex items-center justify-center transition-all group-hover:scale-110 shadow-2xl">
              <Play size={28} className="text-black ml-1" fill="currentColor" />
            </div>
          </div>

          {/* Bottom bar: title + "Opens in browser" hint */}
          <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-between">
            {title && <span className="text-white text-sm font-medium">{title}</span>}
            <span className="flex items-center gap-1 text-white/60 text-[11px] ml-auto">
              <ExternalLink size={10} />
              Opens in browser
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
