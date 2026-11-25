#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use std::path::PathBuf;
use tauri::{Manager, RunEvent};
use tauri_plugin_shell::{process::CommandEvent, ShellExt};
use url::Url;

struct NodeSidecar(Mutex<Option<tauri_plugin_shell::process::CommandChild>>);

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let resource_dir = app.path().resource_dir()?;
            let server = resource_dir.join("desktop/server.bundle.cjs");
            let mut sidecar = app
                .shell()
                .sidecar("cospace-node")?
                .args([server.to_string_lossy().into_owned()])
                .env("COSPACE_OPEN_BROWSER", "0")
                .env("COSPACE_RESOURCE_DIR", resource_dir.to_string_lossy().into_owned());
            if cfg!(debug_assertions) {
                let webapp = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../build/webapp");
                sidecar = sidecar
                    .env("COSPACE_DEV", "1")
                    .env("COSPACE_WEBAPP_DIST", webapp.to_string_lossy().into_owned());
            }
            let (mut events, child) = sidecar.spawn()?;
            app.manage(NodeSidecar(Mutex::new(Some(child))));

            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                while let Some(event) = events.recv().await {
                    match event {
                        CommandEvent::Stdout(line) => {
                            let output = String::from_utf8_lossy(&line);
                            if let Some(address) = output.trim().strip_prefix("CoSpace WebApp: ") {
                                match Url::parse(address) {
                                    Ok(url) => {
                                        if let Some(window) = handle.get_webview_window("main") {
                                            if let Err(error) = window.navigate(url) {
                                                eprintln!("Could not open CoSpace workbench: {error}");
                                            }
                                        }
                                    }
                                    Err(error) => eprintln!("Invalid local WebApp URL: {error}"),
                                }
                            }
                        }
                        CommandEvent::Stderr(line) => eprint!("{}", String::from_utf8_lossy(&line)),
                        CommandEvent::Terminated(status) => {
                            eprintln!("CoSpace local service stopped: {:?}", status.code);
                            handle.exit(status.code.unwrap_or(1) as i32);
                            break;
                        }
                        _ => {}
                    }
                }
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("failed to build CoSpace Tauri application")
        .run(|app, event| {
            if matches!(event, RunEvent::Exit) {
                if let Some(sidecar) = app.try_state::<NodeSidecar>() {
                    if let Ok(mut child) = sidecar.0.lock() {
                        if let Some(child) = child.take() {
                            let _ = child.kill();
                        }
                    }
                }
            }
        });
}
