import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/register")({
  component: Register,
});

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [role, setRole] = useState("staff"); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Note: Admin registration is disabled.
    // Use hardcoded admin credentials to login:
    // Email: admincontrol@gmail.com
    // Password: admincontr0ll

    try {
      const res = await fetch("http://localhost:3000/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Register berhasil!");
        navigate({ to: "/" }); // balik ke login
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md p-8">
        <h2 className="text-2xl font-bold mb-6">Register</h2>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <Label>Nama</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

        <div>
        <Label htmlFor="role">Role</Label>
        <select
            id="role"
            title="Pilih role user"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full border rounded-md p-2"
        >
            <option value="staff">Staff</option>
            <option value="hrd">HRD</option>
        </select>
        </div>

          {/* 
            Hardcoded Admin Credentials:
            Email: admincontrol@gmail.com
            Password: admincontr0ll
          */}

          <div>
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="relative">
            <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
            />

            <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
            >
                {showPassword ? "🙈" : "👁️"}
            </button>
            </div>

          <Button type="submit" className="w-full">Daftar</Button>
        </form>

        <p className="text-sm text-center mt-4">
          Sudah punya akun?{" "}
          <Link to="/" className="text-primary underline">
            Login
          </Link>
        </p>

        <div className="mt-6 pt-6 border-t text-center">
          <p className="text-xs text-muted-foreground">
            Khusus Admin, silakan langsung login menggunakan akun yang sudah tersedia.
          </p>
        </div>
      </Card>
    </div>
  );
}