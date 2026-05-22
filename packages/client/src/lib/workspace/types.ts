import type { Workspace } from "@behaviors-ui/spec";

export type { Workspace };

// Where the in-memory workspace came from (and where plain "Save" writes
// back to). `none` means the user hit New but hasn't saved yet.
export type WorkspaceSource =
    | { kind: "none" }
    | { kind: "browser"; slotId: string; slotName: string }
    | {
          kind: "device";
          // Present when the File System Access API is available; lets
          // plain Save write through without re-prompting.
          handle?: FileSystemFileHandle;
          filename: string;
      };

export interface BrowserSlot {
    id: string;
    name: string;
    savedAt: number;
}
