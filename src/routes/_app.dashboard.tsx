import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { ListTodo, CheckCircle2, Clock, AlertTriangle, Plus, ShieldCheck, Circle, CheckSquare, Trash2 } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useStore, useCurrentUser, can, store, type TaskStatus, type User } from "@/lib/mock-store";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — TaskControl" }] }),
  component: Dashboard,
});

function Dashboard() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const tasks = useStore((s) => s.tasks || []);
  const allLogs = useStore((s) => s.logs || []);
  const users = useStore((s) => s.users || []);
  const checklists = useStore((s) => s.checklists || []);
  const isToday = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  };

  const [selectedDefaultTask, setSelectedDefaultTask] = useState<string | null>(null);
  const [selectedReadStatus, setSelectedReadStatus] = useState<TaskStatus | null>(null);

  const [selectedStatKey, setSelectedStatKey] = useState<"today" | "done" | "notDone" | "overdue" | null>(null);

  if (!user) return null; // Handle undefined user case

  // Filter logs based on role and involvement
  const logs = allLogs.filter((log) => {
    if (user.role === "admin") return true;
    const task = tasks.find((t) => t.id === log.taskId);
    if (!task) return false;
    // Show logs for default tasks OR tasks specifically for this user
    return task.isDefault || task.assignedTo === user.id || task.createdBy === user.id;
  });

  const uniqueLogs = Object.values(
  logs.reduce((acc, curr) => {
    const key = `${curr.taskId}-${curr.userId}-${curr.action}`;

    if (!acc[key] || new Date(acc[key].timestamp) < new Date(curr.timestamp)) {
      acc[key] = curr;
    }

    return acc;
  }, {} as Record<string, typeof logs[0]>)
).sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));

  const visible = tasks.filter((t) => {
    // Strictly exclude default tasks (broadcast) from statistics
    if (t.isDefault) return false; 
    
    if (user.role === "admin") return true;
    return String(t.assignedTo) === String(user.id) || String(t.createdBy) === String(user.id);
  });

  const staffAndHr = users.filter(u => u.role !== "admin");

  // NEW: Admin Task-Based Stats Calculation
  const getAdminStats = () => {
    let todayCount = 0;
    let doneCount = 0;
    let notDoneCount = 0;
    let overdueCount = 0;

    const todayTasks: { task: any; user: User; status: TaskStatus }[] = [];
    const doneTasks: { task: any; user: User; status: TaskStatus }[] = [];
    const notDoneTasks: { task: any; user: User; status: TaskStatus }[] = [];
    const overdueTasks: { task: any; user: User; status: TaskStatus }[] = [];

    // Filter to ONLY private tasks (isDefault === false)
    // We strictly ignore default tasks (broadcast tasks) for stats as per instructions
    const privateTasks = tasks.filter(t => !t.isDefault);

    privateTasks.forEach(t => {
      // For private tasks, check status for the assignee only
      const assignee = users.find(u => String(u.id) === String(t.assignedTo));
      if (assignee) {
        const status = store.getUserTaskStatus(t.id, String(t.assignedTo));
        
        if (isToday(t.createdAt)) {
          todayCount++;
          todayTasks.push({ task: t, user: assignee, status });
        }

        if (status === "done") {
          doneCount++;
          doneTasks.push({ task: t, user: assignee, status });
        } else {
          notDoneCount++;
          notDoneTasks.push({ task: t, user: assignee, status });
          if (new Date(t.deadline) < new Date()) {
            overdueCount++;
            overdueTasks.push({ task: t, user: assignee, status });
          }
        }
      }
    });

    return {
      todayCount, doneCount, notDoneCount, overdueCount,
      todayTasks, doneTasks, notDoneTasks, overdueTasks
    };
  };

  const adminStats = getAdminStats();

  const getMyStats = () => {
    const today = new Date().toDateString();
    const myToday = visible.filter((t) => isToday(t.createdAt)).length;
    const myDone = visible.filter((t) => store.getUserTaskStatus(t.id, user.id) === "done").length;
    const myNotDone = visible.filter((t) => store.getUserTaskStatus(t.id, user.id) !== "done").length;
    const myOverdue = visible.filter((t) => t.deadline < new Date().toISOString() && store.getUserTaskStatus(t.id, user.id) !== "done").length;
    return { myToday, myDone, myNotDone, myOverdue };
  };

  const myStats = getMyStats();

  // Status type for stats
  type StatKey = "today" | "done" | "notDone" | "overdue";
  type TaskItem = { task: any; user: User; status: TaskStatus };

  const stats: { label: string; value: number; icon: any; tint: string; statKey: StatKey; tasks: TaskItem[] }[] = [
    {
      label: "Tugas hari ini",
      value: user.role === "admin" ? adminStats.todayCount : myStats.myToday,
      icon: ListTodo,
      tint: "text-primary",
      statKey: "today",
      tasks: adminStats.todayTasks
    },
    {
      label: "Selesai",
      value: user.role === "admin" ? adminStats.doneCount : myStats.myDone,
      icon: CheckCircle2,
      tint: "text-success",
      statKey: "done",
      tasks: adminStats.doneTasks
    },
    {
      label: "Belum selesai",
      value: user.role === "admin" ? adminStats.notDoneCount : myStats.myNotDone,
      icon: Clock,
      tint: "text-warning",
      statKey: "notDone",
      tasks: adminStats.notDoneTasks
    },
    {
      label: "Overdue",
      value: user.role === "admin" ? adminStats.overdueCount : myStats.myOverdue,
      icon: AlertTriangle,
      tint: "text-destructive",
      statKey: "overdue",
      tasks: adminStats.overdueTasks
    },
  ];

  // Modified Task Card for HR/Staff to support auto-read on click
  const TaskStatCard = ({ s }: { s: typeof stats[0] }) => {
    const isUnread = s.statKey === "today" || s.statKey === "notDone";
    
    return (
      <Card 
        key={s.label} 
        className={cn(
          "p-5 shadow-(--shadow-card) transition-all",
          user.role === "admin" ? "cursor-pointer hover:border-primary/50 hover:bg-accent/50 active:scale-95" : "cursor-default"
        )}
        onClick={() => {
          if (user.role === "admin") {
            setSelectedStatKey(s.statKey);
          } else if ((user.role === "hrd" || user.role === "staff") && isUnread) {
            // For HR/Staff, clicking unread stats can also trigger navigation or read status logic if needed
            // But per instruction, we focus on the task title click in lists/cards.
            navigate({ to: "/tasks" });
          }
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{s.label}</span>
          <s.icon className={`h-5 w-5 ${s.tint}`} />
        </div>
        <div className="mt-2 text-3xl font-bold tracking-tight">{s.value}</div>
        {user.role === "admin" && (
          <div className="mt-2 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
            Klik untuk detail
          </div>
        )}
      </Card>
    );
  };

  // Recent tasks for HR/Staff - only tagged tasks
  const recent = [...visible].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 5);
  const userName = (id?: string | number) =>
  users.find((u) => String(u.id) === String(id))?.name ?? "—";

const userRole = (id?: string | number) =>
  users.find((u) => String(u.id) === String(id))?.role ?? "";
  const defaultTasks = tasks.filter((t) => t.isDefault);

  const handleDeleteDefaultTask = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus tugas default ini?")) {
      store.deleteTask(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Ringkasan tugas dan aktivitas tim hari ini.</p>
        </div>
        {user.role === "admin" && <CreateDefaultTaskDialog />}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <TaskStatCard key={s.label} s={s} />
        ))}
      </div>

      {/* NEW: User List Detail Dialog for Admin */}
      <Dialog open={!!selectedStatKey} onOpenChange={(open) => !open && setSelectedStatKey(null)}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {(() => {
                const s = stats.find(stat => stat.statKey === selectedStatKey);
                if (!s) return "Detail";
                return (
                  <>
                    <s.icon className={cn("h-5 w-5", s.tint)} />
                    <span>Daftar User: {s.label}</span>
                  </>
                );
              })()}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {(() => {
              const stat = stats.find(s => s.statKey === selectedStatKey);
              if (!stat || stat.tasks.length === 0) {
                return <div className="py-8 text-center text-sm text-muted-foreground italic">Tidak ada tugas di kategori ini.</div>;
              }

              return stat.tasks.map(({ task, user, status }, idx) => (
                <div key={`${task.id}-${user.id}-${idx}`} className="flex items-center justify-between p-3 rounded-lg border bg-card shadow-sm">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                      {user.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-sm font-bold truncate">{task.title}</div>
                        <StatusBadge status={status} className="h-4 text-[8px] px-1.5 shrink-0" />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="text-[10px] text-muted-foreground uppercase font-medium">{user.name}</div>
                        <span className="text-[8px] text-muted-foreground/50">•</span>
                        <div className="text-[10px] text-muted-foreground uppercase font-medium">{user.role}</div>
                      </div>
                    </div>
                  </div>
                  <Link 
                    to="/tasks/$taskId" 
                    params={{ taskId: task.id }}
                    className="ml-2 text-primary hover:underline text-xs shrink-0"
                    onClick={() => setSelectedStatKey(null)}
                  >
                    Lihat
                  </Link>
                </div>
              ));
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedStatKey(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {(user.role === "hrd" || user.role === "staff") && defaultTasks.length > 0 && (
        <Card className="border-primary/20 bg-primary/5 p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-primary">Tugas Default dari Admin</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {defaultTasks.map((t) => {
              const status = store.getUserTaskStatus(t.id, user.id);
              return (
                <div
                  key={t.id}
                  className="block rounded-md border border-primary/10 bg-card p-3 shadow-sm transition-all hover:border-primary/30 hover:shadow-md group cursor-pointer"
                 onClick={() => {
  if (status === "unread") {
    store.markRead(t.id, user.id);
  }

  navigate({ to: "/tasks" });
}}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                      {t.title}
                    </div>
                    {status === "unread" && (
                      <span className="h-2 w-2 rounded-full bg-primary animate-pulse shrink-0" />
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{t.description}</div>
                  <div className="mt-2 text-[10px] text-primary font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                    {status === "unread" ? "Klik untuk Baca" : "Lihat Detail"}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {user.role === "admin" && (
        <Card className="p-5 shadow-(--shadow-card) border-primary/20 bg-primary/5">
          <div className="mb-4 flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-base font-semibold text-primary">Manajemen Tugas Default</h2>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">Tampil di dashboard HR & Staff</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {defaultTasks.reduce((acc, current) => {
              // Deduplicate by task ID for admin view
              if (!acc.find(t => t.id === current.id)) acc.push(current);
              return acc;
            }, [] as typeof defaultTasks).map((t) => (
              <div key={t.id} className="rounded-lg border bg-card p-4 flex items-start justify-between group hover:border-primary/50 transition-colors shadow-sm">
                <Link to="/tasks/$taskId" params={{ taskId: t.id }} className="min-w-0 pr-4 flex-1">
                  <div className="font-bold text-sm truncate group-hover:text-primary transition-colors">{t.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">{t.description}</div>
                </Link>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0" 
                  onClick={() => handleDeleteDefaultTask(t.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {defaultTasks.length === 0 && (
              <div className="col-span-full py-10 text-center text-sm text-muted-foreground italic border-2 border-dashed rounded-lg">
                Belum ada tugas default yang dibuat.
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Admin Monitoring Panel - Also shown for HR and Staff to unify layout */}
      {(user.role === "admin" || user.role === "hrd" || user.role === "staff") && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Task-based Checklist Monitor for Admin */}
          {user.role === "admin" && (
            <Card className="p-5 shadow-(--shadow-card) md:col-span-2 border-primary/20 bg-primary/5">
              <h2 className="mb-4 text-base font-semibold text-primary">Monitoring Checklist Tugas Tim</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {users.filter(u => u.role !== "admin").map(u => {
                  const userTasks = tasks.filter(t => String(t.assignedTo) === String(u.id) && !t.isDefault);
                  const done = userTasks.filter(t => store.getUserTaskStatus(t.id, String(u.id)) === "done").length;
                  return (
                    <div key={u.id} className="bg-card rounded-lg p-3 border shadow-sm">
                      <div className="flex items-center justify-between mb-2 border-b pb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="font-bold text-sm truncate">{u.name}</div>
                          <Badge variant="outline" className="text-[9px] h-4 uppercase shrink-0 px-1">{u.role}</Badge>
                        </div>
                        <Badge variant="secondary" className="text-[9px] h-4 shrink-0">
                          {done}/{userTasks.length} Selesai
                        </Badge>
                      </div>
                      <div className="space-y-1.5 pt-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                        {userTasks.map(t => {
                          const taskStatus = store.getUserTaskStatus(t.id, String(u.id));
                          return (
                          <div key={t.id} className="flex items-center gap-2 text-[11px]">
                            {taskStatus === "done" ? (
                              <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
                            ) : (
                              <Circle className="h-3 w-3 text-muted-foreground shrink-0" />
                            )}
                            <span className={cn("truncate", taskStatus === "done" && "text-muted-foreground line-through")}>
                              {t.title}
                            </span>
                          </div>
                        );
                        })}
                        {userTasks.length === 0 && (
                          <div className="text-[10px] text-muted-foreground italic text-center py-4">
                            Belum ada tugas khusus.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Operational Checklist Monitor for Admin */}
          {user.role === "admin" && (
            <Card className="p-5 shadow-(--shadow-card) md:col-span-2 border-info/20 bg-info/5">
              <h2 className="mb-4 text-base font-semibold text-info flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                Monitoring Checklist Operasional Tim
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {checklists.map(c => {
                  const creator = users.find(u => String(u.id) === String(c.createdBy));
                  const completedCount = c.items.filter(i => i.completed).length;
                  return (
                    <div key={c.id} className="bg-card rounded-lg p-3 border shadow-sm flex flex-col h-full">
                      <div className="flex items-center justify-between mb-2 border-b pb-1.5">
                        <div className="min-w-0">
                          <div className="font-bold text-sm truncate">{c.title}</div>
                          <div className="text-[10px] text-muted-foreground uppercase">Oleh: {creator?.name || "Unknown"}</div>
                        </div>
                        <Badge variant={completedCount === c.items.length ? "default" : "secondary"} className="text-[9px] h-4 shrink-0">
                          {completedCount}/{c.items.length}
                        </Badge>
                      </div>
                      <div className="space-y-1.5 pt-1.5 overflow-y-auto pr-1 flex-1">
                        {c.items.map(item => (
                          <div key={item.id} className="flex items-center gap-2 text-[11px]">
                            {item.completed ? (
                              <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
                            ) : (
                              <Circle className="h-3 w-3 text-muted-foreground shrink-0" />
                            )}
                            <span className={cn("truncate", item.completed && "text-muted-foreground line-through")}>
                              {item.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {checklists.length === 0 && (
                  <div className="col-span-full py-6 text-center text-sm text-muted-foreground italic">
                    Belum ada checklist operasional dari tim.
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* NEW: Default Task Reader Monitor for Admin */}
          {user.role === "admin" && (
            <Card className="p-5 shadow-(--shadow-card) border-warning/20 bg-warning/5">
              <h2 className="mb-4 text-base font-semibold text-warning flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Monitoring Baca Tugas Default (HR & Staff)
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {defaultTasks.map(t => (
                  <div key={t.id} className="bg-card rounded-lg p-3 border shadow-sm flex flex-col h-full">
                    <div className="mb-2 border-b pb-1.5">
                      <div className="font-bold text-sm truncate">{t.title}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">Tugas Default</div>
                    </div>
                    <div className="space-y-2 pt-1.5 flex-1">
                      {users.filter(u => u.role !== "admin").map(u => {
                        const status = store.getUserTaskStatus(String(t.id), String(u.id));
                        return (
                          <div key={u.id} className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="truncate font-medium">{u.name}</span>
                              {status === "unread" ? (
                                  <Badge
                                    variant="secondary"
                                    className="cursor-pointer"
                                    onClick={() => setSelectedDefaultTask(t.id)}
                                  >
                                    Belum Baca
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="default"
                                    className="cursor-pointer"
                                   onClick={() => setSelectedDefaultTask(t.id)}
                                  >
                                    Sudah Baca
                                  </Badge>
                                )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <Dialog open={!!selectedDefaultTask} onOpenChange={() => {
                  setSelectedDefaultTask(null);
                  setSelectedReadStatus(null);
                }}>
                  <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
                    <DialogHeader>
                      <DialogTitle>
                        {selectedReadStatus === "read" ? "Sudah Membaca" : "Belum Membaca"}
                      </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">

  {/* BELUM MEMBACA */}
  <div className="space-y-2">
    <div className="text-xs font-bold text-destructive uppercase">
      Belum Membaca
    </div>

    {users
      .filter(u => u.role !== "admin")
      .filter(u => store.getUserTaskStatus(selectedDefaultTask!, u.id) === "unread")
      .map(u => (
        <div key={u.id} className="flex justify-between p-2 border rounded">
          <span className="font-medium">{u.name}</span>
          <span className="text-xs text-muted-foreground uppercase">
            {u.role}
          </span>
        </div>
      ))}
  </div>

  {/* SUDAH MEMBACA */}
  <div className="space-y-2 mt-4">
    <div className="text-xs font-bold text-success uppercase">
      Sudah Membaca
    </div>

    {users
      .filter(u => u.role !== "admin")
      .filter(u => store.getUserTaskStatus(selectedDefaultTask!, u.id) !== "unread")
      .map(u => (
        <div key={u.id} className="flex justify-between p-2 border rounded">
          <span className="font-medium">{u.name}</span>
          <span className="text-xs text-muted-foreground uppercase">
            {u.role}
          </span>
        </div>
      ))}
  </div>

</div>

                    <DialogFooter>
                      <Button onClick={() => {
                        setSelectedDefaultTask(null);
                        setSelectedReadStatus(null);
                      }}>
                        Tutup
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                {defaultTasks.length === 0 && (
                  <div className="col-span-full py-6 text-center text-sm text-muted-foreground italic">
                    Belum ada tugas default untuk dimonitor.
                  </div>
                )}
              </div>
            </Card>
          )}

          <Card className="p-5 shadow-(--shadow-card)">
            <h2 className="mb-4 text-base font-semibold">Tugas Sedang Dikerjakan</h2>
            <div className="space-y-3">
              {tasks.filter(t => {
                // Only tagged tasks, not default
                if (t.isDefault) return false;
                const status = store.getUserTaskStatus(t.id, t.assignedTo!);
                return status === "in_progress" && (user.role === "admin" || t.createdBy === user.id || t.assignedTo === user.id);
              }).slice(0, 4).map(t => {
                const logs = allLogs.filter(l => l.taskId === t.id && l.action === "progress").sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
                const progress = t.isDefault ? (parseInt(logs[0]?.detail || "0")) : t.progress;
                return (
                  <div key={t.id} className="space-y-1 border-b border-border pb-2 last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-medium">{t.title}</div>
                      <span className="text-xs font-bold text-primary shrink-0">{progress}%</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span>Oleh: {userName(t.assignedTo ?? "")}</span>
                        <Badge variant="secondary" className="px-1 py-0 h-3 text-[8px] uppercase font-bold">{userRole(t.assignedTo ?? "")}</Badge>
                        <span className="text-[8px] uppercase font-bold">· dari {userRole(t.createdBy)}</span>
                      </div>
                      <span className="shrink-0">{formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                );
              })}
              {tasks.filter(t => {
                if (t.isDefault) return false;
                const status = store.getUserTaskStatus(t.id, t.assignedTo!);
                return status === "in_progress" && (user.role === "admin" || t.createdBy === user.id || t.assignedTo === user.id);
              }).length === 0 && (
                <div className="py-4 text-center text-sm text-muted-foreground">Belum ada tugas yang sedang diproses.</div>
              )}
            </div>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {(user.role === "hrd" || user.role === "staff") && (
          <Card className="p-5 lg:col-span-2 shadow-(--shadow-card)">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Tugas terbaru</h2>
              <Link to="/tasks" className="text-sm text-primary hover:underline">Lihat semua</Link>
            </div>
            <div className="space-y-3">
              {recent.map((t) => {
                const status = store.getUserTaskStatus(t.id, user.id);
                return (
                  <Link
                    key={t.id}
                    to="/tasks/$taskId"
                    params={{ taskId: t.id }}
                    className="flex items-center justify-between rounded-lg border p-3 shadow-sm hover:border-primary/50 transition-colors group"
                    onClick={(e) => {
                      if (status === "unread") {
                        e.preventDefault();
                        store.markRead(t.id, user.id);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-2 w-2 rounded-full",
                        status === "unread" ? "bg-primary animate-pulse" : "bg-muted"
                      )} />
                      <div>
                        <div className="text-sm font-bold group-hover:text-primary transition-colors">{t.title}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">
                          Deadline: {formatDistanceToNow(new Date(t.deadline), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={status} />
                  </Link>
                );
              })}
              {recent.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground italic">
                  Tidak ada tugas tag terbaru.
                </div>
              )}
            </div>
          </Card>
        )}

        <Card className={cn("p-5 shadow-(--shadow-card)", (user.role === "hrd" || user.role === "staff") ? "" : "lg:col-span-3")}>
          <h2 className="text-base font-semibold mb-4">Aktivitas Tim</h2>
          <div className="space-y-4">
            {uniqueLogs.slice(0, 8).map((l) => {
              const task = tasks.find(t => t.id === l.taskId);
              const targetName = task?.isDefault ? "Seluruh Tim" : userName(task?.assignedTo);
              const targetRole = task?.isDefault ? "HR & STAFF" : userRole(task?.assignedTo);
              
              return (
                <div key={l.id} className="flex gap-3 text-sm">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0">
                    <div className="truncate">
                      <span className="font-medium text-primary">{userName(l.userId)}</span>{" "}
                      <span className="text-[10px] bg-muted px-1 py-0.5 rounded font-bold uppercase tracking-wider">{userRole(l.userId)}</span>{" "}
                      <span className="text-muted-foreground">
                        {l.action === "created" && `membuat tugas baru "${l.taskTitle}" untuk ${targetName} (${targetRole})`}
                        {l.action === "read" && `sudah membaca tugas "${l.taskTitle}"`}
                        {l.action === "progress" && `mengupdate progres tugas "${l.taskTitle}" menjadi ${l.detail}`}
                        {l.action === "done" && `telah menyelesaikan tugas "${l.taskTitle}"`}
                        {l.action === "updated" && `memperbarui rincian tugas "${l.taskTitle}"`}
                        {!["created", "read", "progress", "done", "updated"].includes(l.action) && `${actionLabel(l.action)} ${l.taskTitle}`}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(l.timestamp), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              );
            })}
            {logs.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground italic">Belum ada aktivitas tim.</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function actionLabel(a: string) {
  return {
    created: "membuat",
    read: "membaca",
    updated: "memperbarui",
    progress: "mengupdate",
    done: "menyelesaikan",
  }[a] ?? a;
}

function CreateDefaultTaskDialog() {
  const user = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;
    store.addDefaultTask(title.trim(), description.trim(), user.id);
    setOpen(false);
    setTitle("");
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" /> Tambah Tugas Default
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Tugas Default</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dt-title">Judul Tugas</Label>
            <Input
              id="dt-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Absensi Pagi"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dt-desc">Deskripsi</Label>
            <Input
              id="dt-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Penjelasan singkat..."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit">Simpan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}