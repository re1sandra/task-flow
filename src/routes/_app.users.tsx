import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2, Database, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useStore, useCurrentUser, can, store } from "@/lib/mock-store";

export const Route = createFileRoute("/_app/users")({
  head: () => ({ meta: [{ title: "User Management — TaskControl" }] }),
  component: UsersPage,
});

function UsersPage() {
  const user = useCurrentUser();
  const users = useStore((s) => s.users);
  const tasks = useStore((s) => s.tasks);

  if (!user) return null; // Handle undefined user case

  if (!can.manageUsers(user.role)) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Hanya Admin yang dapat mengakses User Management.</p>
        <Link to="/dashboard" className="mt-4 inline-block text-primary hover:underline">← Kembali ke Dashboard</Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-sm text-muted-foreground">Anggota tim dan ringkasan beban kerja.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {users.map((u) => {
          const assigned = tasks.filter((t) => t.assignedTo === u.id);
          const done = assigned.filter((t) => t.status === "done").length;
          return (
            <Card key={u.id} className="p-5 shadow-(--shadow-card)">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {u.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate font-semibold">{u.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                </div>
                <Badge variant="secondary" className="ml-auto uppercase">{u.role}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-md bg-muted p-2">
                  <div className="text-lg font-bold">{assigned.length}</div>
                  <div className="text-xs text-muted-foreground">Total tugas</div>
                </div>
                <div className="rounded-md bg-muted p-2">
                  <div className="text-lg font-bold text-success">{done}</div>
                  <div className="text-xs text-muted-foreground">Selesai</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-12 space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-destructive">
          <Database className="h-5 w-5" />
          Sistem & Database
        </h2>
        <Card className="border-destructive/20 bg-destructive/5 p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-semibold text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Zona Berbahaya
              </div>
              <p className="text-sm text-muted-foreground">
                Menghapus semua data tugas, log aktivitas, dan checklist secara permanen dari browser ini.
              </p>
            </div>
            <Button 
              variant="destructive" 
              onClick={() => store.resetData()}
              className="shrink-0"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Reset Semua Data
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
