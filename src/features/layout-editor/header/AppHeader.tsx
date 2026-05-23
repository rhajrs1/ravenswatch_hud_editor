import { IconFolder } from "@tabler/icons-react";
import type { GameFolderState } from "../model/types";

type AppHeaderProps = {
  gameState: GameFolderState | null;
  presetMenuOpen: boolean;
  onBrowseGameFolder: () => void;
  onTogglePresetMenu: () => void;
  onApplySafeAreaPreset: () => void;
  onResetDefaults: () => void;
  onSaveLayout: () => void;
};

export function AppHeader({
  gameState,
  presetMenuOpen,
  onBrowseGameFolder,
  onTogglePresetMenu,
  onApplySafeAreaPreset,
  onResetDefaults,
  onSaveLayout,
}: AppHeaderProps) {
  return (
    <header className="toolbar">
      {gameState?.found && (
        <div className="header-content">
          <button className="game-folder-bar" onClick={onBrowseGameFolder} type="button">
            <IconFolder className="game-folder-icon" size={18} stroke={2} />
            <span className="game-folder-tooltip">{gameState.gameDir}</span>
          </button>
          <div className="header-actions">
            <div className="preset-menu">
              <button className="header-action secondary" onClick={onTogglePresetMenu} type="button">
                Presets
              </button>
              {presetMenuOpen && (
                <div className="preset-popover">
                  <button onClick={onApplySafeAreaPreset} type="button">
                    16:9 Safe Area
                  </button>
                </div>
              )}
            </div>
            <button className="header-action secondary" onClick={onResetDefaults} type="button">
              Reset Defaults
            </button>
            <button className="header-action primary" onClick={onSaveLayout} type="button">
              Save
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
