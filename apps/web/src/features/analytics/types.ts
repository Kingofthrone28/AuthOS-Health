export interface TurnaroundData {
  metric: "turnaround";
  data: {
    statusDistribution: { status: string; count: number }[];
    priorityDistribution: { priority: string; count: number }[];
    turnaroundByPriority: Record<string, { avgHours: number; count: number }>;
  };
}

export interface DenialData {
  metric: "denials";
  data: {
    deniedCount: number;
    totalCases: number;
    denialRate: number;
    topReasons: { reason: string | null; count: number }[];
    monthlyTrend: { month: string; count: number }[];
  };
}

export interface PayerData {
  metric: "payers";
  data: {
    payer: string;
    totalCases: number;
    approvalRate: number;
    denialRate: number;
    avgResponseHours: number;
  }[];
}

export interface StaffData {
  metric: "staff";
  data: {
    staffId: string | null;
    activeCases: number;
    touchCount: number;
  }[];
}

export interface AnalyticsPageViewModel {
  turnaround: TurnaroundData;
  denials: DenialData;
  payers: PayerData;
  staff: StaffData;
}
