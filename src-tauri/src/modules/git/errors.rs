use std::fmt::{Display, Formatter};
use std::path::PathBuf;

#[derive(Debug)]
pub enum GitError {
    NotInstalled,
    TooOld {
        found: String,
        required: &'static str,
    },
    NotADirectory(String),
    PathOutsideWorkspace(PathBuf),
    InvalidPath(String),
    FileTooLarge {
        path: PathBuf,
        size: u64,
        max: u64,
    },
    SymlinkRejected(PathBuf),
    NoUpstream,
    AuthRequired(String),
    HostKeyUnverified,
    TimedOut(&'static str),
    EmptyCommitMessage,
    CommandFailed {
        context: &'static str,
        detail: String,
    },
    Spawn(String),
    Io(std::io::Error),
}

impl GitError {
    pub fn command(context: &'static str, detail: impl Into<String>) -> Self {
        GitError::CommandFailed {
            context,
            detail: detail.into(),
        }
    }
}

impl Display for GitError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            GitError::NotInstalled => write!(
                f,
                "terax:git_not_installed"
            ),
            GitError::TooOld { found, required } => write!(
                f,
                "terax:git_too_old found {found} required {required}",
            ),
            GitError::NotADirectory(p) => write!(f, "terax:git_not_a_directory {p}"),
            GitError::PathOutsideWorkspace(p) => write!(
                f,
                "terax:git_outside_workspace {}",
                p.display()
            ),
            GitError::InvalidPath(p) => write!(f, "terax:git_invalid_path {p}"),
            GitError::FileTooLarge { path, size, max } => write!(
                f,
                "terax:git_file_too_large {} ({size} bytes, max {max})",
                path.display()
            ),
            GitError::SymlinkRejected(p) => {
                write!(f, "terax:git_symlink_rejected {}", p.display())
            }
            GitError::NoUpstream => write!(
                f,
                "terax:git_no_upstream"
            ),
            GitError::AuthRequired(detail) => write!(
                f,
                "terax:git_auth_required {detail}"
            ),
            GitError::HostKeyUnverified => write!(
                f,
                "terax:git_host_key_unverified"
            ),
            GitError::TimedOut(op) => write!(f, "terax:git_timed_out {op}"),
            GitError::EmptyCommitMessage => write!(f, "terax:git_empty_commit_message"),
            GitError::CommandFailed { context, detail } => {
                if detail.is_empty() {
                    write!(f, "terax:git_command_failed {context}")
                } else {
                    write!(f, "terax:git_command_failed {context}: {detail}")
                }
            }
            GitError::Spawn(err) => write!(f, "terax:git_spawn {err}"),
            GitError::Io(err) => write!(f, "terax:git_io {err}"),
        }
    }
}

impl std::error::Error for GitError {}

impl From<std::io::Error> for GitError {
    fn from(value: std::io::Error) -> Self {
        GitError::Io(value)
    }
}

impl From<GitError> for String {
    fn from(value: GitError) -> Self {
        value.to_string()
    }
}

pub type Result<T> = std::result::Result<T, GitError>;
