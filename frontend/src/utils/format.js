export const formatDateTime = (dateValue) => {
  if (!dateValue) {
    return "-";
  }

  const date = new Date(dateValue);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

export const formatWaitLabel = (minutes) => {
  if (minutes == null || Number.isNaN(Number(minutes))) {
    return "-";
  }

  if (Number(minutes) === 0) {
    return "Now";
  }

  return `${minutes} min`;
};

export const toPriorityTone = (priority) =>
  priority === "priority" ? "priority" : "normal";

export const toStatusTone = (status) => {
  const map = {
    waiting: "waiting",
    serving: "serving",
    completed: "completed",
    skipped: "skipped",
  };

  return map[status] || "neutral";
};
