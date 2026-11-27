#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::Mutex;
use tauri::{Manager, RunEvent};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_shell::{process::CommandEvent, ShellExt};
use tauri_plugin_updater::{Update, UpdaterExt};
use url::Url;

struct NodeSidecar(Mutex<Option<tauri_plugin_shell::process::CommandChild>>);
struct TrustedOrigin(Mutex<Option<Url>>);
struct PendingUpdate(Mutex<Option<(Update, Vec<u8>)>>);

// An Agent launches the installed app itself in MCP mode. For AppImage this
// keeps the image mounted until Node exits, instead of storing a transient
// /tmp/.mount_* path in the Agent's configuration.
fn run_mcp() -> Result<i32, Box<dyn std::error::Error>> {
    let context: tauri::Context<tauri::Wry> = tauri::generate_context!();
    let environment = tauri::utils::Env::default();
    let resources = tauri::utils::platform::resource_dir(context.package_info(), &environment)?;
    let executable = tauri::utils::platform::current_exe()?;
    let directory = executable.parent().ok_or("应用路径无效")?;
    let node = directory.join(if cfg!(windows) {
        "cospace-node.exe"
    } else {
        "cospace-node"
    });
    let status = Command::new(node)
        .arg(resources.join("desktop/mcp-entry.bundle.cjs"))
        .env("COSPACE_RESOURCE_DIR", resources)
        .env_remove("COSPACE_LOCAL_SERVER_DIST")
        .env_remove("COSPACE_LOCAL_SERVER_VERSION")
        .env_remove("COSPACE_DESKTOP_RUNTIME_DIST")
        .stdin(Stdio::inherit())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .status()?;
    Ok(status.code().unwrap_or(1))
}

fn trusted_window(window: &tauri::WebviewWindow) -> Result<Url, String> {
    let url = window.url().map_err(|e| e.to_string())?;
    let state = window.state::<TrustedOrigin>();
    let expected = state.0.lock().map_err(|_| "窗口状态不可用")?;
    let allowed = expected.as_ref().ok_or("桌面页面尚未就绪")?;
    if url.scheme() != allowed.scheme()
        || url.host_str() != allowed.host_str()
        || url.port() != allowed.port()
    {
        return Err("不允许此页面执行更新".into());
    }
    Ok(url)
}

#[tauri::command]
async fn prepare_update(
    window: tauri::WebviewWindow,
    app: tauri::AppHandle,
) -> Result<Option<String>, String> {
    trusted_window(&window)?;
    #[cfg(target_os = "linux")]
    if std::env::var_os("APPIMAGE").is_none() {
        return Err("此 Linux 安装包请使用包管理器或手动安装更新。".into());
    }
    *app.state::<PendingUpdate>()
        .0
        .lock()
        .map_err(|_| "更新状态不可用")? = None;
    let update = app
        .updater()
        .map_err(|e| e.to_string())?
        .check()
        .await
        .map_err(|e| e.to_string())?;
    let Some(update) = update else {
        return Ok(None);
    };
    let bytes = update
        .download(|_, _| {}, || {})
        .await
        .map_err(|e| e.to_string())?;
    let version = update.version.clone();
    *app.state::<PendingUpdate>()
        .0
        .lock()
        .map_err(|_| "更新状态不可用")? = Some((update, bytes));
    Ok(Some(version))
}

#[tauri::command]
async fn install_prepared_update(
    window: tauri::WebviewWindow,
    app: tauri::AppHandle,
    local_token: String,
) -> Result<(), String> {
    let mut url = trusted_window(&window)?;
    url.set_path("/local/update");
    url.set_query(None);
    url.set_fragment(None);
    let response = reqwest::Client::builder()
        .no_proxy()
        .timeout(std::time::Duration::from_secs(3))
        .build()
        .map_err(|e| e.to_string())?
        .get(url)
        .header("x-cospace-token", local_token)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err("本地服务尚未安全停止，不能安装更新。".into());
    }
    let update = app
        .state::<PendingUpdate>()
        .0
        .lock()
        .map_err(|_| "更新状态不可用")?
        .take()
        .ok_or("没有已验证的更新")?;
    update.0.install(&update.1).map_err(|e| e.to_string())?;
    app.restart();
}

