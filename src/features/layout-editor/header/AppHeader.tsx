import type { GameFolderState } from "../model/types";

type AppHeaderProps = {
  fileMenuOpen: boolean;
  gameState: GameFolderState | null;
  hasUnsavedChanges: boolean;
  presetMenuOpen: boolean;
  onBackupSavedFile: () => void;
  onBrowseGameFolder: () => void;
  onRestoreFile: () => void;
  onToggleFileMenu: () => void;
  onTogglePresetMenu: () => void;
  onApplySafeAreaPreset: () => void;
  onResetDefaults: () => void;
  onSaveLayout: () => void;
};

export function AppHeader({
  fileMenuOpen,
  gameState,
  hasUnsavedChanges,
  presetMenuOpen,
  onBackupSavedFile,
  onBrowseGameFolder,
  onRestoreFile,
  onToggleFileMenu,
  onTogglePresetMenu,
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
                  <button onClick={onBrowseGameFolder} type="button">
                    Select Game Folder
                  </button>
                  <div className="menu-separator" />
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
          </div>
          <div className="header-actions">
            <div className="preset-menu">
              <button className="header-action secondary" onClick={onTogglePresetMenu} type="button">
                Presets
              </button>
              {presetMenuOpen && (
                <div className="preset-popover">
                  <button onClick={onApplySafeAreaPreset} type="button">
                    Basic Setup (5120 x 1440)
                  </button>
                </div>
              )}
            </div>
            <button className="header-action secondary" onClick={onResetDefaults} type="button">
              Reset Defaults
            </button>
            <button className="header-action primary" disabled={!hasUnsavedChanges} onClick={onSaveLayout} type="button">
              Save
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
