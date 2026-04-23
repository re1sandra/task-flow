import { createFileRoute } from "@tanstack/react-router";
import { useStore, useCurrentUser, can } from "@/lib/mock-store";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart3, TrendingUp, Users, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_app/report")({
  head: () => ({ meta: [{ title: "Laporan — TaskControl" }] }),
  component: ReportPage,
});

function ReportPage() {
  const user = useCurrentUser();
  const tasks = useStore((s) => s.tasks || []);
  const users = useStore((s) => s.users || []);
  const checklists = useStore((s) => s.checklists || []);

  if (!user) return null;

  // Stats calculation
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === "done").length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const highPriority = tasks.filter(t => t.priority === "high").length;
  const highPriorityDone = tasks.filter(t => t.priority === "high" && t.status === "done").length;
  const highPriorityRate = highPriority > 0 ? Math.round((highPriorityDone / highPriority) * 100) : 0;

  const staffUsers = users.filter(u => u.role === "staff");
  
  const performanceData = staffUsers.map(u => {
    const userTasks = tasks.filter(t => t.assignedTo === u.id);
    const done = userTasks.filter(t => t.status === "done").length;
    const rate = userTasks.length > 0 ? Math.round((done / userTasks.length) * 100) : 0;
    
    // Checklist integration for report
    const userChecklists = checklists.filter((c: any) => true); // In a real app, checklists might be assigned to users
    
    return { name: u.name, done, total: userTasks.length, rate };
  }).sort((a, b) => b.rate - a.rate);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Laporan Performa</h1>
        <p className="text-sm text-muted-foreground">
          Analisis penyelesaian tugas dan produktivitas tim.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Total Tugas" value={totalTasks} icon={BarChart3} color="text-primary" />
        <StatsCard label="Tingkat Selesai" value={`${completionRate}%`} icon={CheckCircle2} color="text-success" />
        <StatsCard label="Prioritas Tinggi" value={highPriority} icon={TrendingUp} color="text-destructive" />
        <StatsCard label="Total Staff" value={staffUsers.length} icon={Users} color="text-info" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 shadow-(--shadow-card)">
          <h2 className="mb-6 text-lg font-semibold">Ringkasan Status</h2>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Keseluruhan Tugas</span>
                <span className="text-muted-foreground">{completedTasks} / {totalTasks}</span>
              </div>
              <Progress value={completionRate} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Prioritas Tinggi</span>
                <span className="text-muted-foreground">{highPriorityDone} / {highPriority}</span>
              </div>
              <Progress value={highPriorityRate} className="h-2 bg-muted [&>div]:bg-destructive" />
            </div>
          </div>
        </Card>

        <Card className="p-6 shadow-(--shadow-card)">
          <h2 className="mb-4 text-lg font-semibold">Performa Staff</h2>
          <div className="space-y-4">
            {performanceData.map((d, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{d.name}</span>
                  <span className="text-muted-foreground">{d.rate}% ({d.done}/{d.total})</span>
                </div>
                <Progress value={d.rate} className="h-1.5" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {can.manageUsers(user.role) && (
        <Card className="p-6 shadow-(--shadow-card)">
          <h2 className="mb-4 text-lg font-semibold">Tugas Default Aktif</h2>
          <div className="rounded-md border">
             <div className="bg-muted/50 px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
               Daftar Tugas Default dari Admin
             </div>
             <div className="divide-y">
                {tasks.filter(t => t.isDefault).map(t => (
                  <div key={t.id} className="px-4 py-3 text-sm">
                    <div className="font-medium">{t.title}</div>
                    <div className="text-xs text-muted-foreground">{t.description}</div>
                  </div>
                ))}
                {tasks.filter(t => t.isDefault).length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Belum ada tugas default yang diatur.
                  </div>
                )}
             </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function StatsCard({ label, value, icon: Icon, color }: { label: string, value: string | number, icon: any, color: string }) {
  return (
    <Card className="p-5 shadow-(--shadow-card)">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
    </Card>
  );
}
