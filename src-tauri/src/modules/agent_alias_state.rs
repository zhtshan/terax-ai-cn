use std::sync::RwLock;
use tauri::{App, Manager, Runtime, State};

use super::pty::AliasMap;

pub struct AliasState(pub RwLock<AliasMap>);

impl Default for AliasState {
    fn default() -> Self {
        Self(RwLock::new(AliasMap::default()))
    }
}

#[derive(serde::Deserialize)]
pub struct AliasEntry {
    pub command: String,
    pub agent: String,
}

pub fn install<R: Runtime>(app: &App<R>) {
    app.manage(AliasState::default());
}

#[tauri::command]
pub fn update_agent_aliases(
    state: State<'_, AliasState>,
    payload: Vec<AliasEntry>,
) -> Result<(), String> {
    let mut map = state.0.write().map_err(|e| e.to_string())?;
    map.0 = payload.into_iter().map(|e| (e.command, e.agent)).collect();
    Ok(())
}

pub fn current(state: &State<'_, AliasState>) -> AliasMap {
    state.0.read().map(|m| m.clone()).unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn state_with(map: AliasMap) -> AliasState {
        AliasState(RwLock::new(map))
    }

    // Manages a stand-in State<'_, AliasState> by going through Manager API is
    // not viable in unit tests (State requires a real App). Cover the data
    // layer directly.

    #[test]
    fn default_alias_state_has_empty_map() {
        let s = AliasState::default();
        assert!(s.0.read().unwrap().0.is_empty());
    }

    #[test]
    fn install_registers_state_on_app() {
        // install requires a real Tauri App; covered by integration tests.
        // Here we only assert the type is constructible and Default matches an
        // empty inner map.
        let s = AliasState::default();
        assert!(s.0.read().unwrap().0.is_empty());
    }

    #[test]
    fn alias_entry_deserializes_minimal_shape() {
        // Round-trip through serde_json to lock the wire shape.
        let json = r#"[{"command":"ca","agent":"claude"}]"#;
        let v: Vec<AliasEntry> = serde_json::from_str(json).unwrap();
        assert_eq!(v.len(), 1);
        assert_eq!(v[0].command, "ca");
        assert_eq!(v[0].agent, "claude");
    }

    #[test]
    fn alias_entry_rejects_non_string_fields() {
        let json = r#"[{"command":42,"agent":"claude"}]"#;
        let res: Result<Vec<AliasEntry>, _> = serde_json::from_str(json);
        assert!(res.is_err());
    }

    #[test]
    fn write_replaces_entire_map() {
        // Mirrors the body of update_agent_aliases against a bare AliasState,
        // bypassing the State wrapper.
        let s = state_with(AliasMap(vec![("old".into(), "claude".into())]));
        let payload = vec![
            AliasEntry { command: "ca".into(), agent: "claude".into() },
            AliasEntry { command: "cca".into(), agent: "claude".into() },
        ];
        {
            let mut map = s.0.write().unwrap();
            map.0 = payload.into_iter().map(|e| (e.command, e.agent)).collect();
        }
        let got = s.0.read().unwrap();
        assert_eq!(got.0.len(), 2);
        assert!(got.0.iter().any(|(c, a)| c == "ca" && a == "claude"));
    }

    #[test]
    fn current_clone_is_independent() {
        // Mirrors the body of current: cloning the AliasMap gives an
        // independent Vec; mutating the clone does not touch the source.
        let src = state_with(AliasMap(vec![("ca".into(), "claude".into())]));
        let clone = src.0.read().unwrap().clone();
        assert_eq!(clone.0.len(), 1);
        let mut mut_clone = clone;
        mut_clone.0.push(("zzz".into(), "codex".into()));
        // src unchanged
        assert_eq!(src.0.read().unwrap().0.len(), 1);
        assert_eq!(mut_clone.0.len(), 2);
    }
}