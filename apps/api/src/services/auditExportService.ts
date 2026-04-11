import { type PrismaClient } from "@prisma/client";
import { Readable } from "node:stream";

export interface AuditQueryFilters {
  tenantId: string;
  entityType?: string;
  actorId?: string;
  startDate?: Date;
  endDate?: Date;
  cursor?: string;
  limit?: number;
}

interface AuditRow {
  id: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string | null;
  before: unknown;
  after: unknown;
  metadata: unknown;
  occurredAt: Date;
}

export class AuditExportService {
  constructor(private readonly db: PrismaClient) {}

  async query(filters: AuditQueryFilters) {
    const where = this.buildWhere(filters);
    const limit = Math.min(filters.limit ?? 50, 200);

    const events = await this.db.auditEvent.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      take: limit + 1,
      ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    });

    const hasMore = events.length > limit;
    const items = hasMore ? events.slice(0, limit) : events;
    const nextCursor = hasMore ? items[items.length - 1]!.id : undefined;

    return { items, nextCursor, hasMore };
  }

  streamCsv(filters: AuditQueryFilters): Readable {
    const db = this.db;
    const buildWhere = this.buildWhere.bind(this);
    const BATCH_SIZE = 500;

    let cursor: string | undefined;
    let done = false;
    let headerSent = false;

    return new Readable({
      async read() {
        if (done) {
          this.push(null);
          return;
        }

        try {
          if (!headerSent) {
            this.push("occurredAt,entityType,entityId,action,actorId,metadata\n");
            headerSent = true;
          }

          const where = buildWhere(filters);
          const rows: AuditRow[] = await db.auditEvent.findMany({
            where,
            orderBy: { occurredAt: "desc" },
            take: BATCH_SIZE + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          });

          const hasMore = rows.length > BATCH_SIZE;
          const batch = hasMore ? rows.slice(0, BATCH_SIZE) : rows;

          if (batch.length === 0) {
            done = true;
            this.push(null);
            return;
          }

          const csv = batch.map((r) => {
            const meta = r.metadata ? JSON.stringify(r.metadata).replace(/"/g, '""') : "";
            return [
              r.occurredAt.toISOString(),
              csvEscape(r.entityType),
              csvEscape(r.entityId),
              csvEscape(r.action),
              csvEscape(r.actorId ?? ""),
              `"${meta}"`,
            ].join(",");
          }).join("\n") + "\n";

          this.push(csv);

          if (hasMore) {
            cursor = batch[batch.length - 1]!.id;
          } else {
            done = true;
            this.push(null);
          }
        } catch (err) {
          this.destroy(err instanceof Error ? err : new Error(String(err)));
        }
      },
    });
  }

  streamNdjson(filters: AuditQueryFilters): Readable {
    const db = this.db;
    const buildWhere = this.buildWhere.bind(this);
    const BATCH_SIZE = 500;

    let cursor: string | undefined;
    let done = false;

    return new Readable({
      async read() {
        if (done) {
          this.push(null);
          return;
        }

        try {
          const where = buildWhere(filters);
          const rows: AuditRow[] = await db.auditEvent.findMany({
            where,
            orderBy: { occurredAt: "desc" },
            take: BATCH_SIZE + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          });

          const hasMore = rows.length > BATCH_SIZE;
          const batch = hasMore ? rows.slice(0, BATCH_SIZE) : rows;

          if (batch.length === 0) {
            done = true;
            this.push(null);
            return;
          }

          const ndjson = batch.map((r) => JSON.stringify(r)).join("\n") + "\n";
          this.push(ndjson);

          if (hasMore) {
            cursor = batch[batch.length - 1]!.id;
          } else {
            done = true;
            this.push(null);
          }
        } catch (err) {
          this.destroy(err instanceof Error ? err : new Error(String(err)));
        }
      },
    });
  }

  private buildWhere(filters: AuditQueryFilters) {
    const where: Record<string, unknown> = { tenantId: filters.tenantId };
    if (filters.entityType) where["entityType"] = filters.entityType;
    if (filters.actorId) where["actorId"] = filters.actorId;
    if (filters.startDate || filters.endDate) {
      const occurredAt: Record<string, Date> = {};
      if (filters.startDate) occurredAt["gte"] = filters.startDate;
      if (filters.endDate) occurredAt["lte"] = filters.endDate;
      where["occurredAt"] = occurredAt;
    }
    return where;
  }
}

function csvEscape(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
