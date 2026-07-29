import { invoke } from "@tauri-apps/api/core";
import { currentWorkspaceEnv } from "@/modules/workspace";
import type { GrepResponse, ReplaceResponse, SearchInput, ReplaceInput } from "./types";

export async function searchContent(input: SearchInput): Promise<GrepResponse> {
  return invoke<GrepResponse>("fs_search_content", {
    ...input,
    workspace: currentWorkspaceEnv(),
  });
}

export async function replaceAll(input: ReplaceInput): Promise<ReplaceResponse> {
  return invoke<ReplaceResponse>("fs_replace_all", {
    ...input,
    workspace: currentWorkspaceEnv(),
  });
}