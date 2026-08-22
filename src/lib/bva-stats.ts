export type BvaStag5MonthlyStat = {
  periodKey: string;
  year: number;
  month: number;
  monthLabel: string;
  applicationsReceived: number;
  processed: number;
  approved: number;
  rejected: number;
  otherwiseCompleted: number;
  backlog: number;
};

export type BvaStag5AnnualSummary = {
  year: number;
  applicationsReceived: number;
  processed: number;
  approved: number;
  rejected: number;
  otherwiseCompleted: number;
  yearEndBacklog: number;
};

export const BVA_STAG5_SOURCE_LABEL =
  "Official BVA StAG 5 monthly statistics, Aug 2021-May 2026";

const rawBvaStag5MonthlyStats: ReadonlyArray<
  [
    periodKey: string,
    year: number,
    month: number,
    monthLabel: string,
    applicationsReceived: number,
    processed: number,
    approved: number,
    rejected: number,
    otherwiseCompleted: number,
    backlog: number,
  ]
> = [
  ["2021-08", 2021, 8, "Aug 2021", 6, 0, 0, 0, 0, 6],
  ["2021-09", 2021, 9, "Sep 2021", 130, 2, 0, 0, 2, 134],
  ["2021-10", 2021, 10, "Oct 2021", 489, 61, 59, 0, 2, 562],
  ["2021-11", 2021, 11, "Nov 2021", 690, 79, 76, 0, 3, 1173],
  ["2021-12", 2021, 12, "Dec 2021", 623, 128, 126, 0, 2, 1668],
  ["2022-01", 2022, 1, "Jan 2022", 720, 204, 201, 0, 3, 2184],
  ["2022-02", 2022, 2, "Feb 2022", 815, 219, 216, 0, 3, 2780],
  ["2022-03", 2022, 3, "Mar 2022", 834, 163, 158, 0, 5, 3451],
  ["2022-04", 2022, 4, "Apr 2022", 862, 177, 167, 0, 10, 4136],
  ["2022-05", 2022, 5, "May 2022", 529, 156, 154, 0, 2, 4509],
  ["2022-06", 2022, 6, "Jun 2022", 586, 204, 196, 2, 6, 4891],
  ["2022-07", 2022, 7, "Jul 2022", 530, 203, 185, 0, 18, 5218],
  ["2022-08", 2022, 8, "Aug 2022", 761, 211, 208, 1, 2, 5768],
  ["2022-09", 2022, 9, "Sep 2022", 1073, 265, 244, 13, 8, 6576],
  ["2022-10", 2022, 10, "Oct 2022", 1419, 195, 185, 5, 5, 7800],
  ["2022-11", 2022, 11, "Nov 2022", 1195, 285, 267, 9, 9, 8710],
  ["2022-12", 2022, 12, "Dec 2022", 844, 235, 228, 0, 7, 9319],
  ["2023-01", 2023, 1, "Jan 2023", 1508, 252, 248, 2, 2, 10575],
  ["2023-02", 2023, 2, "Feb 2023", 1018, 313, 284, 4, 25, 11280],
  ["2023-03", 2023, 3, "Mar 2023", 1061, 352, 338, 7, 7, 11989],
  ["2023-04", 2023, 4, "Apr 2023", 570, 238, 233, 5, 0, 12321],
  ["2023-05", 2023, 5, "May 2023", 636, 238, 217, 4, 17, 12719],
  ["2023-06", 2023, 6, "Jun 2023", 575, 361, 332, 6, 23, 12933],
  ["2023-07", 2023, 7, "Jul 2023", 546, 231, 202, 20, 9, 13248],
  ["2023-08", 2023, 8, "Aug 2023", 1008, 234, 221, 0, 13, 14022],
  ["2023-09", 2023, 9, "Sep 2023", 552, 183, 181, 0, 2, 14391],
  ["2023-10", 2023, 10, "Oct 2023", 830, 158, 156, 0, 2, 15063],
  ["2023-11", 2023, 11, "Nov 2023", 1087, 207, 183, 1, 23, 15943],
  ["2023-12", 2023, 12, "Dec 2023", 730, 174, 167, 0, 7, 16499],
  ["2024-01", 2024, 1, "Jan 2024", 1136, 187, 158, 3, 26, 17448],
  ["2024-02", 2024, 2, "Feb 2024", 610, 137, 117, 3, 17, 17921],
  ["2024-03", 2024, 3, "Mar 2024", 611, 209, 169, 6, 34, 18323],
  ["2024-04", 2024, 4, "Apr 2024", 911, 211, 171, 13, 27, 19023],
  ["2024-05", 2024, 5, "May 2024", 551, 216, 198, 8, 10, 19358],
  ["2024-06", 2024, 6, "Jun 2024", 734, 262, 232, 21, 9, 19830],
  ["2024-07", 2024, 7, "Jul 2024", 1174, 299, 284, 3, 12, 20705],
  ["2024-08", 2024, 8, "Aug 2024", 2411, 308, 285, 0, 23, 22808],
  ["2024-09", 2024, 9, "Sep 2024", 1197, 291, 278, 4, 9, 23714],
  ["2024-10", 2024, 10, "Oct 2024", 1391, 407, 372, 26, 9, 24698],
  ["2024-11", 2024, 11, "Nov 2024", 1582, 340, 304, 7, 29, 25940],
  ["2024-12", 2024, 12, "Dec 2024", 972, 328, 284, 15, 29, 26584],
  ["2025-01", 2025, 1, "Jan 2025", 1280, 395, 357, 17, 21, 27469],
  ["2025-02", 2025, 2, "Feb 2025", 758, 367, 334, 20, 13, 27860],
  ["2025-03", 2025, 3, "Mar 2025", 1298, 391, 366, 18, 7, 28767],
  ["2025-04", 2025, 4, "Apr 2025", 957, 389, 352, 19, 18, 29335],
  ["2025-05", 2025, 5, "May 2025", 1156, 440, 432, 8, 0, 30051],
  ["2025-06", 2025, 6, "Jun 2025", 1166, 497, 442, 29, 26, 30720],
  ["2025-07", 2025, 7, "Jul 2025", 1197, 534, 483, 34, 17, 31383],
  ["2025-08", 2025, 8, "Aug 2025", 1156, 426, 369, 26, 31, 32113],
  ["2025-09", 2025, 9, "Sep 2025", 740, 569, 545, 6, 18, 32284],
  ["2025-10", 2025, 10, "Oct 2025", 1602, 560, 477, 57, 26, 33326],
  ["2025-11", 2025, 11, "Nov 2025", 956, 416, 356, 28, 32, 33866],
  ["2025-12", 2025, 12, "Dec 2025", 772, 426, 385, 23, 18, 34212],
  ["2026-01", 2026, 1, "Jan 2026", 1702, 516, 460, 16, 40, 35398],
  ["2026-02", 2026, 2, "Feb 2026", 883, 692, 622, 18, 52, 35589],
  ["2026-03", 2026, 3, "Mar 2026", 1157, 736, 679, 5, 52, 36010],
  ["2026-04", 2026, 4, "Apr 2026", 1160, 636, 597, 24, 15, 36534],
  ["2026-05", 2026, 5, "May 2026", 822, 608, 536, 37, 35, 36748],
];

