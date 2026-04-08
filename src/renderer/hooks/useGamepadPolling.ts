import { useEffect } from "react";
import { GamepadInfo } from "../../shared/types";
import { useGamepadStore } from "../stores/useGamepadStore";

/**
 * Hook to continuously poll the Gamepad API for connected controllers
 * Uses RequestAnimationFrame for smooth, continuous detection
 * No user interaction required - detects immediately when controller connects
 *
 * Works with all HID-compliant game controllers including:
 * - PlayStation DualSense / DualShock 4
 * - Xbox controllers
 * - Generic HID game controllers
 */
export function useGamepadPolling(): void {
  const setGamepads = useGamepadStore((s) => s.setGamepads);

  useEffect(() => {
    let rafId: number;
    let lastUpdateTime = 0;
    const updateThrottle = 100; // Update at most every 100ms to avoid excessive re-renders

    /**
     * Get all connected gamepads from the Gamepad API
     * The Gamepad API returns a live list, so we poll continuously
     */
    function convertGamepads(): GamepadInfo[] {
      const gamepads = navigator.getGamepads?.() || [];
      const result: GamepadInfo[] = [];

      // Loop through all possible gamepad slots (typically 0-3)
      for (let i = 0; i < gamepads.length && result.length < 4; i++) {
        const gp = gamepads[i];

        // Only include if gamepad exists AND is connected
        if (gp && gp.connected) {
          result.push({
            index: gp.index,
            id: gp.id,
            name: gp.id, // Includes "HID compliant game controller" for generic controllers
            connected: gp.connected,
            battery: 75, // No battery API available in standard Gamepad API
            signalStrength: 85, // Placeholder value
            lastUpdated: Date.now(),
          });
        }
      }

      return result;
    }

    /**
     * Main loop using RequestAnimationFrame
     * Runs continuously whenever the page is being rendered
     * This is the most reliable way to detect gamepads in Electron
     */
    function pollGamepads() {
      const now = Date.now();

      // Throttle updates to avoid excessive re-renders
      if (now - lastUpdateTime > updateThrottle) {
        const updated = convertGamepads();
        setGamepads(updated);
        lastUpdateTime = now;

        // Log when gamepads change for debugging
        if (updated.length > 0) {
          console.log(
            `[Gamepad] Detected ${updated.length} controller(s): ${updated.map((g) => g.name).join(", ")}`
          );
        }
      }

      // Continue polling on every frame
      rafId = requestAnimationFrame(pollGamepads);
    }

    // Listen for gamepad connection/disconnection events (backup detection method)
    const handleGamepadConnected = (e: GamepadEvent) => {
      console.log(`[Gamepad] Connected: ${e.gamepad.id}`);
      const updated = convertGamepads();
      setGamepads(updated);
    };

    const handleGamepadDisconnected = (e: GamepadEvent) => {
      console.log(`[Gamepad] Disconnected: ${e.gamepad.id}`);
      const updated = convertGamepads();
      setGamepads(updated);
    };

    // Set up event listeners
    window.addEventListener("gamepadconnected", handleGamepadConnected);
    window.addEventListener("gamepaddisconnected", handleGamepadDisconnected);

    // Start continuous polling via RAF
    console.log("[Gamepad] Starting continuous polling...");
    rafId = requestAnimationFrame(pollGamepads);

    // Cleanup function
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("gamepadconnected", handleGamepadConnected);
      window.removeEventListener("gamepaddisconnected", handleGamepadDisconnected);
      console.log("[Gamepad] Polling stopped");
    };
  }, [setGamepads]);
}
