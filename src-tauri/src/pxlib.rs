use std::ffi::{CStr, CString};
use std::marker::PhantomData;
use std::os::raw::{c_char, c_int, c_long};
use std::path::Path;
use std::slice;

#[repr(C)]
pub struct pxdoc_t {
    _private: [u8; 0],
}

#[repr(C)]
pub struct pxfield_t {
    px_fname: *mut c_char,
    px_ftype: c_char,
    px_flen: c_int,
    px_fdc: c_int,
}

#[repr(C)]
#[derive(Copy, Clone)]
pub struct pxval_string_t {
    pub val: *mut c_char,
    pub len: c_int,
}

#[repr(C)]
#[derive(Copy, Clone)]
pub union pxval_value_t {
    pub lval: c_long,
    pub dval: f64,
    pub str: pxval_string_t,
}

#[repr(C)]
#[derive(Copy, Clone)]
pub struct pxval_t {
    pub isnull: c_char,
    pub r#type: c_int,
    pub value: pxval_value_t,
}

pub struct FieldValue<'a> {
    is_null: bool,
    lval: i64,
    dval: f64,
    bytes: Option<&'a [u8]>,
}

impl<'a> FieldValue<'a> {
    fn from_pxval(pxval: &'a pxval_t) -> Self {
        Self {
            is_null: pxval.isnull != 0,
            lval: unsafe { pxval.value.lval as i64 },
            dval: unsafe { pxval.value.dval },
            bytes: pxval.string_bytes(),
        }
    }

    pub fn is_null(&self) -> bool {
        self.is_null
    }

    pub fn lval(&self) -> i64 {
        self.lval
    }

    pub fn dval(&self) -> f64 {
        self.dval
    }

    pub fn bytes(&self) -> Option<&'a [u8]> {
        self.bytes
    }
}

impl pxval_t {
    fn string_bytes(&self) -> Option<&[u8]> {
        unsafe {
            let pxstr = self.value.str;
            if pxstr.val.is_null() || pxstr.len <= 0 {
                return None;
            }
            Some(slice::from_raw_parts(
                pxstr.val as *const u8,
                pxstr.len as usize,
            ))
        }
    }
}

extern "C" {
    pub fn pxlib_new_document() -> *mut pxdoc_t;
    pub fn pxlib_open_document(doc: *mut pxdoc_t, path: *const c_char) -> c_int;
    pub fn pxlib_close_document(doc: *mut pxdoc_t);
    pub fn pxlib_num_records(doc: *mut pxdoc_t) -> c_int;
    pub fn pxlib_field_count(doc: *mut pxdoc_t) -> c_int;
    pub fn pxlib_get_fields(doc: *mut pxdoc_t) -> *mut pxfield_t;
    pub fn pxlib_record_size(doc: *mut pxdoc_t) -> c_int;
    pub fn pxlib_file_version(doc: *mut pxdoc_t) -> c_int;
    pub fn pxlib_header_size(doc: *mut pxdoc_t) -> c_int;
    pub fn pxlib_code_page(doc: *mut pxdoc_t) -> c_int;
    pub fn pxlib_retrieve_record(doc: *mut pxdoc_t, recno: c_int) -> *mut *mut pxval_t;
    pub fn pxlib_release_record(doc: *mut pxdoc_t, record: *mut *mut pxval_t);
}

#[derive(Clone, Debug)]
pub struct FieldInfo {
    pub name: String,
    pub field_type: u8,
    pub size: usize,
}

pub struct Document {
    pxdoc: *mut pxdoc_t,
    fields: Vec<FieldInfo>,
    num_records: usize,
    record_size: usize,
    file_version: i32,
    header_size: i32,
    code_page: u8,
}

