#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::ffi::OsStr;
use std::fs;
use std::sync::Mutex;
use std::time::Duration;
use std::{
    env::{current_dir, var},
    path::Path,
};

// use notify::{RecommendedWatcher, RecursiveMode, Result, Watcher};
use notify_debouncer_mini::{new_debouncer, notify::*, DebounceEventResult};
use tauri::{AppHandle, Manager};

#[tauri::command]
fn cwd() -> String {
    if let Ok(current_dir) = current_dir() {
        if let Some(current_dir_str) = current_dir.to_str() {
            return current_dir_str.to_string();
        }
    }

    if let Ok(pwd) = var("PWD") {
        return pwd;
    }

    String::from('.')
}
#[tauri::command]
fn getfile(name: &str) -> String {
    println!("getfile {}", name);
    match fs::read_to_string(name) {
        Ok(c) => {
            println!("file content {}", c);
            c.to_owned()},
        Err(e) => {
            println!("Error: {:?}", e);
            String::default()
        }
    }
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}
static HANDLE: Mutex<Option<AppHandle>> = Mutex::new(None);
fn main() {
    //    let mut handle: Option<AppHandle> = None;
    // notify::Watcher::new(event_handler, config)

    let mut debouncer =
        new_debouncer(
            Duration::from_secs(2),
            None,
            |res: DebounceEventResult| match res {
                Ok(events) => {
                    for event in events.iter() {
                       
                                if event.kind == notify_debouncer_mini::DebouncedEventKind::Any && event
                                    .path.extension() == Some(OsStr::new("csv"))
                                {
                                    println!("event: {:?}", event);
                                    let hh = HANDLE.lock().unwrap();
                                    if let Some(h) = &  *hh {
                                        h.emit_all("fs", &event.path).unwrap();
                                    }
                                }
                            
                    }
                }
                Err(e) => println!("watch error: {:?}", e),
            },
        ).unwrap();


    debouncer
        .watcher()
        .watch(Path::new(".."), RecursiveMode::NonRecursive)
        .unwrap();

    tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![getfile,greet,cwd])
        .setup(|app| {
            *HANDLE.lock().unwrap() = Some(app.handle().clone());
            println!("setup");

            // tauri::async_runtime::spawn(async move {

            // });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
