import { Queue, Worker, type Job } from "bullmq";
import { getPrismaClient } from "./prisma.js";
import { slaProcessor } from "../processors/slaProcessor.js";
import { escalationProcessor } from "../processors/escalationProcessor.js";
import { retryProcessor } from "../processors/retryProcessor.js";

export interface TenantWorkflowJob {
  tenantId: string;
  scheduledAt: string;
}

const QUEUE_NAMES = {
  dispatch: "workflow.dispatch",
  sla: "workflow.sla",
  escalation: "workflow.escalation",
  retry: "workflow.retry",
  deadLetter: "workflow.dead-letter",
} as const;

function redisConnection() {
  const redisUrl = new URL(process.env["REDIS_URL"] ?? "redis://localhost:6379");
  return {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    ...(redisUrl.username ? { username: decodeURIComponent(redisUrl.username) } : {}),
    ...(redisUrl.password ? { password: decodeURIComponent(redisUrl.password) } : {}),
    maxRetriesPerRequest: null,
  } as const;
}

const defaultJobOptions = {
  attempts: 5,
  backoff: { type: "exponential" as const, delay: 5_000 },
  removeOnComplete: 1_000,
  removeOnFail: false,
};

export interface WorkflowRuntime {
  start(): Promise<void>;
  close(): Promise<void>;
  isReady(): boolean;
}

export function createWorkflowRuntime(): WorkflowRuntime {
  const connection = redisConnection();
  const dispatchQueue = new Queue(QUEUE_NAMES.dispatch, { connection, defaultJobOptions });
  const slaQueue = new Queue<TenantWorkflowJob>(QUEUE_NAMES.sla, { connection, defaultJobOptions });
  const escalationQueue = new Queue<TenantWorkflowJob>(QUEUE_NAMES.escalation, { connection, defaultJobOptions });
  const retryQueue = new Queue<TenantWorkflowJob>(QUEUE_NAMES.retry, { connection, defaultJobOptions });
  const deadLetterQueue = new Queue(QUEUE_NAMES.deadLetter, { connection });
  const workers: Worker[] = [];
  let ready = false;

  async function moveToDeadLetter(queueName: string, job: Job<unknown> | undefined, error: Error): Promise<void> {
    if (!job || job.attemptsMade < (job.opts.attempts ?? defaultJobOptions.attempts)) return;
    await deadLetterQueue.add("failed-workflow-job", {
      queueName,
      jobId: job.id,
      tenantId: (job.data as Partial<TenantWorkflowJob>).tenantId,
      error: error.name,
      failedAt: new Date().toISOString(),
    }, { jobId: `dead-letter:${queueName}:${job.id}` });
  }

  function attachDeadLetterHandler(worker: Worker): void {
    worker.on("failed", (job, error) => {
      void moveToDeadLetter(worker.name, job, error).catch((deadLetterError: unknown) => {
        const name = deadLetterError instanceof Error ? deadLetterError.name : "UnknownError";
        console.error(JSON.stringify({ event: "workflow.dead_letter_failed", name }));
      });
    });
  }

  async function dispatch(): Promise<void> {
    const tenants = await getPrismaClient().tenant.findMany({ select: { id: true } });
    const scheduledAt = new Date().toISOString();
    const bucket = Math.floor(Date.now() / 60_000);
    await Promise.all(tenants.flatMap(({ id: tenantId }) => [
      slaQueue.add("sla-check", { tenantId, scheduledAt }, { jobId: `sla:${tenantId}:${bucket}` }),
      escalationQueue.add("escalation", { tenantId, scheduledAt }, { jobId: `escalation:${tenantId}:${bucket}` }),
      retryQueue.add("retry", { tenantId, scheduledAt }, { jobId: `retry:${tenantId}:${bucket}` }),
    ]));
  }

  return {
    async start(): Promise<void> {
      await Promise.all([
        dispatchQueue.waitUntilReady(),
        slaQueue.waitUntilReady(),
        escalationQueue.waitUntilReady(),
        retryQueue.waitUntilReady(),
        deadLetterQueue.waitUntilReady(),
      ]);

      const dispatchWorker = new Worker(
        QUEUE_NAMES.dispatch,
        async () => dispatch(),
        { connection, concurrency: 1 },
      );
      const slaWorker = new Worker(
        QUEUE_NAMES.sla,
        async (job) => slaProcessor.run(job.data.tenantId),
        { connection, concurrency: 5 },
      );
      const escalationWorker = new Worker(
        QUEUE_NAMES.escalation,
        async (job) => escalationProcessor.run(job.data.tenantId),
        { connection, concurrency: 5 },
      );
      const retryWorker = new Worker(
        QUEUE_NAMES.retry,
        async (job) => retryProcessor.run(job.data.tenantId),
        { connection, concurrency: 5 },
      );
      workers.push(dispatchWorker, slaWorker, escalationWorker, retryWorker);
      workers.forEach(attachDeadLetterHandler);

      await dispatchQueue.add("dispatch", {}, {
        jobId: "dispatch:repeat",
        repeat: { every: 60_000 },
      });
      ready = true;
    },

    async close(): Promise<void> {
      await Promise.all([
        ...workers.map((worker) => worker.close()),
        dispatchQueue.close(),
        slaQueue.close(),
        escalationQueue.close(),
        retryQueue.close(),
        deadLetterQueue.close(),
      ]);
      ready = false;
    },

    isReady(): boolean {
      return ready;
    },
  };
}
