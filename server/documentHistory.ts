import { createHash } from "node:crypto";

import { randomToken } from "./config";
import type { DbClient } from "./db";

export type DocumentVersionSource = "autosave" | "manual" | "restore";

interface LatestVersionRow {
  content_hash: string;
}

interface OwnedDocumentRow {
  id: string;
}

export interface DocumentVersionInput {
  content: string;
  documentId: string;
  force?: boolean;
  source?: DocumentVersionSource;
  title: string;
  userId: string;
}

export function createDocumentContentHash(title: string, content: string): string {
  return createHash("sha256")
    .update(title)
    .update("\0")
    .update(content)
    .digest("hex");
}

export async function createDocumentVersionIfChanged(
  db: DbClient,
  input: DocumentVersionInput
): Promise<string | null> {
  const ownedDocument = await db<OwnedDocumentRow>`
    SELECT id
    FROM documents
    WHERE user_id = ${input.userId} AND id = ${input.documentId} AND deleted_at IS NULL
  `;
  if (!ownedDocument.length) return null;

  const contentHash = createDocumentContentHash(input.title, input.content);

  if (!input.force) {
    const latest = await db<LatestVersionRow>`
      SELECT content_hash
      FROM document_versions
      WHERE user_id = ${input.userId} AND document_id = ${input.documentId}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    if (latest[0]?.content_hash === contentHash) return null;
  }

  const id = randomToken(18);
  await db`
    INSERT INTO document_versions (id, document_id, user_id, title, content, content_hash, source)
    VALUES (
      ${id},
      ${input.documentId},
      ${input.userId},
      ${input.title},
      ${input.content},
      ${contentHash},
      ${input.source || "autosave"}
    )
  `;
  return id;
}
