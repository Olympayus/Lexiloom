use tauri::Manager;

#[tauri::command]
fn get_dictionary_path(app: tauri::AppHandle) -> Result<String, String> {
    let path = app.path().resource_dir()
        .map_err(|e| e.to_string())?
        .join("public").join("dictionaries").join("cc-cedict.db");
    Ok(path.to_string_lossy().to_string().replace("\\", "/"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
        .invoke_handler(tauri::generate_handler![get_dictionary_path])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
