import React from "react";
import { Gamepad2 } from "lucide-react";
import { GamepadInfo } from "../../../shared/types";
import { useGamepadStore } from "../../stores/useGamepadStore";

interface ControllerStatusProps {
  collapsed: boolean;
}

/**
 * Single controller card - shows for expanded view
 */
function ControllerCard({ gamepad }: { gamepad: GamepadInfo }): JSX.Element {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-surface-active bg-opacity-50">
      <Gamepad2 size={14} className="text-accent shrink-0" />
      <span className="text-xs font-medium text-text-primary truncate flex-1">
        {gamepad.name}
      </span>
    </div>
  );
}

/**
 * Controller Status Section
 * Shows connected wireless controllers above storage indicator
 */
export function ControllerStatus({ collapsed }: ControllerStatusProps): JSX.Element | null {
  // Get connected gamepads from store
  // Note: Gamepad polling initialized globally in App.tsx via GamepadStatusManager
  const connectedGamepads = useGamepadStore((s) => s.getConnectedGamepads());

  // Hide if no controllers connected
  if (connectedGamepads.length === 0) {
    return null;
  }

  return (
    <div className={`p-3 border-t border-card-border ${collapsed ? "px-2" : ""}`}>
      {!collapsed && connectedGamepads.length > 0 && (
        <div className="space-y-1.5">
          {/* Section Header */}
          <div className="flex items-center gap-1.5 text-text-muted">
            <Gamepad2 size={14} />
            <span className="text-xs font-medium">Controllers ({connectedGamepads.length})</span>
          </div>

          {/* Controller List */}
          <div className="space-y-1">
            {connectedGamepads.slice(0, 6).map((gamepad) => (
              <ControllerCard key={gamepad.index} gamepad={gamepad} />
            ))}
          </div>
        </div>
      )}

      {collapsed && connectedGamepads.length > 0 && (
        <div className="flex justify-center gap-2 flex-wrap">
          {connectedGamepads.slice(0, 4).map((gamepad) => (
            <div
              key={gamepad.index}
              className="relative group"
              title={gamepad.name}
            >
              <Gamepad2 size={16} className="text-accent transition-colors hover:text-text-primary" />

              {/* Tooltip on hover for collapsed state */}
              <div className="absolute bottom-full left-1/2 mb-2 hidden group-hover:block -translate-x-1/2 z-50">
                <div className="relative">
                  <div className="bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">
                    <div className="font-medium">{gamepad.name}</div>
                  </div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
