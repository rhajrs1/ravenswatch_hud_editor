use serde::Serialize;

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

#[tauri::command]
fn app_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
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
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![app_version, get_monitors])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
