import React, { useRef, useEffect } from 'react';
import { formatSpeed } from '../../utils/formatters';

interface BandwidthGraphProps {
  speedHistory: { timestamp: number; speed: number }[];
  height?: number;
}

export function BandwidthGraph({ speedHistory, height = 120 }: BandwidthGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentSpeed = speedHistory.length > 0 ? speedHistory[speedHistory.length - 1].speed : 0;
  const peakSpeed = speedHistory.reduce((max, p) => Math.max(max, p.speed), 0);
  const avgSpeed = speedHistory.length > 0
    ? speedHistory.reduce((sum, p) => sum + p.speed, 0) / speedHistory.length
    : 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padding = { top: 4, bottom: 4, left: 0, right: 0 };
    const graphW = w - padding.left - padding.right;
    const graphH = h - padding.top - padding.bottom;

    ctx.clearRect(0, 0, w, h);

    if (speedHistory.length < 2) return;

    const maxSpeed = Math.max(peakSpeed * 1.1, 1024); // at least 1 KB/s scale
    const points = speedHistory.slice(-60); // last 60 data points

    // Build path
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const x = padding.left + (i / (points.length - 1)) * graphW;
      const y = padding.top + graphH - (points[i].speed / maxSpeed) * graphH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    // Stroke line
    const accentStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#6366f1';
    ctx.strokeStyle = accentStyle;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Fill gradient below line
    const lastX = padding.left + graphW;
    ctx.lineTo(lastX, padding.top + graphH);
    ctx.lineTo(padding.left, padding.top + graphH);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + graphH);
    gradient.addColorStop(0, accentStyle + '40');
    gradient.addColorStop(1, accentStyle + '05');
    ctx.fillStyle = gradient;
    ctx.fill();
  }, [speedHistory, peakSpeed]);

  return (
    <div className="bg-card border border-card-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary">Download Speed</h3>
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <span>Current: <span className="text-accent font-medium">{formatSpeed(currentSpeed)}</span></span>
          <span>Peak: <span className="text-text-primary font-medium">{formatSpeed(peakSpeed)}</span></span>
          <span>Avg: <span className="text-text-primary font-medium">{formatSpeed(avgSpeed)}</span></span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full rounded-lg"
        style={{ height }}
      />
    </div>
  );
}
