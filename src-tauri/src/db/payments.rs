use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};

use super::get_connection;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Payment {
    pub id: i64,
    pub treatment_id: i64,
    #[serde(rename = "legacy_id")]
    pub legacy_payment_id: Option<String>,
    pub amount: f64,
    pub payment_date: String,
    pub payment_method: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePaymentInput {
    pub treatment_id: i64,
    pub amount: f64,
    pub payment_date: Option<String>,
    pub payment_method: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdatePaymentInput {
    pub amount: Option<f64>,
    pub payment_date: Option<String>,
    pub payment_method: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatientBalance {
    pub patient_id: i64,
    pub patient_name: String,
    pub total_treatments_cost: f64,
    pub total_paid: f64,
    pub total_balance: f64,
    pub treatments_count: i64,
}

pub fn create_payment(input: CreatePaymentInput) -> Result<i64, String> {
    let conn = get_connection()?;
    let now = Utc::now().to_rfc3339();
    let payment_date = input.payment_date.unwrap_or_else(|| now.clone());

    // Iniciar transacción
    conn.execute("BEGIN TRANSACTION", [])
        .map_err(|e| format!("Error iniciando transacción: {}", e))?;

    // Insertar pago
    let result = conn.execute(
        "INSERT INTO payments (
            treatment_id, amount, payment_date, payment_method, notes,
            created_at, raw_data
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, '{}')",
        params![
            input.treatment_id,
            input.amount,
            payment_date,
            input.payment_method,
            input.notes,
            &now,
        ],
    );

    if let Err(e) = result {
        conn.execute("ROLLBACK", []).ok();
        return Err(format!("Error creando pago: {}", e));
    }

    let payment_id = conn.last_insert_rowid();

    // Recalcular balance del tratamiento usando la misma conexión
    let recalc_result = (|| -> Result<(), String> {
        // Obtener suma de pagos
        let paid: f64 = conn
            .query_row(
                "SELECT COALESCE(SUM(amount), 0.0) FROM payments WHERE treatment_id = ?1",
                params![input.treatment_id],
                |row| row.get(0),
            )
            .map_err(|e| format!("Error calculando pagos: {}", e))?;

        // Obtener costo total
        let total_cost: f64 = conn
            .query_row(
                "SELECT total_cost FROM treatments WHERE id = ?1",
                params![input.treatment_id],
                |row| row.get(0),
            )
            .map_err(|e| format!("Error obteniendo costo total: {}", e))?;

        let balance = total_cost - paid;

        // Actualizar tratamiento
        conn.execute(
            "UPDATE treatments SET paid_amount = ?1, balance = ?2, updated_at = ?3 WHERE id = ?4",
            params![paid, balance, &now, input.treatment_id],
        )
        .map_err(|e| format!("Error actualizando balance: {}", e))?;

        Ok(())
    })();

    if let Err(e) = recalc_result {
        conn.execute("ROLLBACK", []).ok();
        return Err(e);
    }

    conn.execute("COMMIT", [])
        .map_err(|e| format!("Error confirmando transacción: {}", e))?;

    Ok(payment_id)
}

pub fn get_payment_by_id(id: i64) -> Result<Option<Payment>, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare(
            "SELECT id, treatment_id, legacy_payment_id, amount, payment_date, payment_method, notes, created_at
             FROM payments WHERE id = ?1"
        )
        .map_err(|e| format!("Error preparando query: {}", e))?;

    let result = stmt.query_row(params![id], |row| {
        Ok(Payment {
            id: row.get(0)?,
            treatment_id: row.get(1)?,
            legacy_payment_id: row.get(2)?,
            amount: row.get(3)?,
            payment_date: row.get(4)?,
            payment_method: row.get(5)?,
            notes: row.get(6)?,
            created_at: row.get(7)?,
        })
    });

    match result {
        Ok(payment) => Ok(Some(payment)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Error obteniendo pago: {}", e)),
    }
}

pub fn get_payments_by_treatment(treatment_id: i64) -> Result<Vec<Payment>, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare(
            "SELECT id, treatment_id, legacy_payment_id, amount, payment_date, payment_method, notes, created_at
             FROM payments 
             WHERE treatment_id = ?1
             ORDER BY payment_date DESC"
        )
        .map_err(|e| format!("Error preparando query: {}", e))?;

    let payments = stmt
        .query_map(params![treatment_id], |row| {
            Ok(Payment {
                id: row.get(0)?,
                treatment_id: row.get(1)?,
                legacy_payment_id: row.get(2)?,
                amount: row.get(3)?,
                payment_date: row.get(4)?,
                payment_method: row.get(5)?,
                notes: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| format!("Error ejecutando query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error recolectando resultados: {}", e))?;

    Ok(payments)
}

pub fn get_payments_by_patient(patient_id: i64) -> Result<Vec<Payment>, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare(
            "SELECT p.id, p.treatment_id, p.legacy_payment_id, p.amount, p.payment_date, 
                    p.payment_method, p.notes, p.created_at
             FROM payments p
             JOIN treatments t ON p.treatment_id = t.id
             WHERE t.patient_id = ?1
             ORDER BY p.payment_date DESC",
        )
        .map_err(|e| format!("Error preparando query: {}", e))?;

    let payments = stmt
        .query_map(params![patient_id], |row| {
            Ok(Payment {
                id: row.get(0)?,
                treatment_id: row.get(1)?,
                legacy_payment_id: row.get(2)?,
                amount: row.get(3)?,
                payment_date: row.get(4)?,
                payment_method: row.get(5)?,
                notes: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| format!("Error ejecutando query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error recolectando resultados: {}", e))?;

    Ok(payments)
}

pub fn get_all_payments(limit: Option<i64>, offset: Option<i64>) -> Result<Vec<Payment>, String> {
    let conn = get_connection()?;
    let limit = limit.unwrap_or(100);
    let offset = offset.unwrap_or(0);

    let mut stmt = conn
        .prepare(
            "SELECT id, treatment_id, legacy_payment_id, amount, payment_date, payment_method, notes, created_at
             FROM payments 
             ORDER BY payment_date DESC
             LIMIT ?1 OFFSET ?2"
        )
        .map_err(|e| format!("Error preparando query: {}", e))?;

    let payments = stmt
        .query_map(params![limit, offset], |row| {
            Ok(Payment {
                id: row.get(0)?,
                treatment_id: row.get(1)?,
                legacy_payment_id: row.get(2)?,
                amount: row.get(3)?,
                payment_date: row.get(4)?,
                payment_method: row.get(5)?,
                notes: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| format!("Error ejecutando query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error recolectando resultados: {}", e))?;

    Ok(payments)
}

pub fn update_payment(id: i64, input: UpdatePaymentInput) -> Result<(), String> {
    let conn = get_connection()?;
    let now = Utc::now().to_rfc3339();

    let current = get_payment_by_id(id)?.ok_or_else(|| "Pago no encontrado".to_string())?;

    // Iniciar transacción
    conn.execute("BEGIN TRANSACTION", [])
        .map_err(|e| format!("Error iniciando transacción: {}", e))?;

    let result = conn.execute(
        "UPDATE payments SET 
            amount = ?1,
            payment_date = ?2,
            payment_method = ?3,
            notes = ?4
         WHERE id = ?5",
        params![
            input.amount.unwrap_or(current.amount),
            input.payment_date.unwrap_or(current.payment_date),
            input.payment_method.or(current.payment_method),
            input.notes.or(current.notes),
            id,
        ],
    );

    if let Err(e) = result {
        conn.execute("ROLLBACK", []).ok();
        return Err(format!("Error actualizando pago: {}", e));
    }

    // Recalcular balance del tratamiento usando la misma conexión
    let recalc_result = (|| -> Result<(), String> {
        let paid: f64 = conn
            .query_row(
                "SELECT COALESCE(SUM(amount), 0.0) FROM payments WHERE treatment_id = ?1",
                params![current.treatment_id],
                |row| row.get(0),
            )
            .map_err(|e| format!("Error calculando pagos: {}", e))?;

        let total_cost: f64 = conn
            .query_row(
                "SELECT total_cost FROM treatments WHERE id = ?1",
                params![current.treatment_id],
                |row| row.get(0),
            )
            .map_err(|e| format!("Error obteniendo costo total: {}", e))?;

        let balance = total_cost - paid;

        conn.execute(
            "UPDATE treatments SET paid_amount = ?1, balance = ?2, updated_at = ?3 WHERE id = ?4",
            params![paid, balance, &now, current.treatment_id],
        )
        .map_err(|e| format!("Error actualizando balance: {}", e))?;

        Ok(())
    })();

    if let Err(e) = recalc_result {
        conn.execute("ROLLBACK", []).ok();
        return Err(e);
    }

    conn.execute("COMMIT", [])
        .map_err(|e| format!("Error confirmando transacción: {}", e))?;

    Ok(())
}

pub fn delete_payment(id: i64) -> Result<(), String> {
    let conn = get_connection()?;
    let now = Utc::now().to_rfc3339();

    // Obtener treatment_id antes de eliminar
    let payment = get_payment_by_id(id)?.ok_or_else(|| "Pago no encontrado".to_string())?;

    // Iniciar transacción
    conn.execute("BEGIN TRANSACTION", [])
        .map_err(|e| format!("Error iniciando transacción: {}", e))?;

    let result = conn.execute("DELETE FROM payments WHERE id = ?1", params![id]);

    if let Err(e) = result {
        conn.execute("ROLLBACK", []).ok();
        return Err(format!("Error eliminando pago: {}", e));
    }

    // Recalcular balance del tratamiento usando la misma conexión
    let recalc_result = (|| -> Result<(), String> {
        let paid: f64 = conn
            .query_row(
                "SELECT COALESCE(SUM(amount), 0.0) FROM payments WHERE treatment_id = ?1",
                params![payment.treatment_id],
                |row| row.get(0),
            )
            .map_err(|e| format!("Error calculando pagos: {}", e))?;

        let total_cost: f64 = conn
            .query_row(
                "SELECT total_cost FROM treatments WHERE id = ?1",
                params![payment.treatment_id],
                |row| row.get(0),
            )
            .map_err(|e| format!("Error obteniendo costo total: {}", e))?;

        let balance = total_cost - paid;

        conn.execute(
            "UPDATE treatments SET paid_amount = ?1, balance = ?2, updated_at = ?3 WHERE id = ?4",
            params![paid, balance, &now, payment.treatment_id],
        )
        .map_err(|e| format!("Error actualizando balance: {}", e))?;

        Ok(())
    })();

    if let Err(e) = recalc_result {
        conn.execute("ROLLBACK", []).ok();
        return Err(e);
    }

    conn.execute("COMMIT", [])
        .map_err(|e| format!("Error confirmando transacción: {}", e))?;

    Ok(())
}

pub fn get_patient_balance(patient_id: i64) -> Result<PatientBalance, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare(
            "SELECT 
                p.id,
                p.first_name || ' ' || p.last_name as patient_name,
                COALESCE(SUM(t.total_cost), 0) as total_cost,
                COALESCE(SUM(t.paid_amount), 0) as total_paid,
                COALESCE(SUM(t.balance), 0) as total_balance,
                COUNT(t.id) as treatments_count
             FROM patients p
             LEFT JOIN treatments t ON p.id = t.patient_id
             WHERE p.id = ?1
             GROUP BY p.id",
        )
        .map_err(|e| format!("Error preparando query: {}", e))?;

    let balance = stmt
        .query_row(params![patient_id], |row| {
            Ok(PatientBalance {
                patient_id: row.get(0)?,
                patient_name: row.get(1)?,
                total_treatments_cost: row.get(2)?,
                total_paid: row.get(3)?,
                total_balance: row.get(4)?,
                treatments_count: row.get(5)?,
            })
        })
        .map_err(|e| format!("Error obteniendo balance: {}", e))?;

    Ok(balance)
}

pub fn get_patients_with_debt() -> Result<Vec<PatientBalance>, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare(
            "SELECT 
                p.id,
                p.first_name || ' ' || p.last_name as patient_name,
                COALESCE(SUM(t.total_cost), 0) as total_cost,
                COALESCE(SUM(t.paid_amount), 0) as total_paid,
                COALESCE(SUM(t.balance), 0) as total_balance,
                COUNT(t.id) as treatments_count
             FROM patients p
             JOIN treatments t ON p.id = t.patient_id
             GROUP BY p.id
             HAVING SUM(t.balance) > 0
             ORDER BY total_balance DESC",
        )
        .map_err(|e| format!("Error preparando query: {}", e))?;

    let balances = stmt
        .query_map([], |row| {
            Ok(PatientBalance {
                patient_id: row.get(0)?,
                patient_name: row.get(1)?,
                total_treatments_cost: row.get(2)?,
                total_paid: row.get(3)?,
                total_balance: row.get(4)?,
                treatments_count: row.get(5)?,
            })
        })
        .map_err(|e| format!("Error ejecutando query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error recolectando resultados: {}", e))?;

    Ok(balances)
}

pub fn get_total_debt() -> Result<f64, String> {
    let conn = get_connection()?;

    let total: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(balance), 0.0) FROM treatments WHERE balance > 0",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("Error calculando deuda total: {}", e))?;

    Ok(total)
}

pub fn get_recent_payments(limit: Option<i64>) -> Result<Vec<Payment>, String> {
    let conn = get_connection()?;
    let limit = limit.unwrap_or(10);

    let mut stmt = conn
        .prepare(
            "SELECT id, treatment_id, legacy_payment_id, amount, payment_date, payment_method, notes, created_at
             FROM payments 
             ORDER BY payment_date DESC, created_at DESC
             LIMIT ?1"
        )
        .map_err(|e| format!("Error preparando query: {}", e))?;

    let payments = stmt
        .query_map(params![limit], |row| {
            Ok(Payment {
                id: row.get(0)?,
                treatment_id: row.get(1)?,
                legacy_payment_id: row.get(2)?,
                amount: row.get(3)?,
                payment_date: row.get(4)?,
                payment_method: row.get(5)?,
                notes: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| format!("Error ejecutando query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error recolectando resultados: {}", e))?;

    Ok(payments)
}