export const bvaStag5MonthlyStats = rawBvaStag5MonthlyStats.map(
  ([
    periodKey,
    year,
    month,
    monthLabel,
    applicationsReceived,
    processed,
    approved,
    rejected,
    otherwiseCompleted,
    backlog,
  ]) =>
    ({
      periodKey,
      year,
      month,
      monthLabel,
      applicationsReceived,
      processed,
      approved,
      rejected,
      otherwiseCompleted,
      backlog,
    }) satisfies BvaStag5MonthlyStat,
);

export function getLatestBvaStag5Stats() {
  const latest = bvaStag5MonthlyStats[bvaStag5MonthlyStats.length - 1];
  const lastTwelve = bvaStag5MonthlyStats.slice(-12);
  const averageMonthlyProcessed = average(lastTwelve.map((row) => row.processed));
  const averageMonthlyReceived = average(lastTwelve.map((row) => row.applicationsReceived));
  const inventoryToCompletionMonths = averageMonthlyProcessed ? latest.backlog / averageMonthlyProcessed : null;

  return {
    ...latest,
    recordedApplications: latest.applicationsReceived,
    totalCompleted: latest.processed,
    certificatesIssued: latest.approved,
    applicationInventory: latest.backlog,
    averageMonthlyProcessed,
    averageMonthlyReceived,
    inventoryToCompletionMonths: inventoryToCompletionMonths == null ? null : Math.round(inventoryToCompletionMonths),
    inventoryToCompletionYears: inventoryToCompletionMonths == null ? null : Math.round((inventoryToCompletionMonths / 12) * 10) / 10,
    sourceLabel: BVA_STAG5_SOURCE_LABEL,
  };
}

