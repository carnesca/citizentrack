export const bvaStag5ProcessingStats = [
  {
    year: 2022,
    recordedApplications: 10168,
    totalCompleted: 2517,
    certificatesIssued: 2409,
    rejected: 30,
    otherwiseCompleted: 78,
    applicationInventory: 9319,
  },
  {
    year: 2023,
    recordedApplications: 10121,
    totalCompleted: 2941,
    certificatesIssued: 2762,
    rejected: 49,
    otherwiseCompleted: 130,
    applicationInventory: 16499,
  },
  {
    year: 2024,
    recordedApplications: 13280,
    totalCompleted: 3195,
    certificatesIssued: 2852,
    rejected: 109,
    otherwiseCompleted: 234,
    applicationInventory: 26584,
  },
] as const;

export function getLatestBvaStag5Stats() {
  const latest = bvaStag5ProcessingStats[bvaStag5ProcessingStats.length - 1];
  const inventoryToCompletionYears = latest.applicationInventory / latest.totalCompleted;

  return {
    ...latest,
    inventoryToCompletionYears: Math.round(inventoryToCompletionYears * 10) / 10,
    inventoryToCompletionMonths: Math.round(inventoryToCompletionYears * 12),
    sourceLabel: "BVA StAG §5 processing statistics, 2022-2024",
  };
}
