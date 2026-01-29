use serde_json::json;
use std::ffi::{CStr, CString};

#[cfg(has_pxlib)]
mod generated {
    include!(concat!(env!("OUT_DIR"), "/pxlib_bindings.rs"));
}

/// Lee datos de una tabla Paradox usando pxlib. Usa las bindings generadas.
pub fn read_table_data(path: &str, limit: usize) -> Result<serde_json::Value, String> {
    #[cfg(has_pxlib)]
    {
        use generated::*;
        use std::ptr;

        unsafe {
            PX_boot();

            let px = PX_new();
            if px.is_null() {
                return Err("PX_new() devolvió null".into());
            }

            let cpath = CString::new(path).map_err(|e| format!("invalid path: {}", e))?;
            let rc = PX_open_file(px, cpath.as_ptr());
            if rc != 0 {
                PX_delete(px);
                return Err(format!("PX_open_file failed: {}", rc));
            }

            let head = (*px).px_head;
            if head.is_null() {
                PX_close(px);
                PX_delete(px);
                return Err("px_head es null".into());
            }

            let num_fields = (*head).px_numfields as usize;
            let record_size = (*head).px_recordsize as usize;
            let header_size = (*head).px_headersize as usize;

            let mut fields = Vec::new();
            let fptr = PX_get_fields(px);
            if !fptr.is_null() {
                for i in 0..num_fields {
                    let f = fptr.add(i);
                    let name = if !(*f).px_fname.is_null() {
                        CStr::from_ptr((*f).px_fname).to_string_lossy().into_owned()
                    } else {
                        String::new()
                    };
                    let ftype = (*f).px_ftype as u8;
                    let flen = (*f).px_flen as usize;
                    fields.push(json!({"name": name, "type": ftype, "size": flen}));
                }
            }

            let mut rows = Vec::new();
            if record_size > 0 {
                for recno in 0..limit {
                    let mut buf = vec![0u8; record_size];
                    let res = PX_get_record(px, recno as i32, buf.as_mut_ptr() as *mut i8);
                    if res.is_null() {
                        break;
                    }

                    let mut pos = 0usize;
                    let mut row = serde_json::Map::new();
                    for f in &fields {
                        let name = f["name"].as_str().unwrap_or("").to_string();
                        let ftype = f["type"].as_u64().unwrap_or(0) as u8;
                        let size = f["size"].as_u64().unwrap_or(0) as usize;

                        let value = if pos + size > buf.len() {
                            String::new()
                        } else {
                            match ftype {
                                    0x01 => String::from_utf8_lossy(&buf[pos..pos + size]).trim_end_matches('\0').trim().to_string(),
                                    0x0C | 0x0D | 0x0E | 0x10 | 0x0F => {
                                        // Blob / Memo / Graphic / OLE types: use PX_get_data_blob
                                        let mut modv: i32 = 0;
                                        let mut blobsize: i32 = 0;
                                        let mut value_ptr: *mut i8 = std::ptr::null_mut();
                                        let call_rc = PX_get_data_blob(px, buf[pos..].as_ptr() as *const i8, size as i32, &mut modv as *mut i32, &mut blobsize as *mut i32, &mut value_ptr as *mut *mut i8);
                                        if call_rc == 0 || !value_ptr.is_null() {
                                            let bsz = blobsize.max(0) as usize;
                                            if !value_ptr.is_null() && bsz > 0 {
                                                let slice = std::slice::from_raw_parts(value_ptr as *const u8, bsz);
                                                let encoded = base64::encode(slice);
                                                // attempt to free the allocated blob pointer
                                                libc::free(value_ptr as *mut libc::c_void);
                                                encoded
                                            } else {
                                                String::new()
                                            }
                                        } else {
                                            String::new()
                                        }
                                    }
                                0x02 => {
                                    if pos + 4 <= buf.len() {
                                        let days = i32::from_le_bytes(buf[pos..pos + 4].try_into().unwrap());
                                        days.to_string()
                                    } else { "0".into() }
                                }
                                0x03 | 0x04 => {
                                    if pos + 4 <= buf.len() {
                                        let num = i32::from_le_bytes(buf[pos..pos + 4].try_into().unwrap());
                                        num.to_string()
                                    } else { "0".into() }
                                }
                                0x06 => {
                                    if pos + 8 <= buf.len() {
                                        let num = f64::from_le_bytes(buf[pos..pos + 8].try_into().unwrap());
                                        num.to_string()
                                    } else { "0.0".into() }
                                }
                                _ => String::from_utf8_lossy(&buf[pos..pos + size]).trim_end_matches('\0').to_string(),
                            }
                        };

                        row.insert(name, serde_json::Value::String(value));
                        pos += size;
                    }

                    rows.push(serde_json::Value::Object(row));
                }
            }

            PX_close(px);
            PX_delete(px);

            return Ok(json!({"fields": fields, "rows": rows, "record_size": record_size, "header_size": header_size}));
        }
    }

    #[cfg(not(has_pxlib))]
    {
        Err("pxlib bindings no generados. Establece PXLIB_HEADER o PXLIB_INCLUDE y reconstruye para generar bindings.".into())
    }
}

pub fn available() -> bool {
    cfg!(has_pxlib)
}
