use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

const DEFAULT_GAME_DIR: &str = r"C:\Program Files (x86)\Steam\steamapps\common\Ravenswatch";
const LAYOUT_RELATIVE_PATH: &str = r"DarkTalesResources\_Cooking\MzidisFqiidzyv\Aqurqv\Aqur_Srxxrz!Aqur_Srxxrz.qzidis.ri.MzidisFqiidzyvLqvrwubq.yqz";

#[derive(Serialize)]
struct MonitorInfo {
    id: String,
    name: String,
    width: u32,
    height: u32,
    x: i32,
    y: i32,
    scale_factor: f64,
    is_primary: bool,
}

#[derive(Deserialize, Serialize, Default)]
#[serde(rename_all = "camelCase")]
struct AppConfig {
    game_dir: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct GameFolderState {
    found: bool,
    game_dir: Option<String>,
    layout_path: Option<String>,
    source: String,
    message: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LayoutPatch {
    offset: u64,
    value: f32,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LayoutReadRequest {
    offset: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LayoutValue {
    offset: u64,
    value: f32,
}

#[tauri::command]
fn app_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

fn layout_path(game_dir: &Path) -> PathBuf {
    game_dir.join(LAYOUT_RELATIVE_PATH)
}

fn is_valid_game_dir(game_dir: &Path) -> bool {
    game_dir.join("Ravenswatch.exe").is_file() && layout_path(game_dir).is_file()
}

fn config_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map_err(|error| error.to_string())
        .map(|dir| dir.join("config.json"))
}

fn load_config(app: &tauri::AppHandle) -> AppConfig {
    let Ok(path) = config_path(app) else {
        return AppConfig::default();
    };
    let Ok(raw) = fs::read_to_string(path) else {
        return AppConfig::default();
    };
    serde_json::from_str(&raw).unwrap_or_default()
}

fn save_config(app: &tauri::AppHandle, config: &AppConfig) -> Result<(), String> {
    let path = config_path(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let raw = serde_json::to_string_pretty(config).map_err(|error| error.to_string())?;
    fs::write(path, raw).map_err(|error| error.to_string())
}

fn valid_state(game_dir: &Path, source: &str) -> GameFolderState {
    GameFolderState {
        found: true,
        game_dir: Some(game_dir.to_string_lossy().to_string()),
        layout_path: Some(layout_path(game_dir).to_string_lossy().to_string()),
        source: source.to_string(),
        message: "Ravenswatch game folder detected.".to_string(),
    }
}

fn missing_state(message: &str) -> GameFolderState {
    GameFolderState {
        found: false,
        game_dir: None,
        layout_path: None,
        source: "missing".to_string(),
        message: message.to_string(),
    }
}

fn candidate_dirs() -> Vec<(&'static str, PathBuf)> {
    let mut candidates = Vec::new();

    if let Ok(current_dir) = std::env::current_dir() {
        candidates.push(("current", current_dir));
    }

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            candidates.push(("executable", exe_dir.to_path_buf()));
        }
    }

    candidates.push(("default", PathBuf::from(DEFAULT_GAME_DIR)));
    candidates
}

#[tauri::command]
fn get_game_folder_state(app: tauri::AppHandle) -> GameFolderState {
    let config = load_config(&app);

    if let Some(saved_dir) = config.game_dir {
        let saved_path = PathBuf::from(saved_dir);
        if is_valid_game_dir(&saved_path) {
            return valid_state(&saved_path, "config");
        }
    }

    for (source, candidate) in candidate_dirs() {
        if is_valid_game_dir(&candidate) {
            let _ = save_config(
                &app,
                &AppConfig {
                    game_dir: Some(candidate.to_string_lossy().to_string()),
                },
            );
            return valid_state(&candidate, source);
        }
    }

    let _ = save_config(&app, &AppConfig::default());
    missing_state("Ravenswatch was not detected. Select the game folder manually.")
}

#[tauri::command]
fn set_game_folder(app: tauri::AppHandle, game_dir: String) -> Result<GameFolderState, String> {
    let path = PathBuf::from(game_dir);
    if !is_valid_game_dir(&path) {
        return Ok(missing_state(
            "The selected folder does not look like a Ravenswatch install folder.",
        ));
    }

    save_config(
        &app,
        &AppConfig {
            game_dir: Some(path.to_string_lossy().to_string()),
        },
    )?;

    Ok(valid_state(&path, "config"))
}

#[tauri::command]
fn save_layout_values(game_dir: String, patches: Vec<LayoutPatch>) -> Result<(), String> {
    let game_dir = PathBuf::from(game_dir);
    if !is_valid_game_dir(&game_dir) {
        return Err("The configured Ravenswatch game folder is not valid.".to_string());
    }

    let path = layout_path(&game_dir);
    let mut data = fs::read(&path).map_err(|error| error.to_string())?;

    for patch in patches {
        let offset = usize::try_from(patch.offset)
            .map_err(|_| format!("Patch offset is too large: {}", patch.offset))?;
        let end = offset
            .checked_add(4)
            .ok_or_else(|| format!("Patch offset overflows: {}", patch.offset))?;

        if end > data.len() {
            return Err(format!(
                "Patch offset is outside the layout file: 0x{offset:08X}"
            ));
        }

        data[offset..end].copy_from_slice(&patch.value.to_le_bytes());
    }

    fs::write(path, data).map_err(|error| error.to_string())
}

#[tauri::command]
fn load_layout_values(
    game_dir: String,
    requests: Vec<LayoutReadRequest>,
) -> Result<Vec<LayoutValue>, String> {
    let game_dir = PathBuf::from(game_dir);
    if !is_valid_game_dir(&game_dir) {
        return Err("The configured Ravenswatch game folder is not valid.".to_string());
    }

    let path = layout_path(&game_dir);
    let data = fs::read(&path).map_err(|error| error.to_string())?;
    let mut values = Vec::with_capacity(requests.len());

    for request in requests {
        let offset = usize::try_from(request.offset)
            .map_err(|_| format!("Read offset is too large: {}", request.offset))?;
        let end = offset
            .checked_add(4)
            .ok_or_else(|| format!("Read offset overflows: {}", request.offset))?;

        if end > data.len() {
            return Err(format!(
                "Read offset is outside the layout file: 0x{offset:08X}"
            ));
        }

        values.push(LayoutValue {
            offset: request.offset,
            value: f32::from_le_bytes(data[offset..end].try_into().map_err(|_| {
                format!("Failed to read f32 at layout offset: 0x{offset:08X}")
            })?),
        });
    }

    Ok(values)
}

#[tauri::command]
fn get_monitors(window: tauri::Window) -> Result<Vec<MonitorInfo>, String> {
    let primary = window.primary_monitor().map_err(|error| error.to_string())?;
    let monitors = window
        .available_monitors()
        .map_err(|error| error.to_string())?;

    Ok(monitors
        .into_iter()
        .enumerate()
        .map(|(index, monitor)| {
            let size = monitor.size();
            let position = monitor.position();
            let is_primary = primary.as_ref().is_some_and(|primary| {
                primary.size() == size && primary.position() == position
            });
            let name = monitor
                .name()
                .cloned()
                .unwrap_or_else(|| format!("Display {}", index + 1));

            MonitorInfo {
                id: format!("{}:{}:{}x{}", position.x, position.y, size.width, size.height),
                name,
                width: size.width,
                height: size.height,
                x: position.x,
                y: position.y,
                scale_factor: monitor.scale_factor(),
                is_primary,
            }
        })
        .collect())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            app_version,
            get_monitors,
            get_game_folder_state,
            set_game_folder,
            load_layout_values,
            save_layout_values
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
