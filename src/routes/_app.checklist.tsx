import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore, store, useCurrentUser, can } from "@/lib/mock-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/checklist")({
  head: () => ({ meta: [{ title: "Checklist — TaskControl" }] }),
  component: ChecklistPage,
});

function ChecklistPage() {
  const user = useCurrentUser();
  const checklists = useStore((s) => s.checklists || []);
  const tasks = useStore((s) => s.tasks || []);

  if (!user) return null; // Handle undefined user case

  const taskItems = user.role !== "admin" 
  ? tasks
      .filter((t) => t.assignedTo === user.id && !t.isDefault)
      .map((t) => ({
        id: t.id,
        title: `[TUGAS] ${t.title}`,
        completed: store.getUserTaskStatus(t.id, user.id) === "done",
        isTask: true,
      }))
  : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Checklist</h1>
          <p className="text-sm text-muted-foreground">
            Daftar periksa operasional dan tugas aktif Anda.
          </p>
        </div>
        {can.manageUsers(user.role) && <CreateChecklistDialog />}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Task-based Checklist (Auto-synced) */}
        {taskItems.length > 0 && (
          <Card className="p-5 border-primary/20 bg-primary/5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-primary">Tugas Aktif (Otomatis)</h2>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Sync</Badge>
            </div>
            <div className="space-y-3">
              {taskItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <Checkbox
                    id={item.id}
                    checked={item.completed}
                    onCheckedChange={() => store.updateProgress(item.id, user.id, 100)}
                  />
                  <label
                    htmlFor={item.id}
                    className={cn(
                      "text-sm font-medium leading-none cursor-pointer transition-colors",
                      item.completed ? "text-muted-foreground line-through" : "text-foreground"
                    )}
                  >
                    {item.title}
                  </label>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[10px] text-muted-foreground italic">
              * Mencentang tugas di sini akan otomatis mengubah status tugas menjadi Selesai (100%).
            </p>
          </Card>
        )}

        {checklists.map((c) => (
          <Card key={c.id} className="p-5 shadow-(--shadow-card)">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{c.title}</h2>
              {can.manageUsers(user.role) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => store.deleteChecklist(c.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="space-y-3">
              {c.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <Checkbox
                    id={item.id}
                    checked={item.completed}
                    onCheckedChange={() => store.toggleChecklistItem(c.id, item.id)}
                  />
                  <label
                    htmlFor={item.id}
                    className={`text-sm leading-none transition-colors ${
                      item.completed ? "text-muted-foreground line-through" : "font-medium"
                    }`}
                  >
                    {item.title}
                  </label>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
              <span>{c.items.filter(i => i.completed).length} dari {c.items.length} selesai</span>
              <div className="flex items-center gap-1">
                {c.items.every(i => i.completed) ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </div>
            </div>
          </Card>
        ))}
        {checklists.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <p className="text-muted-foreground text-sm">Belum ada checklist.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CreateChecklistDialog() {
  const user = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [items, setItems] = useState([""]);

  const addItem = () => setItems([...items, ""]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, val: string) => {
    const next = [...items];
    next[idx] = val;
    setItems(next);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || items.filter(i => i.trim()).length === 0) return;
    store.addChecklist(title.trim(), items.filter(i => i.trim()), user.id);
    setOpen(false);
    setTitle("");
    setItems([""]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" /> Buat checklist</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Buat checklist baru</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Nama Checklist</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Kebersihan Lantai 1" required />
          </div>
          <div className="space-y-3">
            <Label>Item Checklist</Label>
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2">
                <Input
                  value={item}
                  onChange={(e) => updateItem(idx, e.target.value)}
                  placeholder={`Item ${idx + 1}`}
                  required
                />
                {items.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="w-full" onClick={addItem}>
              <Plus className="mr-2 h-4 w-4" /> Tambah item
            </Button>
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
