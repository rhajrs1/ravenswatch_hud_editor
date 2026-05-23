import { useState } from "react";
import type { GameFolderState } from "../model/types";

const REPOSITORY_URL = "https://github.com/rhajrs1/ravenswatch_hud_editor";

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
  const [aboutOpen, setAboutOpen] = useState(false);

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
                  <div className="menu-separator" />
                  <button onClick={() => setAboutOpen(true)} type="button">
                    About
                  </button>
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
      {aboutOpen && (
        <div className="about-backdrop" onMouseDown={() => setAboutOpen(false)}>
          <div className="about-dialog" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="about-title">
            <div className="about-header">
              <h2 id="about-title">Ravenswatch HUD Layout Editor</h2>
              <button aria-label="Close About" className="icon-action" onClick={() => setAboutOpen(false)} type="button">
                x
              </button>
            </div>
            <dl className="about-content">
              <dt>Repository</dt>
              <dd>
                <a href={REPOSITORY_URL} target="_blank" rel="noreferrer">
                  {REPOSITORY_URL}
                </a>
              </dd>
              <dt>Copyright</dt>
              <dd>Copyright (c) 2026 rhajrs</dd>
              <dt>License</dt>
              <dd>MIT License</dd>
            </dl>
          </div>
        </div>
      )}
    </header>
  );
}
