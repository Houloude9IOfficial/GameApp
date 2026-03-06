import React, { useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGamepadStore } from '../../stores/useGamepadStore';

// Standard gamepad button indices
const BUTTON = {
  A: 0,       // Confirm / Click
  B: 1,       // Back
  X: 2,
  Y: 3,
  LB: 4,      // Previous tab
  RB: 5,      // Next tab
  LT: 6,
  RT: 7,
  SELECT: 8,
  START: 9,
  L3: 10,
  R3: 11,
  DPAD_UP: 12,
  DPAD_DOWN: 13,
  DPAD_LEFT: 14,
  DPAD_RIGHT: 15,
};

const NAV_ROUTES = ['/', '/store', '/downloads', '/friends', '/activity', '/settings'];

// Deadzone for analog sticks
const DEADZONE = 0.5;
const REPEAT_DELAY = 300; // ms before repeat kicks in
const REPEAT_INTERVAL = 120; // ms between repeats

function getFocusableElements(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      'button:not([disabled]):not([tabindex="-1"]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"]), [data-focusable]'
    )
  ).filter(el => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  });
}

function findClosest(current: HTMLElement | null, direction: 'up' | 'down' | 'left' | 'right'): HTMLElement | null {
  const elements = getFocusableElements();
  if (elements.length === 0) return null;
  if (!current) return elements[0];

  const rect = current.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  let best: HTMLElement | null = null;
  let bestDist = Infinity;

  for (const el of elements) {
    if (el === current) continue;
    const r = el.getBoundingClientRect();
    const ex = r.left + r.width / 2;
    const ey = r.top + r.height / 2;

    // Filter by direction
    const dx = ex - cx;
    const dy = ey - cy;

    let valid = false;
    switch (direction) {
      case 'up': valid = dy < -10; break;
      case 'down': valid = dy > 10; break;
      case 'left': valid = dx < -10; break;
      case 'right': valid = dx > 10; break;
    }
    if (!valid) continue;

    // Weight: primary axis distance + secondary axis penalty
    let dist: number;
    if (direction === 'up' || direction === 'down') {
      dist = Math.abs(dy) + Math.abs(dx) * 0.3;
    } else {
      dist = Math.abs(dx) + Math.abs(dy) * 0.3;
    }

    if (dist < bestDist) {
      bestDist = dist;
      best = el;
    }
  }

  return best;
}

export function GamepadHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const { connected, enabled, setConnected } = useGamepadStore();
  const frameRef = useRef<number>();
  const prevButtons = useRef<boolean[]>([]);
  const prevAxes = useRef<number[]>([]);
  const repeatTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // Connection events
  useEffect(() => {
    const onConnect = (e: GamepadEvent) => {
      setConnected(true, e.gamepad.id);
    };
    const onDisconnect = () => {
      setConnected(false);
    };
    window.addEventListener('gamepadconnected', onConnect);
    window.addEventListener('gamepaddisconnected', onDisconnect);

    // Check if already connected
    const gamepads = navigator.getGamepads();
    for (const gp of gamepads) {
      if (gp) { setConnected(true, gp.id); break; }
    }

    return () => {
      window.removeEventListener('gamepadconnected', onConnect);
      window.removeEventListener('gamepaddisconnected', onDisconnect);
    };
  }, []);

  const moveFocus = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    const current = document.activeElement as HTMLElement;
    const next = findClosest(current, direction);
    if (next) {
      next.focus();
      next.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, []);

  const handleNavigation = useCallback((direction: number) => {
    const currentIdx = NAV_ROUTES.indexOf(location.pathname);
    const nextIdx = Math.max(0, Math.min(NAV_ROUTES.length - 1, currentIdx + direction));
    if (nextIdx !== currentIdx) {
      navigate(NAV_ROUTES[nextIdx]);
    }
  }, [location.pathname, navigate]);

  // Main polling loop
  useEffect(() => {
    if (!enabled) return;

    const poll = () => {
      const gamepads = navigator.getGamepads();
      const gp = gamepads[0];
      if (!gp) {
        frameRef.current = requestAnimationFrame(poll);
        return;
      }

      const buttons = gp.buttons.map(b => b.pressed);
      const axes = gp.axes.slice();

      // Button press detection (rising edge)
      const justPressed = (idx: number) => buttons[idx] && !prevButtons.current[idx];

      // A button - click focused element
      if (justPressed(BUTTON.A)) {
        const focused = document.activeElement as HTMLElement;
        if (focused) focused.click();
      }

      // B button - go back
      if (justPressed(BUTTON.B)) {
        navigate(-1);
      }

      // D-pad and left stick - spatial navigation
      const moveUp = justPressed(BUTTON.DPAD_UP) || (axes[1] < -DEADZONE && prevAxes.current[1] >= -DEADZONE);
      const moveDown = justPressed(BUTTON.DPAD_DOWN) || (axes[1] > DEADZONE && prevAxes.current[1] <= DEADZONE);
      const moveLeft = justPressed(BUTTON.DPAD_LEFT) || (axes[0] < -DEADZONE && prevAxes.current[0] >= -DEADZONE);
      const moveRight = justPressed(BUTTON.DPAD_RIGHT) || (axes[0] > DEADZONE && prevAxes.current[0] <= DEADZONE);

      if (moveUp) moveFocus('up');
      if (moveDown) moveFocus('down');
      if (moveLeft) moveFocus('left');
      if (moveRight) moveFocus('right');

      // LB/RB - switch sidebar tabs
      if (justPressed(BUTTON.LB)) handleNavigation(-1);
      if (justPressed(BUTTON.RB)) handleNavigation(1);

      // Right stick - scroll
      const scrollContainer = document.querySelector('main');
      if (scrollContainer) {
        const scrollY = axes[3];
        if (Math.abs(scrollY) > DEADZONE) {
          const child = scrollContainer.querySelector('.overflow-y-auto') || scrollContainer;
          child.scrollBy({ top: scrollY * 15 });
        }
      }

      prevButtons.current = buttons;
      prevAxes.current = axes;
      frameRef.current = requestAnimationFrame(poll);
    };

    frameRef.current = requestAnimationFrame(poll);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      Object.values(repeatTimers.current).forEach(clearTimeout);
    };
  }, [enabled, moveFocus, handleNavigation, navigate]);

  // Add focus styles for gamepad mode
  useEffect(() => {
    if (!connected) return;
    const style = document.createElement('style');
    style.id = 'gamepad-focus-style';
    style.textContent = `
      :focus-visible {
        outline: 2px solid var(--color-accent) !important;
        outline-offset: 2px !important;
      }
    `;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, [connected]);

  return null; // This is a non-visual component
}
