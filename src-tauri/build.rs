use std::{env, fs, path::PathBuf};

fn main() {
    compile_pxlib();
    tauri_build::build();
}

fn compile_pxlib() {
    let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap());
    let repo_root = manifest_dir
        .parent()
        .expect("cargo manifest dir must have a parent")
        .to_path_buf();
    let pxlib_root = repo_root.join("src").join("3rdparty").join("pxlib");
    let include_dir = pxlib_root.join("include");
    let src_dir = pxlib_root.join("src");
    let target = env::var("TARGET").expect("TARGET not set");
    let pxlib_include = pxlib_root.join("include");

    let mut builder = cc::Build::new();
    builder
        .include(&pxlib_root)
        .include(&pxlib_include)
        .define("HAVE_CONFIG_H", "1")
        .define("PX_USE_RECODE", "0")
        .define("PX_USE_ICONV", "0");

    if target.contains("windows") {
        builder.define("WIN32", "1");
        builder.define("_WIN32", "1");
    }

    for entry in fs::read_dir(&src_dir).expect("failed to read pxlib src directory") {
        let path = entry.expect("invalid pxlib entry").path();
        if path.extension().and_then(|ext| ext.to_str()) == Some("c") {
            builder.file(&path);
            println!("cargo:rerun-if-changed={}", path.display());
        }
    }

    println!(
        "cargo:rerun-if-changed={}",
        include_dir.join("paradox.h").display()
    );
    println!(
        "cargo:rerun-if-changed={}",
        include_dir.join("paradox-gsf.h").display()
    );
    println!(
        "cargo:rerun-if-changed={}",
        include_dir.join("pxversion.h").display()
    );
    println!(
        "cargo:rerun-if-changed={}",
        pxlib_root.join("config.h").display()
    );
    builder.compile("pxlib");
}
