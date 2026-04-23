export function getTaskStatus(taskId: string, userId: string, logs: any[]) {
  const userLogs = logs.filter(
    (l) => l.taskId === taskId && l.userId === userId
  );

  const last = userLogs[0];

  if (!last) return "unread";

  switch (last.action) {
    case "task_read":
      return "read";
    case "task_progress":
      return "in_progress";
    case "task_done":
      return "done";
    default:
      return "unread";
  }
}