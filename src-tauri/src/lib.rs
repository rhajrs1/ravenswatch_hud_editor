use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

const DEFAULT_GAME_DIR: &str = r"C:\Program Files (x86)\Steam\steamapps\common\Ravenswatch";
const ACTIVE_LAYOUT_RELATIVE_PATH: &str =
    r"DarkTalesResources\_Cooking\MzidisFqiidzyv\Aqurqv\Aqur_Srxxrz!Aqur_Srxxrz_Jjtgiq5.qzidis.ri.MzidisFqiidzyvLqvrwubq.yqz";
const REQUIRED_LAYOUT_LABELS: [&[u8]; 4] = [
    b"LEFT_FRAME\0",
    b"RIGHT FRAME\0",
    b"HUD_Frame_Left\0",
    b"HUD_Frame_Right\0",
];

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

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LayoutRecord {
    marker: u64,
    label: String,
    kind: u32,
    flag_x: u8,
    flag_y: u8,
    width_basis_raw: u8,
    x: f32,
    y: f32,
    width: f32,
    height: f32,
    pivot_x: f32,
    pivot_y: f32,
}

#[tauri::command]
fn app_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

fn contains_required_layout_labels(path: &Path) -> bool {
    let Ok(data) = fs::read(path) else {
        return false;
    };

    REQUIRED_LAYOUT_LABELS
        .iter()
        .all(|label| data.windows(label.len()).any(|window| window == *label))
}

fn find_layout_path(game_dir: &Path) -> Option<PathBuf> {
    let path = game_dir.join(ACTIVE_LAYOUT_RELATIVE_PATH);
    (path.is_file() && contains_required_layout_labels(&path)).then_some(path)
}

fn is_valid_game_dir(game_dir: &Path) -> bool {
    game_dir.join("Ravenswatch.exe").is_file() && find_layout_path(game_dir).is_some()
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
        layout_path: find_layout_path(game_dir).map(|path| path.to_string_lossy().to_string()),
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

    let path = find_layout_path(&game_dir)
        .ok_or_else(|| "The Ravenswatch layout file could not be found.".to_string())?;
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
fn backup_layout_file(game_dir: String, target_path: String) -> Result<(), String> {
    let game_dir = PathBuf::from(game_dir);
    if !is_valid_game_dir(&game_dir) {
        return Err("The configured Ravenswatch game folder is not valid.".to_string());
    }

    let source = find_layout_path(&game_dir)
        .ok_or_else(|| "The Ravenswatch layout file could not be found.".to_string())?;
    let target = PathBuf::from(target_path);
    fs::copy(source, target)
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn restore_layout_file(game_dir: String, backup_path: String) -> Result<(), String> {
    let game_dir = PathBuf::from(game_dir);
    if !is_valid_game_dir(&game_dir) {
        return Err("The configured Ravenswatch game folder is not valid.".to_string());
    }

    let backup = PathBuf::from(backup_path);
    if !backup.is_file() {
        return Err("The selected backup file does not exist.".to_string());
    }

    let target = find_layout_path(&game_dir)
        .ok_or_else(|| "The Ravenswatch layout file could not be found.".to_string())?;
    fs::copy(backup, target)
        .map(|_| ())
        .map_err(|error| error.to_string())
}

fn read_f32(data: &[u8], offset: usize) -> Option<f32> {
    let end = offset.checked_add(4)?;
    let bytes = data.get(offset..end)?;
    Some(f32::from_le_bytes(bytes.try_into().ok()?))
}

fn read_u32(data: &[u8], offset: usize) -> Option<u32> {
    let end = offset.checked_add(4)?;
    let bytes = data.get(offset..end)?;
    Some(u32::from_le_bytes(bytes.try_into().ok()?))
}

fn read_label(data: &[u8], offset: usize) -> Option<String> {
    let tail = data.get(offset..)?;
    let end = tail.iter().position(|byte| *byte == 0)?;
    if end == 0 {
        return None;
    }

    let raw = &tail[..end];
    if !raw.iter().all(|byte| byte.is_ascii_graphic() || *byte == b' ') {
        return None;
    }

    String::from_utf8(raw.to_vec()).ok()
}

fn scan_records(data: &[u8]) -> Vec<LayoutRecord> {
    const SIGNATURE: &[u8; 8] = b"\x22\x22\xBB\xAA\x11\x11\xBB\xAA";
    const RECORD_MIN_LEN: usize = 65;

    let mut records = Vec::new();
    let mut index = 0usize;

    while let Some(relative) = data[index..]
        .windows(SIGNATURE.len())
        .position(|window| window == SIGNATURE)
    {
        let marker = index + relative;
        index = marker + 1;

        let Some(kind) = read_u32(data, marker + 8) else {
            continue;
        };
        let Some(ref_count) = read_u32(data, marker + 53) else {
            continue;
        };
        let Ok(ref_count) = usize::try_from(ref_count) else {
            continue;
        };
        let Some(label_offset) = marker
            .checked_add(RECORD_MIN_LEN)
            .and_then(|offset| offset.checked_add(ref_count.saturating_mul(4)))
        else {
            continue;
        };
        let Some(label) = read_label(data, label_offset) else {
            continue;
        };

        let Some(x) = read_f32(data, marker + 14) else {
            continue;
        };
        let Some(y) = read_f32(data, marker + 18) else {
            continue;
        };
        let Some(width) = read_f32(data, marker + 25) else {
            continue;
        };
        let Some(height) = read_f32(data, marker + 29) else {
            continue;
        };
        let Some(pivot_x) = read_f32(data, marker + 35) else {
            continue;
        };
        let Some(pivot_y) = read_f32(data, marker + 39) else {
            continue;
        };

        records.push(LayoutRecord {
            marker: marker as u64,
            label,
            kind,
            flag_x: *data.get(marker + 22).unwrap_or(&0),
            flag_y: *data.get(marker + 23).unwrap_or(&0),
            width_basis_raw: *data.get(marker + 24).unwrap_or(&0),
            x,
            y,
            width,
            height,
            pivot_x,
            pivot_y,
        });
    }

    records
}

#[tauri::command]
fn scan_layout_records(game_dir: String) -> Result<Vec<LayoutRecord>, String> {
    let game_dir = PathBuf::from(game_dir);
    if !is_valid_game_dir(&game_dir) {
        return Err("The configured Ravenswatch game folder is not valid.".to_string());
    }

    let path = find_layout_path(&game_dir)
        .ok_or_else(|| "The Ravenswatch layout file could not be found.".to_string())?;
    let data = fs::read(&path).map_err(|error| error.to_string())?;
    Ok(scan_records(&data))
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

    let path = find_layout_path(&game_dir)
        .ok_or_else(|| "The Ravenswatch layout file could not be found.".to_string())?;
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
            backup_layout_file,
            load_layout_values,
            restore_layout_file,
            scan_layout_records,
            save_layout_values
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
