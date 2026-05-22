// Port: read-only access to execution documents.
//
// Split from the old `ExecutionRepository` so that at scale read and
// write paths can use different consistency models (replicas, caches,
// eventual-consistency stores). The CLI's scheme-routing reader picks
// an implementation by URI scheme (file://, http(s)://, s3://, …).

import type { ExecutionDocument } from "../types.ts";

export interface ExecutionReader {
	findByUri(uri: string): ExecutionDocument | null;
	list(): ExecutionDocument[];
}
