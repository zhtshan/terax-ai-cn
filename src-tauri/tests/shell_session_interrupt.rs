#![cfg(unix)]

use std::sync::Arc;
use std::time::Duration;

use terax_lib::modules::shell::session::ShellSession;
use terax_lib::modules::workspace::WorkspaceEnv;

#[test]
fn interrupt_kills_active_child_and_flags_output() {
    let session = Arc::new(ShellSession::new("/tmp".into(), WorkspaceEnv::Local));
    let runner = Arc::clone(&session);
    let handle = std::thread::spawn(move || {
        runner.run("sleep 30".into(), None, None, Duration::from_secs(60))
    });

    // 等 child 注册进 active 表（最长 5s，20ms 步进）
    let mut killed = false;
    for _ in 0..250 {
        if session.interrupt() {
            killed = true;
            break;
        }
        std::thread::sleep(Duration::from_millis(20));
    }
    assert!(killed, "interrupt never saw an active child");

    let out = handle.join().unwrap().expect("run");
    assert!(out.interrupted);
    assert!(!out.timed_out);
}

#[test]
fn interrupt_without_active_child_returns_false() {
    let session = ShellSession::new("/tmp".into(), WorkspaceEnv::Local);
    assert!(!session.interrupt());
}
