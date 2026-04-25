import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,} from "@/components/ui/dialog";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, parseDate } from "@/lib/utils";
import { useStore, useCurrentUser, store, can, type Priority, type TaskStatus } from "@/lib/mock-store";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { useEffect } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

export const Route = createFileRoute("/_app/tasks")({
  head: () => ({ meta: [{ title: "Tugas — TaskControl" }] }),
  component: TasksPage,
});

function TasksPage() {
  const user = useCurrentUser();
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const storeTasks = useStore((s) => s.tasks || []);
  const users = useStore((s) => s.users || []);

  if (!user) return null; // Handle undefined user case

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<TaskStatus | "all">("all");

  const handleDelete = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus tugas ini?")) {
      store.deleteTask(id);
    }
  };

  useEffect(() => {
    if (!user) return;
    store.fetchUsers();
    store.fetchTasks();
  }, [user]);

  // ✅ YANG BARU (fix type mismatch)
const userName = (id?: string | number) =>
  users.find((u) => String(u.id) === String(id))?.name ?? "—";

  const [assignedTo, setAssignedTo] = useState<string>("");

  useEffect(() => {
  const nonAdminUsers = users.filter(u => u.role !== "admin");

  if (nonAdminUsers.length > 0 && !assignedTo) {
    setAssignedTo(String(nonAdminUsers[0].id));
  }
}, [users, assignedTo]);

 const filtered = useMemo(() => {
  return storeTasks
    .filter((t) => {
      // Exclude default tasks from main list as per request
      if (t.isDefault) return false;

      if (user.role === "admin") return true; 

      const isAssignedToMe = String(t.assignedTo) === String(user.id);
      const isAssignedToMyRole = t.assignedRole === user.role;
      const isCreatedByMe = String(t.createdBy) === String(user.id);
      const isPartOfMixedTeam = t.assignedTo?.includes(',') && t.assignedTo.split(',').includes(String(user.id));

      return isAssignedToMe || isAssignedToMyRole || isCreatedByMe || isPartOfMixedTeam;
    })
    .filter((t) => {
  const targetUserId =
    user.role === "admin"
      ? (t.assignedTo ?? user.id) // admin lihat status user yang ditugaskan atau dirinya sendiri
      : user.id;

  const realStatus = store.getUserTaskStatus(t.id, targetUserId);

  return status === "all" ? true : realStatus === status;
})
      .filter((t) => (q ? t.title.toLowerCase().includes(q.toLowerCase()) : true))
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [storeTasks, status, q, user]);

  console.log("TASKS:", storeTasks);
console.log("CURRENT USER:", user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daftar Tugas</h1>
          <p className="text-sm text-muted-foreground">
            Kelola dan pantau semua tugas Anda di sini.
          </p>
        </div>
        {can.createTask(user.role) && <CreateTaskDialog />}
      </div>

      <Card className="bg-primary/5 border-primary/20 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-1 bg-primary/10 p-1.5 rounded-full">
            <Search className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-primary">Tips Pembaruan Status:</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Anda juga bisa mendapatkan status <span className="font-bold text-orange-600">"Sedang Dikerjakan"</span> atau <span className="font-bold text-green-600">"Selesai"</span> secara otomatis dengan mencentang item pekerjaan di menu <span className="font-bold text-primary underline">Checklist</span> pada navigasi sebelah kiri.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4 shadow-(--shadow-card)">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari tugas..." className="pl-9" />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus | "all")}>
            <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua status</SelectItem>
              <SelectItem value="unread">Belum dibaca</SelectItem>
              <SelectItem value="read">Sudah dibaca</SelectItem>
              <SelectItem value="in_progress">Sedang dikerjakan</SelectItem>
              <SelectItem value="done">Selesai</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Desktop Table View */}
        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Judul</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Waktu Kirim Tugasnya</TableHead>
                <TableHead>Prioritas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Progress</TableHead>
                {user.role === "admin" && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => {
                const targetUserId = t.assignedTo ?? "";

                // NEW: Helper to get relevant users for a task
                const getRelevantUsers = () => {
                  return users.filter(u => {
                    if (t.isDefault) return u.role === 'hrd' || u.role === 'staff';
                    if (t.assignedRole) return u.role === t.assignedRole;
                    if (t.assignedTo?.includes(',')) return t.assignedTo.split(',').includes(String(u.id));
                    if (t.assignedTo) return String(t.assignedTo) === String(u.id);
                    return false;
                  });
                };

                const isTeamTask = t.isDefault || t.assignedRole || t.assignedTo?.includes(',');
                
                const realStatus = store.getUserTaskStatus(
                  t.id,
                  user.role === "admin" ? targetUserId : user.id
                );

                // Calculate real progress (Always per-individual for current user)
                const realProgress = store.getUserTaskProgress(t.id, user.id);

                // NEW: Team Status Summary for Admin (Keep for monitoring)
                const getTeamStatusSummary = () => {
                  if (user.role !== "admin" || !isTeamTask) return null;
                  const relevantUsers = getRelevantUsers();
                  const doneCount = relevantUsers.filter(u => store.getUserTaskStatus(t.id, u.id) === "done").length;
                  const inProgressCount = relevantUsers.filter(u => store.getUserTaskStatus(t.id, u.id) === "in_progress").length;
                  return { done: doneCount, inProgress: inProgressCount, total: relevantUsers.length };
                };

                const teamSummary = getTeamStatusSummary();

                const overdue =
                  realStatus !== "done" &&
                  t.deadline &&
                  (() => {
                    const d = parseDate(t.deadline);
                    return d ? d < new Date() : false;
                  })();
                return (
                  <TableRow key={`task-row-${t.id}`} className="cursor-pointer">
                    <TableCell className="font-medium">
                      <button
                        className={cn(
                          "font-medium text-left hover:underline relative",
                          (realStatus === "unread") && !(user.role === "admin" && (t.isDefault || t.assignedRole)) && "after:content-['(klik\ untuk\ buka)'] after:ml-2 after:text-[10px] after:text-muted-foreground"
                        )}
                        onClick={() => {
                          setOpenTaskId(openTaskId === t.id ? null : t.id);

                          const isAdminOnDefaultOrTeam = user.role === "admin" && (t.isDefault || t.assignedRole);

                          if (realStatus === "unread" && !isAdminOnDefaultOrTeam) {
                            store.markRead(t.id, user.id);
                          }
                        }}
                      >
                        {t.title}
                      </button>
                    {openTaskId === t.id && (
                      <div className="mt-2 text-sm text-muted-foreground bg-muted p-3 rounded space-y-3">
                        <div>
                          <p className="font-semibold text-foreground mb-1">Deskripsi:</p>
                          <p>{t.description || "Tidak ada deskripsi."}</p>
                        </div>

                        {user.role !== "admin" && realStatus !== "done" && (
                          <div className="pt-2 border-t space-y-3">
                            <p className="font-semibold text-foreground text-xs uppercase tracking-wider">Update Progress:</p>
                            <div className="flex flex-wrap gap-2">
                              {realStatus !== "in_progress" ? (
                                <Button 
                                  size="sm" 
                                  className="h-8 text-[11px] bg-indigo-600 hover:bg-indigo-700"
                                  onClick={() => store.markInProgress(t.id, user.id)}
                                >
                                  Mulai Kerjakan
                                </Button>
                              ) : (
                                <>
                                  {[25, 50, 75].map((p) => (
                                    <Button
                                      key={p}
                                      size="sm"
                                      variant={realProgress === p ? "default" : "outline"}
                                      className="h-8 text-[11px] px-3"
                                      onClick={() => store.updateProgress(t.id, user.id, p)}
                                    >
                                      {p}%
                                    </Button>
                                  ))}
                                  <Button 
                                    size="sm" 
                                    className="h-8 text-[11px] bg-green-600 hover:bg-green-700"
                                    onClick={() => store.updateProgress(t.id, user.id, 100)}
                                  >
                                    Selesai
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {user.role === "admin" && isTeamTask && (
                          <div className="border-t pt-2">
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-semibold text-foreground text-xs uppercase tracking-wider">Detail Monitoring Tim:</p>
                              <div className="flex gap-2 text-[9px] uppercase font-bold">
                                <span className="text-green-600">Selesai: {teamSummary?.done}</span>
                                <span className="text-orange-500">Proses: {teamSummary?.inProgress}</span>
                                <span className="text-muted-foreground">Total: {teamSummary?.total}</span>
                              </div>
                            </div>
                            
                            <div className="space-y-4">
                              {/* Grouping by status for better visibility */}
                              {[
                                { label: "Sedang Mengerjakan", status: ["in_progress"], color: "text-orange-500" },
                                { label: "Selesai", status: ["done"], color: "text-green-600" },
                                { label: "Belum Mulai", status: ["unread", "read"], color: "text-muted-foreground" }
                              ].map(group => {
                                const groupUsers = getRelevantUsers().filter(u => 
                                  group.status.includes(store.getUserTaskStatus(t.id, u.id))
                                );
                                
                                if (groupUsers.length === 0) return null;

                                return (
                                  <div key={group.label} className="space-y-1.5">
                                    <div className={cn("text-[10px] font-bold uppercase tracking-tight flex items-center gap-2", group.color)}>
                                      {group.label} ({groupUsers.length})
                                      <div className="h-[1px] flex-1 bg-current opacity-20" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                      {groupUsers.map(u => {
                                        const uStatus = store.getUserTaskStatus(t.id, u.id);
                                        const uProgress = store.getUserTaskProgress(t.id, u.id);
                                        return (
                                          <div key={`monitor-${u.id}`} className="flex items-center justify-between bg-background/50 p-2 rounded border text-[11px] hover:border-primary/30 transition-colors">
                                            <div className="flex flex-col min-w-0">
                                              <span className="font-medium text-foreground truncate">{u.name}</span>
                                              <span className="text-[9px] uppercase opacity-70">{u.role}</span>
                                            </div>
                                            <div className="flex flex-col items-end gap-0.5 shrink-0 ml-2">
                                              <StatusBadge status={uStatus} />
                                              <span className="font-bold text-[10px]">{uProgress}%</span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                        {t.isDefault ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Penerima:</span>
                              <span className="text-[10px] font-semibold uppercase">Seluruh Tim (HR & STAFF)</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Pengirim:</span>
                              <span className="text-[10px] font-semibold uppercase">{userName(t.createdBy)}</span>
                            </div>
                          </div>
                        ) : t.assignedRole ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Penerima:</span>
                              <span className="text-[10px] font-semibold uppercase text-primary">Tim {t.assignedRole.toUpperCase()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Pengirim:</span>
                              <span className="text-[10px] font-semibold uppercase">{userName(t.createdBy)}</span>
                            </div>
                          </div>
                        ) : t.assignedTo?.includes(',') ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Penerima:</span>
                              <span className="text-[10px] font-semibold uppercase text-indigo-600">Tim Campuran</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Pengirim:</span>
                              <span className="text-[10px] font-semibold uppercase">{userName(t.createdBy)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Penerima:</span>
                              <span className="text-[10px] font-semibold uppercase">
                                {t.assignedTo ? userName(t.assignedTo) : "Belum ditentukan"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Pengirim:</span>
                              <span className="text-[10px] font-semibold uppercase">{userName(t.createdBy)}</span>
                            </div>
                          </div>
                        )}
                      </TableCell>
                    <TableCell className={overdue ? "text-destructive font-medium" : "text-muted-foreground"}>
                      {(() => {
                        const d = parseDate(t.deadline);
                        return d ? format(d, "dd MMM yyyy") : "—";
                      })()}
                    </TableCell>
                    <TableCell><PriorityBadge priority={t.priority} /></TableCell>
                    <TableCell>
                      {user.role === "admin" && isTeamTask ? (
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-bold uppercase tracking-tighter py-0 h-5 w-fit">
                            {t.isDefault ? "Broadcast" : "Team Task"}
                          </Badge>
                          {teamSummary && (
                            <div className="text-[10px] font-medium text-muted-foreground">
                              <span className="text-green-600">{teamSummary.done}</span>/
                              <span className="text-orange-500">{teamSummary.inProgress}</span>/
                              <span>{teamSummary.total}</span> Selesai
                            </div>
                          )}
                        </div>
                      ) : (
                        <StatusBadge status={realStatus} />
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-bold">{realProgress}%</span>
                        {user.role === "admin" && isTeamTask && (
                          <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all duration-500" 
                              style={{ width: `${realProgress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    {user.role === "admin" && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDelete(t.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="space-y-3 md:hidden">
          {filtered.map((t) => {
            const targetUserId = t.assignedTo ?? "";

            const realStatus = store.getUserTaskStatus(
              t.id,
              user.role === "admin" ? targetUserId : user.id
            );

            const realProgress = store.getUserTaskProgress(
              t.id,
              user.role === "admin" ? targetUserId : user.id
            );

            const overdue =
              realStatus !== "done" &&
              t.deadline &&
              (() => {
                const d = parseDate(t.deadline);
                return d ? d < new Date() : false;
              })();
            return (
              <Link
                key={`task-card-${t.id}`}
                to="/tasks/$taskId"
                params={{ taskId: t.id }}
                className={cn(
                  "block rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-accent/50 active:bg-accent",
                  overdue && "border-destructive/50 bg-destructive/5"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground truncate">{t.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Penerima:</span>
                        <span className="text-[10px] font-semibold uppercase">
                          {t.isDefault ? "Seluruh Tim (HR & STAFF)" : t.assignedRole ? `Tim ${t.assignedRole.toUpperCase()}` : t.assignedTo?.includes(',') ? "Tim Campuran" : userName(t.assignedTo)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Pengirim:</span>
                        <span className="text-[10px] font-semibold uppercase">
                          {userName(t.createdBy)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {user.role === "admin" && t.isDefault ? (
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-bold uppercase tracking-tighter py-0 h-5">
                      Broadcast
                    </Badge>
                  ) : (
                    <StatusBadge status={realStatus} />
                  )}
                </div>
                
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={t.priority} />
                    <div className={cn("text-xs", overdue ? "font-bold text-destructive" : "text-muted-foreground")}>
                      {(() => {
                        const d = parseDate(t.deadline);
                        return d ? format(d, "dd MMM") : "—";
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-bold text-primary">{realProgress}%</div>
                    {user.role === "admin" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete(t.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Tidak ada tugas yang cocok.
          </div>
        )}
      </Card>
    </div>
  );
}

function CreateTaskDialog() {
  const user = useCurrentUser();
  const users = useStore((s) => s.users);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignmentType, setAssignmentType] = useState<"individual" | "team" | "mixed">("individual");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [assignedRole, setAssignedRole] = useState<string>("staff");
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  const [deadline, setDeadline] = useState(format(new Date(Date.now() + 3 * 86400000), "yyyy-MM-dd"));
  const [priority, setPriority] = useState<Priority>("medium");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return null;

    if (assignmentType === "individual" && !assignedTo) {
      alert("Pilih user dulu!");
      return;
    }

    if (assignmentType === "mixed" && assignedUserIds.length === 0) {
      alert("Pilih minimal satu user untuk tim campuran!");
      return;
    }

    store.createTask({
      title: title.trim(),
      description: description.trim(),
      createdBy: user.id,
      assignedTo: assignmentType === "individual" ? String(assignedTo) : undefined,
      assignedRole: assignmentType === "team" ? (assignedRole as any) : undefined,
      assignedUserIds: assignmentType === "mixed" ? assignedUserIds : undefined,
      deadline: deadline,
      priority,
    });

    setOpen(false);
    setTitle(""); 
    setDescription("");
    setAssignedTo("");
    setAssignedUserIds([]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" /> Buat tugas</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Buat tugas baru</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Judul</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Deskripsi</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <div className="space-y-2">
            <Label>Tipe Penugasan</Label>
            <Select value={assignmentType} onValueChange={(v: any) => setAssignmentType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individu (Satu Orang)</SelectItem>
                <SelectItem value="team">Tim (Berdasarkan Role)</SelectItem>
                <SelectItem value="mixed">Tim Campuran (Pilih Manual)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {assignmentType === "individual" && (
            <div className="space-y-2">
              <Label>Ditugaskan ke</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger><SelectValue placeholder="Pilih user" /></SelectTrigger>
                <SelectContent>
                  {users
                    .filter((u) => u.role !== "admin")
                    .map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.name} ({u.role.toUpperCase()})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {assignmentType === "team" && (
            <div className="space-y-2">
              <Label>Pilih Tim (Role)</Label>
              <Select value={assignedRole} onValueChange={setAssignedRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Tim STAFF</SelectItem>
                  <SelectItem value="hrd">Tim HRD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {assignmentType === "mixed" && (
            <div className="space-y-2">
              <Label>Pilih Anggota Tim Campuran</Label>
              <Card className="p-3">
                <ScrollArea className="h-40">
                  <div className="space-y-3">
                    {users
                      .filter((u) => u.role !== "admin")
                      .map((u) => (
                        <div key={`mixed-${u.id}`} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`user-${u.id}`}
                            checked={assignedUserIds.includes(String(u.id))}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setAssignedUserIds([...assignedUserIds, String(u.id)]);
                              } else {
                                setAssignedUserIds(assignedUserIds.filter(id => id !== String(u.id)));
                              }
                            }}
                          />
                          <label 
                            htmlFor={`user-${u.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {u.name} <span className="text-[10px] text-muted-foreground uppercase ml-1">({u.role})</span>
                          </label>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </Card>
            </div>
          )}

          <div className="space-y-2">
            <Label>Prioritas</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="deadline">Waktu Kirim Tugasnya</Label>
            <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit">Simpan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}