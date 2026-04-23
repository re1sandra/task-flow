import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, ListChecks, CheckSquare, BarChart3, Users, Bell, LogOut, User as UserIcon, Camera } from "lucide-react";
import { useEffect, useState } from "react";
import { useCurrentUser, useStore, store, can } from "@/lib/mock-store";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { getTaskStatus } from "@/lib/task-status";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDistanceToNow } from "date-fns";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  soon?: boolean;
  adminOnly?: boolean;
};

const nav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tasks", label: "Tugas", icon: ListChecks },
  { to: "/checklist", label: "Checklist", icon: CheckSquare },
  { to: "/report", label: "Report", icon: BarChart3 },
  { to: "/users", label: "User Management", icon: Users, adminOnly: true },
];

export function AppShell() {
  const user = useCurrentUser();
  const users = useStore((s) => s.users);
  const tasks = useStore((s) => s.tasks);
  const notifications = useStore((s) => s.notifications || []);
  const logs = useStore((s) => s.logs || []);
  
  const myNotifications = user ? notifications.filter(n => String(n.userId) === String(user.id)) : [];
  const unreadNotifications = myNotifications.filter(n => !n.isRead).length;
  const unreadAssigned = user ? tasks.filter(
    (t) => String(t.assignedTo) === String(user.id) && getTaskStatus(t.id, user.id, logs) === "unread"
  ).length : 0;
  
  const location = useLocation();
  const navigate = useNavigate();

  // Profile Edit State
  const [editName, setEditName] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [initialized, setInitialized] = useState(false);

 const [loadingApp, setLoadingApp] = useState(true);

  const handleLogout = () => {
    store.logout();
    navigate({ to: "/" });
  };

  useEffect(() => {
    const init = async () => {
      setLoadingApp(true);
      await store.hydrate();
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        await Promise.all([
          store.fetchTasks(),
          store.fetchChecklists(),
          store.fetchLogs(),
          store.fetchNotifications() // ✅ Fetch notifications on init
        ]);
      }
      setLoadingApp(false);
    };
    init();

    // ✅ Tambahkan polling setiap 3 detik agar notifikasi "langsung masuk"
     const poll = setInterval(() => {
       const savedUser = localStorage.getItem("user");
       if (savedUser) {
         store.fetchNotifications();
         store.fetchTasks();
       }
     }, 3000);

    return () => clearInterval(poll);
  }, []);

  if (loadingApp) return null;

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-sm p-8 text-center shadow-lg animate-in fade-in zoom-in duration-300">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LogOut className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Sesi Berakhir</h2>
          <p className="mt-2 text-muted-foreground">
            Sesi Anda telah habis atau Anda telah keluar. Silakan masuk kembali untuk melanjutkan.
          </p>
          <Button asChild className="mt-6 w-full" size="lg">
            <Link to="/">Kembali ke Login</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const handleUpdateProfile = () => {
    store.updateProfile(user.id, editName, editAvatar);
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      {/* Mobile Top Header */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-card px-4 shadow-sm md:h-16 md:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary shadow-sm">
            <CheckSquare className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold tracking-tight text-foreground">TaskControl</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notifications Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="relative rounded-full p-1 hover:bg-accent transition-colors">
                <Bell className="h-5 w-5 text-muted-foreground" />
                {!initialized && unreadNotifications > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground ring-2 ring-background">
                    {unreadNotifications}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="border-b p-3 font-semibold text-sm flex justify-between items-center">
                Notifikasi
                {unreadNotifications > 0 && (
                  <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-bold uppercase">
                    {unreadNotifications} Baru
                  </span>
                )}
              </div>
              <div className="max-h-80 overflow-auto divide-y">
                {myNotifications.map((n) => (
                  <Link
                    key={n.id}
                    to={n.link as any}
                    onClick={() => store.markNotificationRead(n.id)}
                    className={cn(
                      "block p-3 text-sm hover:bg-accent transition-colors",
                      !n.isRead && "bg-primary/5"
                    )}
                  >
                    <div className="font-medium mb-0.5">{n.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">{n.message}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}
                    </div>
                  </Link>
                ))}
                {myNotifications.length === 0 && (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    Tidak ada notifikasi.
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
          
          {/* User Info (Name + Role) */}
<div className="hidden sm:flex flex-col text-right leading-tight mr-1">
  <span className="text-xs font-semibold text-foreground truncate max-w-[120px]">
    {user.name}
  </span>
  <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wide">
    {user.role}
  </span>
</div>
          {/* User selection removed for production-like feel */}
          
          {/* Profile Sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <button className="rounded-full ring-2 ring-primary/10 transition-transform active:scale-95">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                    {!initialized ? user.name.split(" ").slice(0, 2).map((n) => n[0]).slice(0, 2).join("") : "?"}
                  </AvatarFallback>
                </Avatar>
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-75 sm:w-100">
              <SheetHeader>
                <SheetTitle>Profil Saya</SheetTitle>
              </SheetHeader>
              <div className="mt-8 space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative group">
                    <Avatar className="h-24 w-24 ring-4 ring-primary/5">
                      <AvatarImage src={editAvatar} />
                      <AvatarFallback className="text-2xl font-bold bg-primary/5 text-primary">
                        {user.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Camera className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-lg">{user.name}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mt-1">
                      {user.role}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama Lengkap</Label>
                    <Input 
                      id="name" 
                      value={editName} 
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="avatar">URL Foto Profil</Label>
                    <Input 
                      id="avatar" 
                      placeholder="https://example.com/photo.jpg"
                      value={editAvatar}
                      onChange={(e) => setEditAvatar(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4">
                  <div className="bg-accent/50 p-3 rounded-lg text-center">
                    <div className="text-xl font-bold">{tasks.filter(t => String(t.assignedTo) === String(user.id)).length}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">Tugas</div>
                  </div>
                  <div className="bg-accent/50 p-3 rounded-lg text-center">
                    <div className="text-xl font-bold text-success">
                      {tasks.filter(t => String(t.assignedTo) === String(user.id) && t.status === "done").length}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase">Selesai</div>
                  </div>
                </div>
              </div>
              <SheetFooter className="mt-8">
                <Button className="w-full" onClick={handleUpdateProfile}>Simpan Perubahan</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop Sidebar (hidden on mobile) */}
        <aside className="hidden w-64 shrink-0 border-r border-border bg-card md:flex md:flex-col">
          <nav className="flex-1 space-y-1 p-3">
            {nav.map((item) => {
              if (item.adminOnly && !can.manageUsers(user.role)) return null;
              const active = location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to as never}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="flex-1">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-border p-3">
            <button 
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 pb-20 md:pb-0">
          <div className="mx-auto max-w-7xl p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 z-40 flex w-full items-center justify-around border-t bg-card/80 p-1 backdrop-blur-lg md:hidden">
        {nav.map((item) => {
          if (item.adminOnly && !can.manageUsers(user.role)) return null;
          const active = location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to as never}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-lg py-2 transition-all active:scale-90",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className={cn("h-5 w-5", active && "animate-in zoom-in-50")} />
              <span className="text-[10px] font-medium tracking-tight">{item.label}</span>
              {active && <div className="h-1 w-1 rounded-full bg-primary" />}
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex flex-1 flex-col items-center gap-1 py-2 text-muted-foreground active:scale-90"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-[10px] font-medium tracking-tight">Keluar</span>
        </button>
      </nav>
    </div>
  );
}