export function getBvaStag5AnnualSummaries(): BvaStag5AnnualSummary[] {
  const byYear = new Map<number, BvaStag5AnnualSummary>();

  for (const row of bvaStag5MonthlyStats) {
    const existing =
      byYear.get(row.year) ??
      ({
        year: row.year,
        applicationsReceived: 0,
        processed: 0,
        approved: 0,
        rejected: 0,
        otherwiseCompleted: 0,
        yearEndBacklog: row.backlog,
      } satisfies BvaStag5AnnualSummary);

    existing.applicationsReceived += row.applicationsReceived;
    existing.processed += row.processed;
    existing.approved += row.approved;
    existing.rejected += row.rejected;
    existing.otherwiseCompleted += row.otherwiseCompleted;
    existing.yearEndBacklog = row.backlog;
    byYear.set(row.year, existing);
  }

  return Array.from(byYear.values()).sort((a, b) => a.year - b.year);
}

export function getBvaStag5TrendPoints(mode: "month" | "year") {
  if (mode === "month") {
    return bvaStag5MonthlyStats.map((row) => ({
      period_key: `bva-${row.periodKey}`,
      period_label: row.monthLabel,
      year_number: row.year,
      month_number: row.month,
      submissions: row.applicationsReceived,
      approvals: row.approved,
      processed: row.processed,
      backlog: row.backlog,
      source: "Official BVA",
    }));
  }

  return getBvaStag5AnnualSummaries().map((row) => ({
    period_key: `bva-${row.year}`,
    period_label: String(row.year),
    year_number: row.year,
    month_number: 1,
    submissions: row.applicationsReceived,
    approvals: row.approved,
    processed: row.processed,
    backlog: row.yearEndBacklog,
    source: "Official BVA",
  }));
}

export function getBvaStag5WorkloadSummary() {
  const latest = getLatestBvaStag5Stats();
  const all = bvaStag5MonthlyStats;
  const processedByMonth = all.map((row) => row.processed);
  const receivedByMonth = all.map((row) => row.applicationsReceived);

  return {
    sourceLabel: BVA_STAG5_SOURCE_LABEL,
    latestPeriodLabel: latest.monthLabel,
    latestBacklog: latest.backlog,
    latestApproved: latest.approved,
    averageMonthlyReceived: Math.round(average(receivedByMonth)),
    averageMonthlyProcessed: Math.round(average(processedByMonth)),
    recentAverageMonthlyReceived: Math.round(latest.averageMonthlyReceived),
    recentAverageMonthlyProcessed: Math.round(latest.averageMonthlyProcessed),
    estimatedBacklogMonthsAtRecentPace: latest.inventoryToCompletionMonths,
    approvalRate:
      latest.processed > 0 ? Math.round((latest.approved / latest.processed) * 1000) / 10 : null,
  };
}

