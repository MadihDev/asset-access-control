export function parseCSVLine(line: string): string[] {
  // Basic CSV split (no quoted commas). Trim spaces around cells.
  // For production-grade CSV, consider a CSV parser; current UI uses simple comma-separated values.
  return line.split(",").map((s) => s.trim());
}

export function isValidISODate(s: string | undefined): boolean {
  if (!s) return false;
  const d = new Date(s);
  return !Number.isNaN(d.getTime());
}

export function toBoolOptional(s?: string): boolean | undefined {
  if (typeof s === "undefined" || s === "") return undefined;
  if (/^(true|1|yes)$/i.test(s)) return true;
  if (/^(false|0|no)$/i.test(s)) return false;
  return undefined;
}

export type Grant = { userId: string; lockId: string; validFrom?: string; validTo?: string };
export type Revoke = { userId: string; lockId: string };
export type KeyItem = { cardId: string; userId: string; name?: string; expiresAt?: string; isActive?: boolean };

export function validateGrants(text: string): string[] {
  const errors: string[] = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((ln, idx) => {
    const lineNo = idx + 1;
    const trimmed = ln.trim();
    if (!trimmed) return;
    const [userId, lockId, validFrom, validTo] = parseCSVLine(trimmed);
    if (!userId || !lockId) {
      errors.push(`Line ${lineNo}: requires userId,lockId`);
      return;
    }
    if (validFrom && !isValidISODate(validFrom)) errors.push(`Line ${lineNo}: invalid validFrom date`);
    if (validTo && !isValidISODate(validTo)) errors.push(`Line ${lineNo}: invalid validTo date`);
    if (validFrom && validTo && new Date(validFrom) > new Date(validTo)) errors.push(`Line ${lineNo}: validFrom is after validTo`);
  });
  return errors;
}

export function validateRevokes(text: string): string[] {
  const errors: string[] = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((ln, idx) => {
    const lineNo = idx + 1;
    const trimmed = ln.trim();
    if (!trimmed) return;
    const [userId, lockId] = parseCSVLine(trimmed);
    if (!userId || !lockId) errors.push(`Line ${lineNo}: requires userId,lockId`);
  });
  return errors;
}

export function validateKeys(text: string): string[] {
  const errors: string[] = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((ln, idx) => {
    const lineNo = idx + 1;
    const trimmed = ln.trim();
    if (!trimmed) return;
    const [cardId, userId, , expiresAt, isActive] = parseCSVLine(trimmed);
    if (!cardId || !userId) {
      errors.push(`Line ${lineNo}: requires cardId,userId`);
      return;
    }
    if (expiresAt && !isValidISODate(expiresAt)) errors.push(`Line ${lineNo}: invalid expiresAt date`);
    if (isActive && typeof toBoolOptional(isActive) === "undefined") errors.push(`Line ${lineNo}: isActive must be true/false/1/0/yes/no or omitted`);
  });
  return errors;
}

export function shapeGrants(text: string): Grant[] {
  const grants: Grant[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [userId, lockId, validFrom, validTo] = parseCSVLine(trimmed);
    if (!userId || !lockId) continue;
    const payload: Grant = { userId, lockId };
    if (validFrom) payload.validFrom = validFrom;
    if (validTo) payload.validTo = validTo;
    grants.push(payload);
  }
  return grants;
}

export function shapeRevokes(text: string): Revoke[] {
  const revokes: Revoke[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [userId, lockId] = parseCSVLine(trimmed);
    if (!userId || !lockId) continue;
    revokes.push({ userId, lockId });
  }
  return revokes;
}

export function shapeKeyItems(text: string): KeyItem[] {
  const items: KeyItem[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [cardId, userId, name, expiresAt, isActive] = parseCSVLine(trimmed);
    if (!cardId || !userId) continue;
    const payload: KeyItem = { cardId, userId };
    if (name) payload.name = name;
    if (expiresAt) payload.expiresAt = expiresAt;
    if (typeof isActive !== "undefined" && isActive !== "") payload.isActive = toBoolOptional(isActive);
    items.push(payload);
  }
  return items;
}
