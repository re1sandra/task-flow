import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { CheckSquare, ShieldCheck, Activity, Users, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { store, useCurrentUser, useStore } from "@/lib/mock-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Masuk — TaskControl" },
      { name: "description", content: "Sistem manajemen tugas dan delegasi tim untuk transparansi kerja." },
    ],
  }),
  component: Login,
});


function Login() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const allUsers = useStore((s) => s.users);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate({ to: "/dashboard" });
    }
    store.fetchUsers();
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("http://localhost:3000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

            if (res.ok) {
        const user = data.user;
        localStorage.setItem("user", JSON.stringify(user)); // 🔥 Simpan data user lengkap
        if (data.token) {
          localStorage.setItem("token", data.token);
        }

        store.login(user);

        await store.fetchUsers(); // 🔥 penting

        navigate({ to: "/dashboard" });
      } else {
        setError(data.message || "Gagal masuk. Silakan cek kembali email dan kata sandi Anda.");
      }
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan pada server. Pastikan backend sudah berjalan.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemo = (userId: string) => {
    const selected = allUsers.find(u => String(u.id) === userId);
    if (selected) {
      setEmail(selected.email);
      setPassword("password123"); // Assuming default password for demo
      setError(null);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between p-12 text-primary-foreground lg:flex" style={{ background: "var(--gradient-primary)" }}>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/15 backdrop-blur">
            <CheckSquare className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">TaskControl</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">Transparansi total untuk setiap tugas tim Anda.</h1>
          <p className="mt-4 max-w-md text-base text-primary-foreground/80">
            Pantau siapa membuat, membaca, mengerjakan, dan menyelesaikan setiap tugas — secara real-time, tanpa bergantung pada laporan manual.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 max-w-md">
            <Feature icon={Activity} title="Tracking real-time" />
            <Feature icon={ShieldCheck} title="Audit trail" />
            <Feature icon={Users} title="Role-based access" />
            <Feature icon={CheckSquare} title="CRUD lengkap" />
          </div>
        </div>
        <p className="text-xs text-primary-foreground/60">© {new Date().getFullYear()} TaskControl Demo</p>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <Card className="w-full max-w-md p-8 shadow-(--shadow-card)">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Masuk ke akun Anda</h2>
            <p className="mt-1 text-sm text-muted-foreground">Gunakan akun demo atau daftar baru.</p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                type="email"
                placeholder="email@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Kata Sandi</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  placeholder="••••••••"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Coba Akun Demo</Label>
              <Select onValueChange={handleSelectDemo}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Role Demo" />
                </SelectTrigger>
                <SelectContent>
                  {allUsers
                    .reduce((acc: any[], current) => {
                      const x = acc.find(item => String(item.id) === String(current.id));
                      if (!x) {
                        return acc.concat([current]);
                      } else {
                        return acc;
                      }
                    }, [])
                    .map((u) => (
                      <SelectItem key={`demo-user-${u.id}`} value={String(u.id)}>
                        {u.name} ({u.role.toUpperCase()})
                      </SelectItem>
                  ))}
                  {allUsers.length === 0 && (
                    <SelectItem value="none" disabled>Memuat data...</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Memproses..." : "Masuk"}
            </Button>

            <p className="text-center text-sm mt-4">
              Belum punya akun?{" "}
              <Link to="/register" className="text-primary underline font-medium">
                Daftar Sekarang
              </Link>
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-white/10 p-3 backdrop-blur">
      <Icon className="h-4 w-4" />
      <span className="text-sm font-medium">{title}</span>
    </div>
  );
}
