import { WorkflowError } from '@/lib/reporting';

export class ReportRenderCapacityError extends WorkflowError {
  constructor() {
    super('Report rendering is busy. Try again shortly.');
    this.name = 'ReportRenderCapacityError';
  }
}

export class ReportRenderCapacity {
  private active = 0;
  private readonly activeUsers = new Set<string>();

  constructor(private readonly limit: number) {
    if (!Number.isSafeInteger(limit) || limit < 1) {
      throw new Error('Report render capacity must be a positive integer.');
    }
  }

  async run<T>(userId: string, operation: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit || this.activeUsers.has(userId)) {
      throw new ReportRenderCapacityError();
    }
    this.active += 1;
    this.activeUsers.add(userId);
    try {
      return await operation();
    } finally {
      this.active -= 1;
      this.activeUsers.delete(userId);
    }
  }
}

const reportRenderCapacity = new ReportRenderCapacity(1);

export function withReportRenderCapacity<T>(
  userId: string,
  operation: () => Promise<T>
): Promise<T> {
  return reportRenderCapacity.run(userId, operation);
}
