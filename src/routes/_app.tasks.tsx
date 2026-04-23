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
import { cn } from "@/lib/utils";
import { useStore, useCurrentUser, store, can, type Priority, type TaskStatus } from "@/lib/mock-store";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { useEffect } from "react";

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
const userName = (id: string | number) =>
  users.find((u) => String(u.id) === String(id))?.name ?? "—";

const userRole = (id: string | number) =>
  users.find((u) => String(u.id) === String(id))?.role ?? "";

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
      // default task tetap tampil
      if (t.isDefault) return true;

      // semua role bisa lihat task yg:
      return (
        String(t.assignedTo) === String(user.id) || // ditugaskan ke dia
        String(t.createdBy) === String(user.id)     // dia yg buat
      );
    })
    .filter((t) => {
        const realStatus = store.getUserTaskStatus(t.id, user.id);
        return status === "all" ? true : realStatus === status;
      })
      .filter((t) => (q ? t.title.toLowerCase().includes(q.toLowerCase()) : true))
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [storeTasks, status, q, user]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tugas</h1>
          <p className="text-sm text-muted-foreground">
            {can.viewAllTasks(user.role) ? "Semua tugas tim." : "Tugas yang ditugaskan kepada Anda."}
          </p>
        </div>
        {can.createTask(user.role) && <CreateTaskDialog />}
      </div>

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
                <TableHead>Deadline</TableHead>
                <TableHead>Prioritas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Progress</TableHead>
                {user.role === "admin" && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
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
                  new Date(t.deadline) < new Date();
                return (
                  <TableRow key={`task-row-${t.id}`} className="cursor-pointer">
                    <TableCell className="font-medium">
                      <button
                        className={cn(
                          "font-medium text-left hover:underline relative",
                          (realStatus === "unread") && !(user.role === "admin" && t.isDefault) && "after:content-['(klik\ untuk\ buka)'] after:ml-2 after:text-[10px] after:text-muted-foreground"
                        )}
                        onClick={() => {
                          setOpenTaskId(openTaskId === t.id ? null : t.id);

                          const isAdminOnDefault = user.role === "admin" && t.isDefault;

                          if (realStatus === "unread" && !isAdminOnDefault) {
                            store.markRead(t.id, user.id);
                          }
                        }}
                      >
                        {t.title}
                      </button>
                    {openTaskId === t.id && (
                      <div className="mt-2 text-sm text-muted-foreground bg-muted p-3 rounded">
                        {t.description}
                      </div>
                    )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                        {t.isDefault ? (
                          <>
                            <span>Seluruh Tim</span>
                            <span className="text-[8px] bg-primary/10 px-1 ml-1 rounded">
                              HR & STAFF
                            </span>
                          </>
                        ) : (
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {t.assignedTo
  ? userName(t.assignedTo)
  : "Belum ditentukan"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              dari {userRole(t.createdBy).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </TableCell>
                    <TableCell className={overdue ? "text-destructive font-medium" : "text-muted-foreground"}>
                      {t.deadline ? format(new Date(t.deadline), "dd MMM yyyy") : "—"}
                    </TableCell>
                    <TableCell><PriorityBadge priority={t.priority} /></TableCell>
                    <TableCell>
                      {user.role === "admin" && t.isDefault ? (
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-bold uppercase tracking-tighter py-0 h-5">
                          Broadcast
                        </Badge>
                      ) : (
                        <StatusBadge status={realStatus} />
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{realProgress}%</TableCell>
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
              new Date(t.deadline) < new Date();
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
                    <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1.5">
                      {t.isDefault ? (
                        <>
                          <span>Assignee: Seluruh Tim</span>
                          <span className="text-[8px] bg-primary/10 px-1 py-0 rounded text-primary font-bold uppercase tracking-wider">
                            HR & STAFF
                          </span>
                        </>
                      ) : (
                        <>
                          <span>Assignee: {t.assignedTo
  ? userName(t.assignedTo)
  : "Belum ditentukan"}</span>
                          <span className="text-[8px] bg-muted px-1 py-0 rounded font-bold uppercase tracking-wider">
                            {userRole(t.assignedTo ?? "")}
                          </span>
                          <span className="ml-1 text-[10px] text-muted-foreground">
                            · dari {userRole(t.createdBy).toUpperCase()}
                          </span>
                        </>
                      )}
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
                      {format(new Date(t.deadline), "dd MMM")}
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
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [deadline, setDeadline] = useState(format(new Date(Date.now() + 3 * 86400000), "yyyy-MM-dd"));
  const [priority, setPriority] = useState<Priority>("medium");

  const submit = (e: React.FormEvent) => {
  e.preventDefault();

  console.log("ASSIGNED TO:", assignedTo);
  console.log("USERS:", users);

  if (!user || !title.trim() || !assignedTo) {
    alert("Assign user dulu!");
    return;
  }

  store.createTask({
    title: title.trim(),
    description: description.trim(),
    createdBy: user.id,
    assignedTo,
    deadline: new Date(deadline)
      .toISOString()
      .slice(0, 19)
      .replace("T", " "),
    priority,
  });
    setOpen(false);
    setTitle(""); setDescription("");
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Assign ke</Label>
                            <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                    {(() => {
                      const u = users.find((u) => String(u.id) === String(assignedTo));
                      return u ? (
                        <div className="flex items-center gap-2">
                          <span>{u.name}</span>
                          <span className="text-[10px] bg-muted px-1 py-0.5 rounded">
                            {u.role}
                          </span>
                        </div>
                      ) : (
                        <span>Pilih user</span>
                      );
                    })()}
                  </SelectTrigger>
                <SelectContent>
                  {users
                  .filter((u) => u.role !== "admin") // ⛔ block admin
                  .reduce((acc: typeof users, curr) => {
                    if (!acc.find(u => String(u.id) === String(curr.id))) acc.push(curr);
                    return acc;
                  }, [])
                  .map((u) => (
                    <SelectItem key={`assign-user-${u.id}`} value={String(u.id)}>
                      {u.name} ({u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="deadline">Deadline</Label>
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