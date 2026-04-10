export const calculateEstimatedWait = (tokensAhead, averageServiceMinutes) => {
  const safeAhead = Math.max(0, tokensAhead);
  const safeAverage = Math.max(1, Number(averageServiceMinutes) || 1);
  return safeAhead * safeAverage;
};