export function getBvaStag5QueueReachEstimate(targetPeriodKey: string) {
  const latest = bvaStag5MonthlyStats[bvaStag5MonthlyStats.length - 1];
  const target = bvaStag5MonthlyStats.find((row) => row.periodKey === targetPeriodKey) ?? bvaStag5MonthlyStats[0];
  const totalProcessed = bvaStag5MonthlyStats.reduce((sum, row) => sum + row.processed, 0);
  const recentProcessedRows = bvaStag5MonthlyStats.slice(-12);
  const latestTwelveMonthProcessed = average(recentProcessedRows.map((row) => row.processed));
  const projectedMonthlyGrowth = getCappedMonthlyProcessingGrowth(recentProcessedRows.map((row) => row.processed));
  const receivedBeforeTarget = bvaStag5MonthlyStats
    .filter((row) => monthIndex(row.periodKey) < monthIndex(target.periodKey))
    .reduce((sum, row) => sum + row.applicationsReceived, 0);
  const receivedThroughTarget = receivedBeforeTarget + target.applicationsReceived;
  const remainingBeforeTarget = Math.max(0, receivedBeforeTarget - totalProcessed);
  const remainingThroughTarget = Math.max(0, receivedThroughTarget - totalProcessed);
  const monthsUntilTargetStart = latestTwelveMonthProcessed ? Math.ceil(remainingBeforeTarget / latestTwelveMonthProcessed) : null;
  const monthsUntilTargetEnd = latestTwelveMonthProcessed ? Math.ceil(remainingThroughTarget / latestTwelveMonthProcessed) : null;
  const improvingMonthsUntilTargetStart = projectMonthsToClear({
    remainingCases: remainingBeforeTarget,
    startingMonthlyProcessed: latestTwelveMonthProcessed,
    monthlyGrowth: projectedMonthlyGrowth,
  });
  const improvingMonthsUntilTargetEnd = projectMonthsToClear({
    remainingCases: remainingThroughTarget,
    startingMonthlyProcessed: latestTwelveMonthProcessed,
    monthlyGrowth: projectedMonthlyGrowth,
  });
  const currentReach = getModeledCurrentReach(totalProcessed);
  const status =
    remainingThroughTarget === 0
      ? "Modeled as already past this submission cohort"
      : remainingBeforeTarget === 0
        ? "Modeled as currently reaching this submission cohort"
        : "Modeled as not yet reaching this submission cohort";

  return {
    target,
    latestPeriodLabel: latest.monthLabel,
    currentReach,
    totalProcessed,
    receivedBeforeTarget,
    receivedThroughTarget,
    remainingBeforeTarget,
    remainingThroughTarget,
    recentAverageMonthlyProcessed: Math.round(latestTwelveMonthProcessed),
    projectedMonthlyProcessingGrowth: projectedMonthlyGrowth,
    targetStartReachLabel:
      monthsUntilTargetStart == null ? "n/a" : formatReachLabel(addMonthsToPeriod(latest.periodKey, monthsUntilTargetStart)),
    targetFullyReachedLabel:
      monthsUntilTargetEnd == null ? "n/a" : formatReachLabel(addMonthsToPeriod(latest.periodKey, monthsUntilTargetEnd)),
    improvingTargetStartReachLabel:
      improvingMonthsUntilTargetStart == null ? "n/a" : formatReachLabel(addMonthsToPeriod(latest.periodKey, improvingMonthsUntilTargetStart)),
    improvingTargetFullyReachedLabel:
      improvingMonthsUntilTargetEnd == null ? "n/a" : formatReachLabel(addMonthsToPeriod(latest.periodKey, improvingMonthsUntilTargetEnd)),
    targetStartReachRangeLabel: formatEstimateRange({
      optimistic: improvingMonthsUntilTargetStart == null ? null : addMonthsToPeriod(latest.periodKey, improvingMonthsUntilTargetStart),
      conservative: monthsUntilTargetStart == null ? null : addMonthsToPeriod(latest.periodKey, monthsUntilTargetStart),
    }),
    targetFullyReachedRangeLabel: formatEstimateRange({
      optimistic: improvingMonthsUntilTargetEnd == null ? null : addMonthsToPeriod(latest.periodKey, improvingMonthsUntilTargetEnd),
      conservative: monthsUntilTargetEnd == null ? null : addMonthsToPeriod(latest.periodKey, monthsUntilTargetEnd),
    }),
    status,
    userFacingStatus: getUserFacingQueueStatus(status),
  };
}

