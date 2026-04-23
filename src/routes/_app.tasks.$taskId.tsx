import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowLeft, Calendar, User as UserIcon, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useStore, useCurrentUser, store, can, type TaskStatus } from "@/lib/mock-store";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/tasks/$taskId")({
  head: () => ({ meta: [{ title: "Detail Tugas — TaskControl" }] }),
  component: TaskDetail,
  notFoundComponent: () => (
    <div className="p-8 text-center">
      <p className="text-muted-foreground">Tugas tidak ditemukan.</p>
      <Link to="/tasks" className="mt-4 inline-block text-primary hover:underline">← Kembali ke daftar tugas</Link>
    </div>
  ),
});

function TaskDetail() {
  const { taskId } = Route.useParams();
  const [openDesc, setOpenDesc] = useState(false);
  const user = useCurrentUser();
  const navigate = useNavigate();
  const tasks = useStore((s) => s.tasks || []);
  const users = useStore((s) => s.users || []);
  const allLogs = useStore((s) => s.logs || []);

  if (!user) return null; // Handle undefined user case

  const task = tasks.find((t) => t.id === taskId);
  const logs = allLogs.filter((l) => l.taskId === taskId);
  const userLogs = logs.filter(l => l.userId === user.id);
  const lastReadLog = logs.find(l => l.action === "read");
  const reader = lastReadLog ? users.find(u => u.id === lastReadLog.userId) : null;

  const myStatus = store.getUserTaskStatus(taskId, user.id);
  const myProgress = store.getUserTaskProgress(taskId, user.id);

useEffect(() => {
  if (!task) return;

  const alreadyRead = userLogs.some(l => l.action === "read");
  const isAdminOnDefault = user.role === "admin" && task.isDefault;

  if (!alreadyRead && user.id !== task.createdBy && !isAdminOnDefault) {
    store.markRead(task.id, user.id);

    store.markRead(task.id, user.id);
  }
}, [task]);

  if (!task) throw notFound();

  const assignee = users.find((u) => u.id === task.assignedTo);
  const creator = users.find((u) => u.id === task.createdBy);
  const overdue = myStatus !== "done" && new Date(task.deadline) < new Date();
  const canEdit = user.id === task.assignedTo || user.role === "admin" || user.role === "hrd" || task.isDefault;
  const canDelete = can.createTask(user.role);

  const handleDelete = () => {
    if (confirm("Apakah Anda yakin ingin menghapus tugas ini?")) {
      store.deleteTask(task.id);
      navigate({ to: "/tasks" });
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/tasks" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" /> Kembali
        </Link>
        {canDelete && (
          <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" /> Hapus Tugas
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card 
            className={cn(
              "p-6 shadow-(--shadow-card) transition-all",
              (myStatus === "read" || myStatus === "unread") && !(user.role === "admin" && task.isDefault) && "cursor-pointer hover:border-primary/50 hover:bg-primary/5 group"
            )}
            onClick={() => {
              if ((myStatus === "read" || myStatus === "unread") && !(user.role === "admin" && task.isDefault)) {
                store.updateProgress(task.id, user.id, 10);
              }
            }}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1
                    className="text-2xl font-bold cursor-pointer hover:text-primary transition-colors"
                  >
                    {task.title}
                  </h1>
                  {(myStatus === "read" || myStatus === "unread") && !(user.role === "admin" && task.isDefault) && (
                    <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold animate-pulse">
                      KLIK UNTUK MULAI
                    </span>
                  )}
                </div>
                <div className="mt-4 rounded-lg bg-muted/50 p-4 border border-border/50">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Deskripsi Tugas:</h3>
                  <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {task.description}
                </p>
                  
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <PriorityBadge priority={task.priority} />
                {user.role === "admin" && task.isDefault ? (
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs font-bold uppercase tracking-wider py-1 px-3">
                    Broadcast Task
                  </Badge>
                ) : (
                  <StatusBadge status={myStatus} />
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3 text-sm border-t pt-6">
              <Meta icon={UserIcon} label="Dibuat oleh" value={creator ? `${creator.name} (${creator.role.toUpperCase()})` : "—"} />
              <Meta 
                icon={UserIcon} 
                label="Ditugaskan ke" 
                value={task.isDefault ? "Seluruh Tim (HR & STAFF)" : (assignee ? `${assignee.name} (${assignee.role.toUpperCase()})` : "—")} 
              />
              <Meta
                icon={Calendar}
                label="Deadline"
                value={format(new Date(task.deadline), "dd MMM yyyy")}
                tone={overdue ? "destructive" : undefined}
              />
            </div>

            {task.readAt && (
              <div className="mt-4 flex items-center gap-2 rounded-md bg-info/10 px-3 py-2 text-xs text-info">
                <Eye className="h-3.5 w-3.5" />
                <span>
                  Dibaca oleh <span className="font-semibold">{reader?.name || "User"}</span> {formatDistanceToNow(new Date(task.readAt), { addSuffix: true })}
                </span>
              </div>
            )}
          </Card>

          <Card className="p-6 shadow-(--shadow-card)">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Progress Anda</h2>
              <span className="text-2xl font-bold tabular-nums text-primary">{myProgress}%</span>
            </div>
            <Slider
              className="mt-4"
              disabled={!canEdit || myStatus === "done"}
              value={[myProgress]}
              max={100}
              step={5}
              onValueChange={(v) => store.updateProgress(task.id, user.id, v[0])}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {[25, 50, 75, 100].map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={myProgress === p ? "default" : "outline"}
                  disabled={!canEdit}
                  onClick={() => store.updateProgress(task.id, user.id, p)}
                >
                  {p === 100 ? "Selesaikan" : `${p}%`}
                </Button>
              ))}
            </div>
            {!canEdit && (
              <p className="mt-3 text-xs text-muted-foreground">Hanya assignee atau Admin/HR yang dapat mengubah progress.</p>
            )}
          </Card>
        </div>

        <Card className="p-6 shadow-(--shadow-card) h-fit">
          <h2 className="mb-4 text-base font-semibold">Riwayat aktivitas</h2>
          <div className="space-y-3">
            {logs.map((l) => {
              const u = users.find((x) => x.id === l.userId);
              return (
                <div key={l.id} className="flex items-start gap-3 text-sm">
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div className="flex-1">
                    <div>
                      <span className="font-medium">{u?.name}</span>{" "}
                      <span className="text-muted-foreground">{actionLabel(l.action)}</span>
                      {l.detail && <span className="text-muted-foreground"> ({l.detail})</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(l.timestamp), "dd MMM yyyy HH:mm")} ·{" "}
                      {formatDistanceToNow(new Date(l.timestamp), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              );
            })}
            {logs.length === 0 && <p className="text-sm text-muted-foreground">Belum ada aktivitas.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Meta({
  icon: Icon, label, value, tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "destructive";
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`font-medium ${tone === "destructive" ? "text-destructive" : ""}`}>{value}</div>
      </div>
    </div>
  );
}

function actionLabel(a: string) {
  const labels: Record<string, string> = {
    created: "membuat tugas",
    read: "membaca tugas",
    updated: "memperbarui tugas",
    progress: "update progress",
    done: "menyelesaikan tugas",
    assigned: "ditugaskan tugas",
  };
  return labels[a] ?? a;
}