impl Document {
    pub fn open(path: &Path) -> Result<Self, String> {
        let pxdoc = unsafe { pxlib_new_document() };
        if pxdoc.is_null() {
            return Err("failed to allocate pxlib document".to_string());
        }

        let path_bytes = path.as_os_str().to_string_lossy().into_owned();
        let path_cstring = CString::new(path_bytes.as_bytes())
            .map_err(|_| "path contains nul byte".to_string())?;

        let open_result = unsafe { pxlib_open_document(pxdoc, path_cstring.as_ptr()) };
        if open_result != 0 {
            unsafe { pxlib_close_document(pxdoc) };
            return Err(format!(
                "pxlib failed to open {}: code {}",
                path.display(),
                open_result
            ));
        }

        let num_records = unsafe { pxlib_num_records(pxdoc) };
        let record_size = unsafe { pxlib_record_size(pxdoc) };
        let file_version = unsafe { pxlib_file_version(pxdoc) };
        let header_size = unsafe { pxlib_header_size(pxdoc) };
        let code_page = unsafe { pxlib_code_page(pxdoc) };
        let fields = gather_fields(pxdoc);

        Ok(Self {
            pxdoc,
            fields,
            num_records: num_records.max(0) as usize,
            record_size: record_size.max(0) as usize,
            file_version,
            header_size,
            code_page: (code_page.max(0) as u8),
        })
    }

    pub fn fields(&self) -> &[FieldInfo] {
        &self.fields
    }

    pub fn num_records(&self) -> usize {
        self.num_records
    }

    pub fn record_size(&self) -> usize {
        self.record_size
    }

    pub fn header_size(&self) -> i32 {
        self.header_size
    }

    pub fn file_version(&self) -> i32 {
        self.file_version
    }

    pub fn code_page(&self) -> u8 {
        self.code_page
    }

    pub fn read_record(&self, index: usize) -> Option<Record<'_>> {
        if index >= self.num_records {
            return None;
        }
        let raw = unsafe { pxlib_retrieve_record(self.pxdoc, index as c_int) };
        if raw.is_null() {
            return None;
        }
        Some(Record::new(raw, self.pxdoc, self.fields.len()))
    }
}

impl Drop for Document {
    fn drop(&mut self) {
        if !self.pxdoc.is_null() {
            unsafe { pxlib_close_document(self.pxdoc) };
            self.pxdoc = std::ptr::null_mut();
        }
    }
}

pub struct Record<'doc> {
    raw: *mut *mut pxval_t,
    pxdoc: *mut pxdoc_t,
    field_count: usize,
    _marker: PhantomData<&'doc ()>,
}

impl<'doc> Record<'doc> {
    fn new(raw: *mut *mut pxval_t, pxdoc: *mut pxdoc_t, field_count: usize) -> Self {
        Self {
            raw,
            pxdoc,
            field_count,
            _marker: PhantomData,
        }
    }

    pub fn pxval(&self, index: usize) -> Option<&pxval_t> {
        if index >= self.field_count || self.raw.is_null() {
            return None;
        }
        unsafe { (*self.raw.add(index)).as_ref() }
    }

    pub fn field_value(&self, index: usize) -> Option<FieldValue<'_>> {
        self.pxval(index).map(FieldValue::from_pxval)
    }
}

impl<'doc> Drop for Record<'doc> {
    fn drop(&mut self) {
        if !self.raw.is_null() {
            unsafe { pxlib_release_record(self.pxdoc, self.raw) };
            self.raw = std::ptr::null_mut();
        }
    }
}

fn gather_fields(pxdoc: *mut pxdoc_t) -> Vec<FieldInfo> {
    let mut info = Vec::new();
    let count = unsafe { pxlib_field_count(pxdoc) }.max(0) as usize;
    let fields = unsafe { pxlib_get_fields(pxdoc) };
    if fields.is_null() {
        return info;
    }

    for idx in 0..count {
        let field_ptr = unsafe { fields.add(idx) };
        let field = unsafe { &*field_ptr };
        let name = if field.px_fname.is_null() {
            format!("Field_{}", idx + 1)
        } else {
            unsafe { CStr::from_ptr(field.px_fname) }
                .to_string_lossy()
                .trim()
                .to_string()
        };
        info.push(FieldInfo {
            name,
            field_type: field.px_ftype as u8,
            size: field.px_flen as usize,
        });
    }

    info
}

pub fn field_type_name(field_type: u8) -> &'static str {
    match field_type {
        0x01 => "Alpha",
        0x02 => "Date",
        0x03 => "Short",
        0x04 => "Long",
        0x05 => "Currency",
        0x06 => "Number",
        0x09 => "Logical",
        0x0C => "Memo",
        0x0D => "BCD",
        0x0E => "Bytes",
        0x10 => "Graphic",
        0x14 => "Time",
        0x15 => "Timestamp",
        0x16 => "AutoIncrement",
        0x17 => "BCD",
        0x18 => "Bytes",
        _ => "Unknown",
    }
}
