use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
        .invoke_handler(tauri::generate_handler![dict_resource_path])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// 返回词典库绝对路径。
/// 生产：resources 就地直读（resource_dir = exe 所在目录）。
/// dev：resources 未注入 target/debug，回退 app_config_dir（由 build:dictionaries 填充）。
#[tauri::command]
fn dict_resource_path(app: tauri::AppHandle, name: String) -> Result<String, String> {
    use tauri::path::BaseDirectory;

    let resource = app
        .path()
        .resolve(&name, BaseDirectory::Resource)
        .map_err(|e| e.to_string())?;
    if resource.exists() {
        return Ok(resource.to_string_lossy().into_owned());
    }
    app.path()
        .resolve(&name, BaseDirectory::AppConfig)
        .map(|p| p.to_string_lossy().into_owned())
        .map_err(|e| e.to_string())
}
