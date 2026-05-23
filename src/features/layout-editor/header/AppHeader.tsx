import { IconArrowBackUp, IconArrowForwardUp, IconFolder } from "@tabler/icons-react";
import type { GameFolderState } from "../model/types";

type AppHeaderProps = {
  canRedo: boolean;
  canUndo: boolean;
  fileMenuOpen: boolean;
  gameState: GameFolderState | null;
  presetMenuOpen: boolean;
  onBackupSavedFile: () => void;
  onBrowseGameFolder: () => void;
  onRedo: () => void;
  onRestoreFile: () => void;
  onToggleFileMenu: () => void;
  onTogglePresetMenu: () => void;
  onUndo: () => void;
  onApplySafeAreaPreset: () => void;
  onResetDefaults: () => void;
  onSaveLayout: () => void;
};

export function AppHeader({
  canRedo,
  canUndo,
  fileMenuOpen,
  gameState,
  presetMenuOpen,
  onBackupSavedFile,
  onBrowseGameFolder,
  onRedo,
  onRestoreFile,
  onToggleFileMenu,
  onTogglePresetMenu,
  onUndo,
  onApplySafeAreaPreset,
  onResetDefaults,
  onSaveLayout,
}: AppHeaderProps) {
  return (
    <header className="toolbar">
      {gameState?.found && (
        <div className="header-content">
          <div className="header-left-actions">
            <div className="file-menu">
              <button className="header-action secondary" onClick={onToggleFileMenu} type="button">
                File
              </button>
              {fileMenuOpen && (
                <div className="file-popover">
                  <button onClick={onBackupSavedFile} type="button">
                    Backup Saved File
                  </button>
                  <button className="danger-menu-item" onClick={onRestoreFile} type="button">
                    Restore File
                  </button>
                  <p>
                    Saved file only. Unsaved editor changes are not backed up.
                    Restore overwrites the current saved file.
                  </p>
                </div>
              )}
            </div>
            <button className="game-folder-bar" onClick={onBrowseGameFolder} type="button">
              <IconFolder className="game-folder-icon" size={18} stroke={2} />
              <span className="game-folder-tooltip">{gameState.gameDir}</span>
            </button>
            <button aria-label="Undo" className="header-icon-action" disabled={!canUndo} onClick={onUndo} title="Undo (Ctrl+Z)" type="button">
              <IconArrowBackUp size={17} stroke={2} />
            </button>
            <button aria-label="Redo" className="header-icon-action" disabled={!canRedo} onClick={onRedo} title="Redo (Ctrl+Y)" type="button">
              <IconArrowForwardUp size={17} stroke={2} />
            </button>
          </div>
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
