import type { PrismaClient } from "@prisma/client";

export class AnalyticsService {
  constructor(private readonly db: PrismaClient) {}

  async turnaroundMetrics(tenantId: string) {
    const statusCounts = await this.db.authorizationCase.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: { id: true },
    });

    const priorityCounts = await this.db.authorizationCase.groupBy({
      by: ["priority"],
      where: { tenantId },
      _count: { id: true },
    });

    // Avg turnaround: time from createdAt to updatedAt for terminal cases
    const terminalCases = await this.db.authorizationCase.findMany({
      where: {
        tenantId,
        status: { in: ["approved", "denied", "closed"] },
      },
      select: { priority: true, createdAt: true, updatedAt: true },
    });

    const turnaroundByPriority: Record<string, { avgHours: number; count: number }> = {};
    for (const c of terminalCases) {
      const hours = (c.updatedAt.getTime() - c.createdAt.getTime()) / (1000 * 60 * 60);
      const key = c.priority;
      if (!turnaroundByPriority[key]) {
        turnaroundByPriority[key] = { avgHours: 0, count: 0 };
      }
      turnaroundByPriority[key].count++;
      turnaroundByPriority[key].avgHours += hours;
    }

    for (const key of Object.keys(turnaroundByPriority)) {
      const entry = turnaroundByPriority[key]!;
      entry.avgHours = entry.count > 0 ? Math.round((entry.avgHours / entry.count) * 10) / 10 : 0;
    }

    return {
      metric: "turnaround",
      data: {
        statusDistribution: statusCounts.map((s) => ({
          status: s.status,
          count: s._count.id,
        })),
        priorityDistribution: priorityCounts.map((p) => ({
          priority: p.priority,
          count: p._count.id,
        })),
        turnaroundByPriority,
      },
    };
  }

  async denialMetrics(tenantId: string) {
    const deniedCases = await this.db.authorizationCase.count({
      where: { tenantId, status: "denied" },
    });

    const totalCases = await this.db.authorizationCase.count({
      where: { tenantId },
    });

    const topDenialReasons = await this.db.payerResponse.groupBy({
      by: ["denialReason"],
      where: {
        tenantId,
        decision: "denied",
        denialReason: { not: null },
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    const denialsByMonth = await this.db.payerResponse.findMany({
      where: {
        tenantId,
        decision: "denied",
      },
      select: { receivedAt: true },
      orderBy: { receivedAt: "asc" },
    });

    const monthlyTrend: Record<string, number> = {};
    for (const r of denialsByMonth) {
      const key = `${r.receivedAt.getFullYear()}-${String(r.receivedAt.getMonth() + 1).padStart(2, "0")}`;
      monthlyTrend[key] = (monthlyTrend[key] ?? 0) + 1;
    }

    return {
      metric: "denials",
      data: {
        deniedCount: deniedCases,
        totalCases,
        denialRate: totalCases > 0 ? Math.round((deniedCases / totalCases) * 1000) / 10 : 0,
        topReasons: topDenialReasons.map((r) => ({
          reason: r.denialReason,
          count: r._count.id,
        })),
        monthlyTrend: Object.entries(monthlyTrend).map(([month, count]) => ({
          month,
          count,
        })),
      },
    };
  }

  async payerMetrics(tenantId: string) {
    const payerCounts = await this.db.authorizationCase.groupBy({
      by: ["payerName"],
      where: { tenantId },
      _count: { id: true },
    });

    const payerDecisions = await this.db.payerResponse.findMany({
      where: { tenantId },
      select: {
        decision: true,
        receivedAt: true,
        submission: {
          select: {
            submittedAt: true,
            case: { select: { payerName: true } },
          },
        },
      },
    });

    const payerStats: Record<
      string,
      { approved: number; denied: number; pending: number; totalLagMs: number; responseCount: number }
    > = {};

    for (const r of payerDecisions) {
      const payer = r.submission.case.payerName;
      if (!payerStats[payer]) {
        payerStats[payer] = { approved: 0, denied: 0, pending: 0, totalLagMs: 0, responseCount: 0 };
      }
      const stats = payerStats[payer];

      if (r.decision === "approved") stats.approved++;
      else if (r.decision === "denied") stats.denied++;
      else stats.pending++;

      const lagMs = r.receivedAt.getTime() - r.submission.submittedAt.getTime();
      stats.totalLagMs += lagMs;
      stats.responseCount++;
    }

    const payerSummaries = Object.entries(payerStats).map(([payer, stats]) => {
      const total = stats.approved + stats.denied + stats.pending;
      return {
        payer,
        totalCases: payerCounts.find((p) => p.payerName === payer)?._count.id ?? 0,
        approvalRate: total > 0 ? Math.round((stats.approved / total) * 1000) / 10 : 0,
        denialRate: total > 0 ? Math.round((stats.denied / total) * 1000) / 10 : 0,
        avgResponseHours:
          stats.responseCount > 0
            ? Math.round((stats.totalLagMs / stats.responseCount / (1000 * 60 * 60)) * 10) / 10
            : 0,
      };
    });

    return {
      metric: "payers",
      data: payerSummaries,
    };
  }

  async staffMetrics(tenantId: string) {
    const casesByStaff = await this.db.authorizationCase.groupBy({
      by: ["assignedTo"],
      where: {
        tenantId,
        assignedTo: { not: null },
      },
      _count: { id: true },
    });

    const auditCounts = await this.db.auditEvent.groupBy({
      by: ["actorId"],
      where: {
        tenantId,
        actorId: { not: null },
      },
      _count: { id: true },
    });

    const staffSummaries = casesByStaff.map((s) => ({
      staffId: s.assignedTo,
      activeCases: s._count.id,
      touchCount: auditCounts.find((a) => a.actorId === s.assignedTo)?._count.id ?? 0,
    }));

    return {
      metric: "staff",
      data: staffSummaries,
    };
  }

  async kpiSummary(tenantId: string) {
    const SLA_HOURS: Record<string, number> = { urgent: 24, expedited: 72, standard: 336 };

    const [counts, activeCases] = await Promise.all([
      this.db.authorizationCase.groupBy({
        by: ["status"],
        where: { tenantId },
        _count: { id: true },
      }),
      this.db.authorizationCase.findMany({
        where: {
          tenantId,
          status: { notIn: ["approved", "denied", "closed"] },
          dueAt: { not: null },
        },
        select: { priority: true, dueAt: true },
      }),
    ]);

    const total = counts.reduce((s, r) => s + r._count.id, 0);
    const approved = counts.find((r) => r.status === "approved")?._count.id ?? 0;
    const denied   = counts.find((r) => r.status === "denied")?._count.id   ?? 0;

    const nearingBreach = activeCases.filter((c) => {
      if (!c.dueAt) return false;
      const slaHours  = SLA_HOURS[c.priority] ?? 336;
      const hoursLeft = (c.dueAt.getTime() - Date.now()) / (1000 * 60 * 60);
      return hoursLeft > 0 && hoursLeft <= slaHours * 0.25;
    }).length;

    return { total, approved, denied, nearingBreach };
  }
}
