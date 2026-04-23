import { Badge } from "@/components/ui/badge";
import type { Priority, TaskStatus } from "@/lib/mock-store";
import { cn } from "@/lib/utils";

const statusMap: Record<TaskStatus, { label: string; className: string }> = {
  unread: { label: "Belum dibaca", className: "bg-muted text-muted-foreground" },
  read: { label: "Sudah dibaca", className: "bg-[oklch(0.62_0.15_230_/_0.15)] text-[oklch(0.45_0.15_230)]" },
  in_progress: { label: "Sedang dikerjakan", className: "bg-[oklch(0.75_0.15_75_/_0.18)] text-[oklch(0.45_0.15_75)]" },
  done: { label: "Selesai", className: "bg-[oklch(0.62_0.15_155_/_0.15)] text-[oklch(0.40_0.15_155)]" },
};

const priorityMap: Record<Priority, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", className: "bg-[oklch(0.75_0.15_75_/_0.18)] text-[oklch(0.45_0.15_75)]" },
  high: { label: "High", className: "bg-destructive/15 text-destructive" },
};

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  const s = statusMap[status] || statusMap.unread || { label: "Unknown", className: "" };
  return <Badge variant="secondary" className={cn(s.className, className)}>{s.label}</Badge>;
}

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  const p = (priority && priorityMap[priority]) ? priorityMap[priority] : priorityMap.medium;
  return <Badge variant="secondary" className={cn(p.className, className)}>{p.label}</Badge>;
}
