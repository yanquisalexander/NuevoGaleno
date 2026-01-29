fn main() {
    tauri_build::build();

    // Attempt to generate bindings for pxlib if header is provided.
    // Set PXLIB_HEADER to the full path to pxlib.h, or PXLIB_INCLUDE to the include dir.
    use std::env;
    use std::path::PathBuf;

    // Determine header path from env vars or fall back to the bundled pxlib headers in the workspace
    let header_path = if let Ok(h) = env::var("PXLIB_HEADER") {
        PathBuf::from(h)
    } else if let Ok(inc) = env::var("PXLIB_INCLUDE") {
        let mut p = PathBuf::from(inc);
        p.push("pxlib.h");
        p
    } else {
        // Assume repository layout: ../src/third_party/pxlib/include/paradox.h from this crate (src-tauri)
        let manifest_dir =
            PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap_or_else(|_| ".".into()));
        let candidate = manifest_dir.join("../src/third_party/pxlib/include/paradox.h");
        candidate
    };

    if header_path.exists() {
        // Try to locate libclang. If not found, fall back to a committed, pre-generated bindings file.
        fn find_libclang() -> Option<std::path::PathBuf> {
            use std::env;
            use std::path::PathBuf;

            if let Ok(p) = env::var("LIBCLANG_PATH") {
                let pb = PathBuf::from(p);
                if pb.is_file() {
                    return Some(pb);
                }
                let alt = pb.join("libclang.dll");
                if alt.exists() {
                    return Some(alt);
                }
            }

            if let Ok(path_var) = env::var("PATH") {
                for part in path_var.split(';') {
                    if part.is_empty() {
                        continue;
                    }
                    let p = PathBuf::from(part).join("libclang.dll");
                    if p.exists() {
                        return Some(p);
                    }
                    let p2 = PathBuf::from(part).join("clang.dll");
                    if p2.exists() {
                        return Some(p2);
                    }
                }
            }

            // Common LLVM install path on Windows
            let program_files = env::var("ProgramFiles").ok().map(PathBuf::from);
            if let Some(mut pf) = program_files {
                let cand = pf.join("LLVM").join("bin").join("libclang.dll");
                if cand.exists() {
                    return Some(cand);
                }
            }

            None
        }

        let out_path = PathBuf::from(env::var("OUT_DIR").expect("OUT_DIR not set"));

        if let Some(libclang_path) = find_libclang() {
            // Ensure bindgen can find libclang
            std::env::set_var(
                "LIBCLANG_PATH",
                libclang_path
                    .parent()
                    .unwrap_or_else(|| std::path::Path::new("."))
                    .to_string_lossy()
                    .into_owned(),
            );
            match bindgen::Builder::default()
                .header(header_path.to_string_lossy().into_owned())
                .generate()
            {
                Ok(bindings) => {
                    let dest = out_path.join("pxlib_bindings.rs");
                    bindings
                        .write_to_file(&dest)
                        .expect("Couldn't write pxlib bindings!");
                    // Expose cfg to enable using the generated bindings in Rust code
                    println!("cargo:rustc-cfg=has_pxlib");
                }
                Err(e) => {
                    eprintln!("bindgen failed: {}", e);
                }
            }
        } else {
            // Try to find a pre-generated bindings file in the repository (so developers don't need libclang)
            let manifest_dir =
                PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap_or_else(|_| ".".into()));
            let candidates = [
                manifest_dir.join("pxlib_bindings.rs"),
                manifest_dir.join("src").join("pxlib_bindings.rs"),
                manifest_dir.join("src-tauri").join("pxlib_bindings.rs"),
                manifest_dir.join("../src").join("pxlib_bindings.rs"),
                manifest_dir.join("../src-tauri").join("pxlib_bindings.rs"),
            ];

            let mut found: Option<PathBuf> = None;
            for c in &candidates {
                if c.exists() {
                    found = Some(c.to_path_buf());
                    break;
                }
            }

            if let Some(src) = found {
                let dest = out_path.join("pxlib_bindings.rs");
                std::fs::copy(&src, &dest).expect("failed to copy pre-generated pxlib bindings");
                println!(
                    "cargo:warning=Using pre-generated pxlib bindings from {}",
                    src.display()
                );
                println!("cargo:rustc-cfg=has_pxlib");
            } else {
                eprintln!("libclang not found and no pre-generated bindings available. Install LLVM/Clang or set LIBCLANG_PATH, or generate `pxlib_bindings.rs` and place it near src-tauri.");
            }
        }
    } else {
        eprintln!("pxlib header not found; set PXLIB_HEADER or PXLIB_INCLUDE to generate bindings");
    }
}
