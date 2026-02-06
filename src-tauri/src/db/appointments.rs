use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Appointment {
    pub id: Option<i64>,
    pub patient_id: i64,
    pub title: String,
    pub description: Option<String>,
    pub start_time: String, // ISO 8601 format
    pub end_time: String,   // ISO 8601 format
    pub status: String,     // scheduled, confirmed, completed, cancelled, no_show
    pub appointment_type: Option<String>,
    pub location: Option<String>,
    pub reminder_minutes: Option<i32>,
    pub color: Option<String>,
    pub created_by: Option<i64>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppointmentWithPatient {
    #[serde(flatten)]
    pub appointment: Appointment,
    pub patient_name: String,
    pub patient_phone: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppointmentReminder {
    pub id: Option<i64>,
    pub appointment_id: i64,
    pub scheduled_time: String,
    pub sent: bool,
    pub sent_at: Option<String>,
    pub notification_id: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AppointmentFilter {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub patient_id: Option<i64>,
    pub status: Option<String>,
}

pub fn create_appointment(conn: &Connection, appointment: &Appointment) -> Result<i64, String> {
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        r#"
        INSERT INTO appointments (
            patient_id, title, description, start_time, end_time, 
            status, appointment_type, location, reminder_minutes, 
            color, created_by, created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
        "#,
        params![
            appointment.patient_id,
            appointment.title,
            appointment.description,
            appointment.start_time,
            appointment.end_time,
            appointment.status,
            appointment.appointment_type,
            appointment.location,
            appointment.reminder_minutes,
            appointment.color,
            appointment.created_by,
            now,
            now
        ],
    )
    .map_err(|e| format!("Error al crear cita: {}", e))?;

    let appointment_id = conn.last_insert_rowid();

    // Crear recordatorio automático si se especificó
    if let Some(reminder_mins) = appointment.reminder_minutes {
        if reminder_mins > 0 {
            create_reminder_for_appointment(
                conn,
                appointment_id,
                &appointment.start_time,
                reminder_mins,
            )?;
        }
    }

    Ok(appointment_id)
}

pub fn update_appointment(conn: &Connection, appointment: &Appointment) -> Result<(), String> {
    let now = chrono::Utc::now().to_rfc3339();

    let id = appointment
        .id
        .ok_or_else(|| "ID de cita requerido para actualizar".to_string())?;

    conn.execute(
        r#"
        UPDATE appointments SET 
            patient_id = ?1,
            title = ?2,
            description = ?3,
            start_time = ?4,
            end_time = ?5,
            status = ?6,
            appointment_type = ?7,
            location = ?8,
            reminder_minutes = ?9,
            color = ?10,
            updated_at = ?11
        WHERE id = ?12
        "#,
        params![
            appointment.patient_id,
            appointment.title,
            appointment.description,
            appointment.start_time,
            appointment.end_time,
            appointment.status,
            appointment.appointment_type,
            appointment.location,
            appointment.reminder_minutes,
            appointment.color,
            now,
            id
        ],
    )
    .map_err(|e| format!("Error al actualizar cita: {}", e))?;

    // Actualizar recordatorios si cambió el reminder_minutes o start_time
    delete_reminders_for_appointment(conn, id)?;
    if let Some(reminder_mins) = appointment.reminder_minutes {
        if reminder_mins > 0 {
            create_reminder_for_appointment(conn, id, &appointment.start_time, reminder_mins)?;
        }
    }

    Ok(())
}

pub fn delete_appointment(conn: &Connection, id: i64) -> Result<(), String> {
    conn.execute("DELETE FROM appointments WHERE id = ?1", params![id])
        .map_err(|e| format!("Error al eliminar cita: {}", e))?;
    Ok(())
}

pub fn get_appointment(conn: &Connection, id: i64) -> Result<Appointment, String> {
    let mut stmt = conn
        .prepare(
            r#"
        SELECT id, patient_id, title, description, start_time, end_time,
               status, appointment_type, location, reminder_minutes, color,
               created_by, created_at, updated_at
        FROM appointments WHERE id = ?1
        "#,
        )
        .map_err(|e| format!("Error al preparar query: {}", e))?;

    stmt.query_row(params![id], |row| {
        Ok(Appointment {
            id: Some(row.get(0)?),
            patient_id: row.get(1)?,
            title: row.get(2)?,
            description: row.get(3)?,
            start_time: row.get(4)?,
            end_time: row.get(5)?,
            status: row.get(6)?,
            appointment_type: row.get(7)?,
            location: row.get(8)?,
            reminder_minutes: row.get(9)?,
            color: row.get(10)?,
            created_by: row.get(11)?,
            created_at: Some(row.get(12)?),
            updated_at: Some(row.get(13)?),
        })
    })
    .map_err(|e| format!("Error al obtener cita: {}", e))
}

pub fn list_appointments(
    conn: &Connection,
    filter: &AppointmentFilter,
) -> Result<Vec<AppointmentWithPatient>, String> {
    let mut query = String::from(
        r#"
        SELECT 
            a.id, a.patient_id, a.title, a.description, a.start_time, a.end_time,
            a.status, a.appointment_type, a.location, a.reminder_minutes, a.color,
            a.created_by, a.created_at, a.updated_at,
            p.first_name || ' ' || p.last_name as patient_name,
            p.phone
        FROM appointments a
        INNER JOIN patients p ON a.patient_id = p.id
        WHERE 1=1
        "#,
    );

    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(ref start_date) = filter.start_date {
        query.push_str(" AND a.start_time >= ?");
        params.push(Box::new(start_date.clone()));
    }

    if let Some(ref end_date) = filter.end_date {
        query.push_str(" AND a.start_time <= ?");
        params.push(Box::new(end_date.clone()));
    }

    if let Some(patient_id) = filter.patient_id {
        query.push_str(" AND a.patient_id = ?");
        params.push(Box::new(patient_id));
    }

    if let Some(ref status) = filter.status {
        query.push_str(" AND a.status = ?");
        params.push(Box::new(status.clone()));
    }

    query.push_str(" ORDER BY a.start_time ASC");

    let mut stmt = conn
        .prepare(&query)
        .map_err(|e| format!("Error al preparar query: {}", e))?;

    let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();

    let appointments = stmt
        .query_map(&param_refs[..], |row| {
            Ok(AppointmentWithPatient {
                appointment: Appointment {
                    id: Some(row.get(0)?),
                    patient_id: row.get(1)?,
                    title: row.get(2)?,
                    description: row.get(3)?,
                    start_time: row.get(4)?,
                    end_time: row.get(5)?,
                    status: row.get(6)?,
                    appointment_type: row.get(7)?,
                    location: row.get(8)?,
                    reminder_minutes: row.get(9)?,
                    color: row.get(10)?,
                    created_by: row.get(11)?,
                    created_at: Some(row.get(12)?),
                    updated_at: Some(row.get(13)?),
                },
                patient_name: row.get(14)?,
                patient_phone: row.get(15)?,
            })
        })
        .map_err(|e| format!("Error al ejecutar query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error al procesar resultados: {}", e))?;

    Ok(appointments)
}

// Funciones de recordatorios

fn create_reminder_for_appointment(
    conn: &Connection,
    appointment_id: i64,
    start_time: &str,
    reminder_minutes: i32,
) -> Result<(), String> {
    // Calcular el momento del recordatorio
    let start = chrono::DateTime::parse_from_rfc3339(start_time)
        .map_err(|e| format!("Error al parsear fecha: {}", e))?;
    let reminder_time = start - chrono::Duration::minutes(reminder_minutes as i64);
    let scheduled_time = reminder_time.to_rfc3339();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        r#"
        INSERT INTO appointment_reminders (
            appointment_id, scheduled_time, sent, created_at
        ) VALUES (?1, ?2, 0, ?3)
        "#,
        params![appointment_id, scheduled_time, now],
    )
    .map_err(|e| format!("Error al crear recordatorio: {}", e))?;

    Ok(())
}

fn delete_reminders_for_appointment(conn: &Connection, appointment_id: i64) -> Result<(), String> {
    conn.execute(
        "DELETE FROM appointment_reminders WHERE appointment_id = ?1",
        params![appointment_id],
    )
    .map_err(|e| format!("Error al eliminar recordatorios: {}", e))?;
    Ok(())
}

pub fn get_pending_reminders(conn: &Connection) -> Result<Vec<AppointmentReminder>, String> {
    let now = chrono::Utc::now().to_rfc3339();

    let mut stmt = conn
        .prepare(
            r#"
        SELECT id, appointment_id, scheduled_time, sent, sent_at, notification_id, created_at
        FROM appointment_reminders
        WHERE sent = 0 AND scheduled_time <= ?1
        ORDER BY scheduled_time ASC
        "#,
        )
        .map_err(|e| format!("Error al preparar query: {}", e))?;

    let reminders = stmt
        .query_map(params![now], |row| {
            Ok(AppointmentReminder {
                id: Some(row.get(0)?),
                appointment_id: row.get(1)?,
                scheduled_time: row.get(2)?,
                sent: row.get(3)?,
                sent_at: row.get(4)?,
                notification_id: row.get(5)?,
                created_at: Some(row.get(6)?),
            })
        })
        .map_err(|e| format!("Error al ejecutar query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error al procesar resultados: {}", e))?;

    Ok(reminders)
}

pub fn mark_reminder_sent(
    conn: &Connection,
    reminder_id: i64,
    notification_id: &str,
) -> Result<(), String> {
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE appointment_reminders SET sent = 1, sent_at = ?1, notification_id = ?2 WHERE id = ?3",
        params![now, notification_id, reminder_id],
    )
    .map_err(|e| format!("Error al marcar recordatorio como enviado: {}", e))?;

    Ok(())
}

pub fn get_upcoming_appointments(
    conn: &Connection,
    hours: i32,
) -> Result<Vec<AppointmentWithPatient>, String> {
    let now = chrono::Utc::now();
    let end_time = now + chrono::Duration::hours(hours as i64);

    let filter = AppointmentFilter {
        start_date: Some(now.to_rfc3339()),
        end_date: Some(end_time.to_rfc3339()),
        patient_id: None,
        status: Some("scheduled".to_string()),
    };

    list_appointments(conn, &filter)
}
