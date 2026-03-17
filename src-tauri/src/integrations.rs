use std::thread;
use std::time::Duration;

use reqwest::blocking::Client;
use serde_json::json;
use tauri::Emitter;

use crate::{db, global};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TriggerEventInput {
    pub event_type: String,
    pub payload: serde_json::Value,
}

pub fn trigger_event(input: TriggerEventInput) -> Result<i64, String> {
    let conn = db::get_connection()?;
    let flows = db::integrations::get_enabled_flows_by_event(&conn, &input.event_type)?;

    let mut executed_runs = 0i64;

    for flow in flows {
        let run_id = db::integrations::create_run(
            &conn,
            flow.id,
            &input.event_type,
            Some(input.payload.to_string()),
        )?;

        let result = execute_flow_commands(&conn, Some(run_id), &flow.commands, &input.payload);

        match result {
            Ok(()) => {
                db::integrations::finish_run(&conn, run_id, "success", None)?;
                executed_runs += 1;
            }
            Err(error) => {
                db::integrations::finish_run(&conn, run_id, "failed", Some(error))?;
                executed_runs += 1;
            }
        }
    }

    Ok(executed_runs)
}

fn execute_flow_commands(
    conn: &rusqlite::Connection,
    run_id: Option<i64>,
    commands: &[db::integrations::IntegrationCommand],
    event_payload: &serde_json::Value,
) -> Result<(), String> {
    for (index, command) in commands.iter().enumerate() {
        let step_index = index as i64;
        let step_result = if command.command == "procedure.call" {
            execute_procedure_command(conn, command, event_payload)
        } else {
            execute_single_command(command, event_payload)
        };

        match step_result {
            Ok(output) => {
                if let Some(run_id) = run_id {
                    db::integrations::add_run_step(
                        conn,
                        run_id,
                        step_index,
                        &command.command,
                        "success",
                        Some(output.to_string()),
                        None,
                    )?;
                }
            }
            Err(error) => {
                if let Some(run_id) = run_id {
                    db::integrations::add_run_step(
                        conn,
                        run_id,
                        step_index,
                        &command.command,
                        "failed",
                        None,
                        Some(error.clone()),
                    )?;
                }
                return Err(error);
            }
        }
    }

    Ok(())
}

fn execute_single_command(
    command: &db::integrations::IntegrationCommand,
    event_payload: &serde_json::Value,
) -> Result<serde_json::Value, String> {
    match command.command.as_str() {
        "http.request" => execute_http_request(command, event_payload),
        "delay" => {
            let delay_ms = command
                .config
                .get("ms")
                .and_then(|v| v.as_u64())
                .unwrap_or(250);
            thread::sleep(Duration::from_millis(delay_ms.min(30_000)));
            Ok(json!({ "ok": true, "delay_ms": delay_ms }))
        }
        "notify.ui" => {
            let title = command
                .config
                .get("title")
                .and_then(|v| v.as_str())
                .unwrap_or("Integracion ejecutada")
                .to_string();
            let message = command
                .config
                .get("message")
                .and_then(|v| v.as_str())
                .unwrap_or("Integration executed")
                .to_string();

            let notification_type = command
                .config
                .get("type")
                .and_then(|v| v.as_str())
                .unwrap_or("info")
                .to_string();

            emit_integration_notification(&title, &message, &notification_type);

            Ok(json!({ "ok": true, "title": title, "message": message, "type": notification_type }))
        }
        "procedure.call" => Err("procedure.call must be handled by flow executor".to_string()),
        "transform.map" => {
            let output = json!({
                "event": event_payload,
                "mapped": command.config.get("map").cloned().unwrap_or_else(|| json!({}))
            });
            Ok(output)
        }
        other => Err(format!("Unknown integration command: {}", other)),
    }
}

fn emit_integration_notification(title: &str, message: &str, notification_type: &str) {
    let payload = json!({
        "title": title,
        "message": message,
        "type": notification_type,
        "priority": "normal",
        "sound": true
    });

    if let Ok(guard) = global::GLOBAL_APP_HANDLE.lock() {
        if let Some(app_handle) = guard.as_ref() {
            let _ = app_handle.emit("integration:notify", payload);
        }
    }
}

fn execute_procedure_command(
    conn: &rusqlite::Connection,
    command: &db::integrations::IntegrationCommand,
    event_payload: &serde_json::Value,
) -> Result<serde_json::Value, String> {
    let by_name = command
        .config
        .get("procedureName")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|v| !v.is_empty());

    let procedure = if let Some(name) = by_name {
        db::integrations::get_procedure_by_name(conn, name)?
            .ok_or_else(|| format!("Procedure '{}' not found", name))?
    } else {
        // Backward compatibility with older saved workflows using numeric IDs.
        let procedure_id = command
            .config
            .get("procedureId")
            .and_then(|v| v.as_i64())
            .ok_or_else(|| {
                "procedure.call requires config.procedureName (or legacy config.procedureId)"
                    .to_string()
            })?;

        db::integrations::get_procedure_by_id(conn, procedure_id)?
            .ok_or_else(|| format!("Procedure {} not found", procedure_id))?
    };

    for nested_command in &procedure.commands {
        if nested_command.command == "procedure.call" {
            return Err("Nested procedure.call is not supported in this MVP".to_string());
        }
        execute_single_command(nested_command, event_payload)?;
    }

    Ok(json!({
        "ok": true,
        "procedure_id": procedure.id,
        "procedure_name": procedure.name,
        "version": procedure.version
    }))
}

fn execute_http_request(
    command: &db::integrations::IntegrationCommand,
    event_payload: &serde_json::Value,
) -> Result<serde_json::Value, String> {
    let url = command
        .config
        .get("url")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "http.request requires config.url".to_string())?;

    let method = command
        .config
        .get("method")
        .and_then(|v| v.as_str())
        .unwrap_or("POST")
        .to_uppercase();

    let timeout_ms = command
        .config
        .get("timeoutMs")
        .and_then(|v| v.as_u64())
        .unwrap_or(15_000)
        .min(30_000);

    let headers = command
        .config
        .get("headers")
        .cloned()
        .unwrap_or_else(|| json!({}));

    let body = command
        .config
        .get("body")
        .cloned()
        .unwrap_or_else(|| json!({ "event": event_payload }));

    let client = Client::builder()
        .timeout(Duration::from_millis(timeout_ms))
        .build()
        .map_err(|e| format!("http.request client build err: {}", e))?;

    let mut request = match method.as_str() {
        "GET" => client.get(url),
        "PUT" => client.put(url),
        "PATCH" => client.patch(url),
        "DELETE" => client.delete(url),
        _ => client.post(url),
    };

    if let Some(headers_obj) = headers.as_object() {
        for (key, value) in headers_obj {
            if let Some(header_value) = value.as_str() {
                request = request.header(key, header_value);
            }
        }
    }

    if method != "GET" {
        request = request.json(&body);
    }

    let response = request
        .send()
        .map_err(|e| format!("http.request send err: {}", e))?;

    let status = response.status().as_u16();
    let text = response
        .text()
        .map_err(|e| format!("http.request read err: {}", e))?;

    Ok(json!({
        "status": status,
        "response": text
    }))
}
