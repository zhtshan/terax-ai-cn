fn main() {
    ensure_check_sidecar();
    tauri_build::build();
    remove_empty_sidecar_stub();
}

fn ensure_check_sidecar() {
    if std::env::var("PROFILE").as_deref() == Ok("release") {
        return;
    }
    let Ok(target) = std::env::var("TARGET") else {
        return;
    };
    let extension = if target.contains("windows") {
        ".exe"
    } else {
        ""
    };
    let path = std::path::PathBuf::from("binaries").join(format!("terax-cli-{target}{extension}"));
    if path.exists() {
        return;
    }
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).expect("create sidecar check directory");
    }
    std::fs::write(&path, []).expect("create sidecar check placeholder");
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o755))
            .expect("mark sidecar check placeholder executable");
    }
}

// tauri_build copies the externalBin sidecar into the profile dir. When that
// sidecar is the empty dev placeholder written by ensure_check_sidecar, the copy
// lands on the same path as the real terax-cli binary and breaks cargo-llvm-cov
// ("not a valid object file"). Drop the zero-byte stub so the real binary (or
// nothing) remains.
fn remove_empty_sidecar_stub() {
    let Ok(target) = std::env::var("TARGET") else {
        return;
    };
    let extension = if target.contains("windows") {
        ".exe"
    } else {
        ""
    };
    let Ok(out_dir) = std::env::var("OUT_DIR") else {
        return;
    };
    // OUT_DIR is <profile-dir>/build/<pkg>-<hash>/out
    let Some(profile_dir) = std::path::Path::new(&out_dir)
        .parent()
        .and_then(|p| p.parent())
        .and_then(|p| p.parent())
    else {
        return;
    };
    let stub = profile_dir.join(format!("terax-cli{extension}"));
    if let Ok(meta) = std::fs::metadata(&stub) {
        if meta.is_file() && meta.len() == 0 {
            let _ = std::fs::remove_file(&stub);
        }
    }
}