function getCappedMonthlyProcessingGrowth(values: number[]) {
  if (values.length < 2) return 0;

  const trend = linearTrend(values);
  const averageProcessed = average(values);
  const cappedGrowth = Math.min(Math.max(0, trend), averageProcessed * 0.04, 35);

  return Math.round(cappedGrowth * 10) / 10;
}

function linearTrend(values: number[]) {
  const n = values.length;
  const sumX = values.reduce((sum, _value, index) => sum + index, 0);
  const sumY = values.reduce((sum, value) => sum + value, 0);
  const sumXY = values.reduce((sum, value, index) => sum + index * value, 0);
  const sumXX = values.reduce((sum, _value, index) => sum + index * index, 0);
  const denominator = n * sumXX - sumX * sumX;

  if (!denominator) return 0;
  return (n * sumXY - sumX * sumY) / denominator;
}

function projectMonthsToClear({
  remainingCases,
  startingMonthlyProcessed,
  monthlyGrowth,
}: {
  remainingCases: number;
  startingMonthlyProcessed: number;
  monthlyGrowth: number;
}) {
  if (remainingCases <= 0) return 0;
  if (startingMonthlyProcessed <= 0) return null;

  let remaining = remainingCases;
  let monthlyProcessed = startingMonthlyProcessed;

  for (let month = 1; month <= 120; month += 1) {
    remaining -= monthlyProcessed;
    if (remaining <= 0) return month;
    monthlyProcessed += monthlyGrowth;
  }

  return null;
}

function formatEstimateRange({
  optimistic,
  conservative,
}: {
  optimistic: string | null;
  conservative: string | null;
}) {
  if (!optimistic && !conservative) return "n/a";
  if (!optimistic || optimistic === conservative) return formatReachLabel(conservative ?? optimistic ?? "");
  if (!conservative) return formatReachLabel(optimistic);
  return `${formatReachLabel(optimistic)}-${formatReachLabel(conservative)}`;
}

function getUserFacingQueueStatus(status: string) {
  if (status.includes("already past")) return "This selected month appears to be behind the modeled queue position.";
  if (status.includes("currently reaching")) return "This selected month appears close to the modeled queue position.";
  return "This selected month appears ahead of the modeled queue position.";
}

function getModeledCurrentReach(totalProcessed: number) {
  let cumulativeReceived = 0;

  for (const row of bvaStag5MonthlyStats) {
    cumulativeReceived += row.applicationsReceived;
    if (cumulativeReceived > totalProcessed) {
      return row;
    }
  }

  return bvaStag5MonthlyStats[bvaStag5MonthlyStats.length - 1];
}

function addMonthsToPeriod(periodKey: string, monthsToAdd: number) {
  const index = monthIndex(periodKey) + monthsToAdd;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function monthIndex(periodKey: string) {
  const [yearRaw, monthRaw] = periodKey.split("-");
  return Number(yearRaw) * 12 + Number(monthRaw) - 1;
}

function formatReachLabel(periodKey: string) {
  const [yearRaw, monthRaw] = periodKey.split("-");
  const date = new Date(Number(yearRaw), Number(monthRaw) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
