/**
 * Seed script — inserts realistic sample authorization cases, patients,
 * coverage, orders, tasks, and audit events for local development and testing.
 *
 * Idempotent: looks up the tenant by slug before inserting.
 *
 * Usage:
 *   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/authos_health \
 *   npx tsx apps/api/src/scripts/seed-sample-data.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const tenant = await db.tenant.findUnique({ where: { slug: "dev" } });
  if (!tenant) {
    console.error('Tenant "dev" not found. Run bootstrap-tenant.ts first.');
    process.exit(1);
  }

  // Ensure TenantSettings row exists (required for SSO routes even in dev)
  const existingSettings = await db.tenantSettings.findUnique({ where: { tenantId: tenant.id } });
  if (!existingSettings) {
    await db.tenantSettings.create({
      data: {
        tenantId: tenant.id,
        // SSO is not configured by default — credentials login works without this
        ssoProvider: null,
        ssoIssuerUrl: null,
        ssoClientId: null,
        ssoClientSecret: null,
      },
    });
    console.log("  created TenantSettings row for dev tenant.");
  }

  const adminUser = await db.user.findFirst({ where: { tenantId: tenant.id, role: "admin" } });
  const userId = adminUser?.id ?? "system";
  const tid = tenant.id;

  console.log(`Seeding data for tenant: ${tenant.name} (${tid})`);

  // ── Patients ─────────────────────────────────────────────────────────────
  const patients = await Promise.all([
    upsertPatient(tid, "pt-fhir-001", "Jane Doe",      "1978-03-14", "female", "MRN-00101"),
    upsertPatient(tid, "pt-fhir-002", "Robert Chen",   "1965-07-22", "male",   "MRN-00102"),
    upsertPatient(tid, "pt-fhir-003", "Maria Lopez",   "1990-11-05", "female", "MRN-00103"),
    upsertPatient(tid, "pt-fhir-004", "David Park",    "1955-01-30", "male",   "MRN-00104"),
    upsertPatient(tid, "pt-fhir-005", "Susan White",   "1982-08-19", "female", "MRN-00105"),
    upsertPatient(tid, "pt-fhir-006", "Tom Harris",    "1970-04-11", "male",   "MRN-00106"),
    upsertPatient(tid, "pt-fhir-007", "Linda Nguyen",  "1998-12-03", "female", "MRN-00107"),
    upsertPatient(tid, "pt-fhir-008", "Emily Carter",  "1988-06-25", "female", "MRN-00108"),
    upsertPatient(tid, "pt-fhir-009", "James Okafor",  "1972-09-17", "male",   "MRN-00109"),
    upsertPatient(tid, "pt-fhir-010", "Sandra Mills",  "1960-02-08", "female", "MRN-00110"),
  ]);

  // ── Coverage ──────────────────────────────────────────────────────────────
  const coverage = await Promise.all([
    upsertCoverage(tid, "cov-fhir-001", patients[0].id, "Aetna",       "AETNA-001",  "PPO Gold",    "AET-MEM-001", "GRP-A001"),
    upsertCoverage(tid, "cov-fhir-002", patients[1].id, "UnitedHealth", "UHC-001",    "Choice Plus", "UHC-MEM-002", "GRP-U002"),
    upsertCoverage(tid, "cov-fhir-003", patients[2].id, "Cigna",        "CIGNA-001",  "HMO Select",  "CIG-MEM-003", "GRP-C003"),
    upsertCoverage(tid, "cov-fhir-004", patients[3].id, "BlueCross",    "BCBS-001",   "BluePreferred","BCB-MEM-004","GRP-B004"),
    upsertCoverage(tid, "cov-fhir-005", patients[4].id, "Humana",       "HUM-001",    "Gold Plus",   "HUM-MEM-005", "GRP-H005"),
    upsertCoverage(tid, "cov-fhir-006", patients[5].id, "Aetna",        "AETNA-002",  "PPO Silver",  "AET-MEM-006", "GRP-A002"),
    upsertCoverage(tid, "cov-fhir-007", patients[6].id, "Cigna",        "CIGNA-002",  "Open Access",  "CIG-MEM-007", "GRP-C004"),
    upsertCoverage(tid, "cov-fhir-008", patients[7].id, "UnitedHealth", "UHC-002",    "Navigate HMO",  "UHC-MEM-008", "GRP-U003"),
    upsertCoverage(tid, "cov-fhir-009", patients[8].id, "BlueCross",   "BCBS-002",   "BlueChoice PPO","BCB-MEM-009", "GRP-B005"),
    upsertCoverage(tid, "cov-fhir-010", patients[9].id, "Humana",      "HUM-002",    "Gold Plus HMO", "HUM-MEM-010", "GRP-H006"),
  ]);

  // ── Orders ────────────────────────────────────────────────────────────────
  const orders = await Promise.all([
    upsertOrder(tid, "ord-fhir-001", patients[0].id, "MRI",             "70553",  userId),
    upsertOrder(tid, "ord-fhir-002", patients[1].id, "Physical Therapy","97110",  userId),
    upsertOrder(tid, "ord-fhir-003", patients[2].id, "Spinal Surgery",  "22612",  userId),
    upsertOrder(tid, "ord-fhir-004", patients[3].id, "Knee Arthroscopy","29881",  userId),
    upsertOrder(tid, "ord-fhir-005", patients[4].id, "Chemotherapy",    "96413",  userId),
    upsertOrder(tid, "ord-fhir-006", patients[5].id, "Hip Replacement", "27130",  userId),
    upsertOrder(tid, "ord-fhir-007", patients[6].id, "Cardiac Cath",    "93510",  userId),
    upsertOrder(tid, "ord-fhir-008", patients[7].id, "Sleep Study",        "95810",  userId),
    upsertOrder(tid, "ord-fhir-009", patients[8].id, "Lumbar MRI",         "72148",  userId),
    upsertOrder(tid, "ord-fhir-010", patients[9].id, "Coronary Angiogram", "93454",  userId),
  ]);

  // ── Cases ─────────────────────────────────────────────────────────────────
  const caseData = [
    { patient: patients[0], cov: coverage[0], order: orders[0], service: "MRI Brain w/ Contrast",       code: "70553",  payer: "Aetna",       priority: "expedited" as const, status: "docs_missing"       as const, assignedTo: userId },
    { patient: patients[1], cov: coverage[1], order: orders[1], service: "Physical Therapy (12 visits)", code: "97110",  payer: "UnitedHealth", priority: "standard"  as const, status: "pending_payer"      as const, assignedTo: userId },
    { patient: patients[2], cov: coverage[2], order: orders[2], service: "Spinal Fusion L4-L5",         code: "22612",  payer: "Cigna",        priority: "urgent"    as const, status: "peer_review_needed" as const, assignedTo: null   },
    { patient: patients[3], cov: coverage[3], order: orders[3], service: "Knee Arthroscopy",            code: "29881",  payer: "BlueCross",    priority: "standard"  as const, status: "approved"           as const, assignedTo: userId },
    { patient: patients[4], cov: coverage[4], order: orders[4], service: "Chemotherapy Cycle 3",        code: "96413",  payer: "Humana",       priority: "expedited" as const, status: "denied"             as const, assignedTo: userId },
    { patient: patients[5], cov: coverage[5], order: orders[5], service: "Total Hip Replacement",       code: "27130",  payer: "Aetna",        priority: "standard"  as const, status: "submitted"          as const, assignedTo: userId },
    { patient: patients[6], cov: coverage[6], order: orders[6], service: "Cardiac Catheterization",     code: "93510",  payer: "Cigna",        priority: "urgent"    as const, status: "new"                as const, assignedTo: null   },
    { patient: patients[7], cov: coverage[7], order: orders[7], service: "Polysomnography Sleep Study",  code: "95810",  payer: "UnitedHealth", priority: "standard"  as const, status: "more_info_requested" as const, assignedTo: userId  },
    { patient: patients[8], cov: coverage[8], order: orders[8], service: "Lumbar Spine MRI w/o Contrast",code: "72148",  payer: "BlueCross",    priority: "expedited" as const, status: "ready_to_submit"    as const, assignedTo: userId  },
    { patient: patients[9], cov: coverage[9], order: orders[9], service: "Coronary Angiography",         code: "93454",  payer: "Humana",       priority: "urgent"    as const, status: "appealed"           as const, assignedTo: userId  },
  ];

  const cases = [];
  for (const c of caseData) {
    const existing = await db.authorizationCase.findFirst({
      where: { tenantId: tid, patientRefId: c.patient.id, orderRefId: c.order.id },
    });
    if (existing) {
      console.log(`  case exists: ${existing.id} (${c.service})`);
      cases.push(existing);
      continue;
    }

    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + (c.priority === "urgent" ? 1 : c.priority === "expedited" ? 3 : 14));

    const authCase = await db.authorizationCase.create({
      data: {
        tenantId:     tid,
        patientRefId: c.patient.id,
        coverageRefId: c.cov.id,
        orderRefId:   c.order.id,
        serviceType:  c.service,
        serviceCode:  c.code,
        priority:     c.priority,
        status:       c.status,
        payerName:    c.payer,
        createdBy:    userId,
        assignedTo:   c.assignedTo,
        dueAt,
      },
    });
    console.log(`  created case: ${authCase.id} — ${c.service} (${c.status})`);
    cases.push(authCase);

    // Seed tasks for open cases
    if (["new", "docs_missing", "ready_to_submit", "pending_payer", "peer_review_needed", "more_info_requested", "appealed"].includes(c.status)) {
      await db.task.createMany({
        data: tasksForStatus(tid, authCase.id, c.status, userId),
        skipDuplicates: true,
      });
    }

    // Seed requirements for docs_missing case
    if (c.status === "docs_missing") {
      await db.authorizationRequirement.createMany({
        data: [
          { caseId: authCase.id, tenantId: tid, description: "Physician letter of medical necessity",    source: "crd", required: true, completed: false },
          { caseId: authCase.id, tenantId: tid, description: "Recent imaging report (within 6 months)", source: "crd", required: true, completed: true,  completedBy: userId, completedAt: new Date() },
          { caseId: authCase.id, tenantId: tid, description: "Prior conservative treatment records",    source: "dtr", required: true, completed: false },
        ],
      });
    }

    // Seed requirements for ready_to_submit case — all completed, ready to fire Submit button
    if (c.status === "ready_to_submit") {
      await db.authorizationRequirement.createMany({
        data: [
          { caseId: authCase.id, tenantId: tid, description: "Physician order and clinical notes",        source: "crd", required: true, completed: true, completedBy: userId, completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
          { caseId: authCase.id, tenantId: tid, description: "Recent MRI or imaging report",              source: "crd", required: true, completed: true, completedBy: userId, completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
          { caseId: authCase.id, tenantId: tid, description: "Conservative treatment history (6 months)", source: "dtr", required: true, completed: true, completedBy: userId, completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
        ],
      });
    }

    // Seed requirements + prior denial submission for appealed case
    if (c.status === "appealed") {
      await db.authorizationRequirement.createMany({
        data: [
          { caseId: authCase.id, tenantId: tid, description: "Original clinical notes",                   source: "crd", required: true, completed: true, completedBy: userId, completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
          { caseId: authCase.id, tenantId: tid, description: "Cardiologist letter of medical necessity",  source: "crd", required: true, completed: true, completedBy: userId, completedAt: new Date(Date.now() -  5 * 24 * 60 * 60 * 1000) },
          { caseId: authCase.id, tenantId: tid, description: "Appeal letter with supporting evidence",    source: "manual", required: true, completed: true, completedBy: userId, completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
        ],
      });

      // Prior denied submission that triggered the appeal
      const deniedSub = await db.submission.create({
        data: {
          caseId:      authCase.id,
          tenantId:    tid,
          protocol:    "pas",
          status:      "responded",
          submittedBy: userId,
          submittedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        },
      });
      await db.payerResponse.create({
        data: {
          submissionId: deniedSub.id,
          caseId:       authCase.id,
          tenantId:     tid,
          decision:     "denied",
          denialReason: "Medical necessity criteria not met — insufficient documentation of failed conservative treatment",
          denialCode:   "CO-50",
        },
      });
    }

    // Seed requirements for more_info_requested case (payer responded asking for additional docs)
    if (c.status === "more_info_requested") {
      await db.authorizationRequirement.createMany({
        data: [
          { caseId: authCase.id, tenantId: tid, description: "Initial clinical assessment",              source: "crd",   required: true, completed: true,  completedBy: userId, completedAt: new Date() },
          { caseId: authCase.id, tenantId: tid, description: "14-day sleep diary per payer request",    source: "manual", required: true, completed: false },
          { caseId: authCase.id, tenantId: tid, description: "Epworth Sleepiness Scale documentation",  source: "manual", required: true, completed: false },
        ],
      });
    }

    // Seed a submission for submitted/approved/denied/more_info_requested cases
    if (["submitted", "pending_payer", "approved", "denied", "more_info_requested"].includes(c.status)) {
      const sub = await db.submission.create({
        data: {
          caseId:      authCase.id,
          tenantId:    tid,
          protocol:    "pas",
          status:      c.status === "submitted" ? "sent" : "responded",
          submittedBy: userId,
          submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
      });

      if (c.status === "approved" || c.status === "denied") {
        await db.payerResponse.create({
          data: {
            submissionId: sub.id,
            caseId:       authCase.id,
            tenantId:     tid,
            decision:     c.status === "approved" ? "approved" : "denied",
            authNumber:   c.status === "approved" ? `AUTH-${Math.floor(Math.random() * 900000 + 100000)}` : null,
            denialReason: c.status === "denied" ? "Service not medically necessary per clinical guidelines" : null,
            denialCode:   c.status === "denied" ? "CO-50" : null,
          },
        });
      }
    }

    // Audit event
    await db.auditEvent.create({
      data: {
        tenantId:   tid,
        entityType: "AuthorizationCase",
        entityId:   authCase.id,
        action:     "case.created",
        actorId:    userId,
        after:      { status: c.status, service: c.service },
        occurredAt: new Date(),
      },
    });
  }

  // ── Final count ───────────────────────────────────────────────────────────
  const counts = await db.$transaction([
    db.authorizationCase.count({ where: { tenantId: tid } }),
    db.task.count({ where: { tenantId: tid } }),
    db.authorizationRequirement.count({ where: { tenantId: tid } }),
    db.submission.count({ where: { tenantId: tid } }),
    db.payerResponse.count({ where: { tenantId: tid } }),
    db.auditEvent.count({ where: { tenantId: tid } }),
  ]);

  console.log("\nSeed complete:");
  console.log(`  Cases:         ${counts[0]}`);
  console.log(`  Tasks:         ${counts[1]}`);
  console.log(`  Requirements:  ${counts[2]}`);
  console.log(`  Submissions:   ${counts[3]}`);
  console.log(`  PayerResponses:${counts[4]}`);
  console.log(`  AuditEvents:   ${counts[5]}`);
  console.log(`\nCase IDs for testing:`);
  for (let i = 0; i < cases.length; i++) {
    console.log(`  ${cases[i].id}  —  ${caseData[i].service} [${caseData[i].status}]`);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function upsertPatient(tid: string, fhirId: string, name: string, dob: string, gender: string, mrn: string) {
  return db.patientRef.upsert({
    where:  { tenantId_fhirId: { tenantId: tid, fhirId } },
    create: { tenantId: tid, fhirId, name, dob, gender, mrn },
    update: {},
  });
}

async function upsertCoverage(tid: string, fhirId: string, patientRefId: string, payerName: string, payerId: string, planName: string, memberId: string, groupId: string) {
  const existing = await db.coverageRef.findFirst({ where: { tenantId: tid, fhirId } });
  if (existing) return existing;
  return db.coverageRef.create({ data: { tenantId: tid, fhirId, patientRefId, payerName, payerId, planName, memberId, groupId } });
}

async function upsertOrder(tid: string, fhirId: string, patientRefId: string, serviceType: string, serviceCode: string, providerId: string) {
  return db.orderRef.upsert({
    where:  { tenantId_fhirId: { tenantId: tid, fhirId } },
    create: { tenantId: tid, fhirId, patientRefId, serviceType, serviceCode, orderingProviderRefId: providerId, requestedAt: new Date() },
    update: {},
  });
}

function tasksForStatus(tid: string, caseId: string, status: string, assignedTo: string) {
  const map: Record<string, Array<{ type: string; description: string }>> = {
    new:                [{ type: "review",   description: "Review case details and initiate requirements check" }],
    docs_missing:       [{ type: "collect",  description: "Collect letter of medical necessity from attending physician" },
                         { type: "collect",  description: "Obtain prior conservative treatment records" }],
    ready_to_submit:    [{ type: "submit",   description: "Build and submit prior auth request to payer" }],
    pending_payer:      [{ type: "follow_up",description: "Follow up with payer — response overdue" }],
    peer_review_needed:  [{ type: "schedule",  description: "Schedule peer-to-peer review with medical director" }],
    more_info_requested: [{ type: "collect",   description: "Submit 14-day sleep diary per payer request" },
                          { type: "collect",   description: "Obtain Epworth Sleepiness Scale documentation" }],
    appealed:            [{ type: "submit",    description: "Appeal prepared — resubmit prior auth with supporting evidence" }],
  };
  const tasks = map[status] ?? [];
  const due = new Date();
  due.setDate(due.getDate() + 2);
  return tasks.map((t) => ({ ...t, caseId, tenantId: tid, assignedTo, dueAt: due, status: "open" }));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
