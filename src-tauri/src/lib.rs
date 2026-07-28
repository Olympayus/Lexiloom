use std::fs;
use tauri::Manager;

fn seed_dictionary(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let app_dir = app.path().app_data_dir()?;
    fs::create_dir_all(&app_dir)?;
    let dest = app_dir.join("cc-cedict.db");
    if dest.exists() {
        // If the existing file was created by Database.load() it will be
        // an empty 4KB SQLite — replace it with the bundled copy.
        let size = fs::metadata(&dest)?.len();
        if size > 8192 {
            return Ok(());
        }
        fs::remove_file(&dest)?;
    }

    let resource_dir = app.path().resource_dir()?;
    println!("[seed] resource_dir = {}", resource_dir.display());

    // Try all possible source paths
    let candidates = [
        resource_dir.join("_up_").join("public").join("dictionaries").join("cc-cedict.db"),
        resource_dir.join("public").join("dictionaries").join("cc-cedict.db"),
        resource_dir.join("dictionaries").join("cc-cedict.db"),
    ];

    for source in &candidates {
        println!("[seed] trying = {}", source.display());
        if source.exists() {
            println!("[seed] found, copying to {}", dest.display());
            fs::copy(source, &dest)?;
            return Ok(());
        }
    }

    Err(format!("dictionary not found, tried: {:?}", candidates).into())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
        .setup(|app| {
            if let Err(e) = seed_dictionary(app) {
                println!("[seed] setup error: {e}");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