#[tauri::command]
async fn save_export(
    window: tauri::WebviewWindow,
    app: tauri::AppHandle,
    name: String,
    bytes: Vec<u8>,
) -> Result<bool, String> {
    trusted_window(&window)?;
    tauri::async_runtime::spawn_blocking(move || {
        let dialog = app.dialog().file().set_file_name(&name);
        let Some(path) = dialog.blocking_save_file() else {
            return Ok(true);
        };
        let path = path.into_path().map_err(|error| error.to_string())?;
        std::fs::write(path, bytes).map_err(|error| error.to_string())?;
        Ok(true)
    })
    .await
    .map_err(|error| error.to_string())?
}

fn main() {
    if std::env::args_os().nth(1).as_deref() == Some(std::ffi::OsStr::new("--mcp")) {
        match run_mcp() {
            Ok(code) => std::process::exit(code),
            Err(error) => {
                eprintln!("CoSpace MCP: {error}");
                std::process::exit(1);
            }
        }
    }
    tauri::Builder::default()
        .plugin(
            tauri::plugin::Builder::<tauri::Wry>::new("navigation-guard")
                .on_navigation(|webview, url| {
                    let state = webview.try_state::<TrustedOrigin>();
                    let trusted = state.as_ref().and_then(|s| s.0.lock().ok());
                    if let Some(Some(origin)) = trusted.as_deref() {
                        return url.scheme() == origin.scheme()
                            && url.host_str() == origin.host_str()
                            && url.port_or_known_default() == origin.port_or_known_default();
                    }
                    // Tauri loads its bundled startup page before the local
                    // service reports the authenticated workbench origin.
                    url.scheme() == "tauri"
                        || (matches!(url.scheme(), "http" | "https")
                            && url.host_str() == Some("tauri.localhost"))
                        || url.as_str() == "about:blank"
                })
                .build(),
        )
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            save_export,
            prepare_update,
            install_prepared_update
        ])
        .setup(|app| {
            app.manage(TrustedOrigin(Mutex::new(None)));
            app.manage(PendingUpdate(Mutex::new(None)));
            let resource_dir = app.path().resource_dir()?;
            let launcher = {
                #[cfg(target_os = "linux")]
                {
                    tauri::utils::Env::default()
                        .appimage
                        .map(PathBuf::from)
                        .unwrap_or(tauri::utils::platform::current_exe()?)
                }
                #[cfg(not(target_os = "linux"))]
                {
                    tauri::utils::platform::current_exe()?
                }
            };
            let server = resource_dir.join("desktop/server.bundle.cjs");
            let mut sidecar = app
                .shell()
                .sidecar("cospace-node")?
                .args([server.to_string_lossy().into_owned()])
                .env("COSPACE_OPEN_BROWSER", "0")
                .env("COSPACE_DEV", "0")
                .env(
                    "COSPACE_WEBAPP_DIST",
                    resource_dir
                        .join("dist/webapp")
                        .to_string_lossy()
                        .into_owned(),
                )
                .env(
                    "COSPACE_DESKTOP_LAUNCHER",
                    launcher.to_string_lossy().into_owned(),
                )
                .env(
                    "COSPACE_DESKTOP_RUNTIME_DIST",
                    resource_dir
                        .join("desktop/runtime")
                        .to_string_lossy()
                        .into_owned(),
                )
                .env(
                    "COSPACE_RESOURCE_DIR",
                    resource_dir.to_string_lossy().into_owned(),
                );
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
                                    Ok(url)
                                        if url.scheme() == "http"
                                            && url.host_str() == Some("127.0.0.1")
                                            && url.port().is_some() =>
                                    {
                                        if let Some(window) = handle.get_webview_window("main") {
                                            let origin = handle.state::<TrustedOrigin>();
                                            if let Ok(mut trusted) = origin.0.lock() {
                                                *trusted = Some(url.clone());
                                            }
                                            if let Err(error) = window.navigate(url) {
                                                eprintln!(
                                                    "Could not open CoSpace workbench: {error}"
                                                );
                                            }
                                        }
                                    }
                                    Ok(_) => eprintln!("Rejected non-local WebApp URL"),
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
