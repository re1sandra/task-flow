// Simple in-memory mock store with React subscription.
// All data is dummy — replace with backend later.
import { useSyncExternalStore } from "react";

export type Role = "admin" | "hrd" | "staff";
export type Priority = "low" | "medium" | "high";
export type TaskStatus = "unread" | "read" | "in_progress" | "done";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  deadline: string;
  priority: Priority;
  createdAt: string;
  isDefault?: boolean;
  readAt?: string;
  status: TaskStatus;
  progress: number;
  assignedTo?: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface Checklist {
  id: string;
  title: string;
  items: ChecklistItem[];
  createdAt: string;
  createdBy: string; // user id
}

export interface ActivityLog {
  id: string;
  taskId: string;
  taskTitle: string;
  userId: string;
  action: "created" | "read" | "updated" | "done" | "progress";
  detail?: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  timestamp: string;
}

interface State {
  currentUserId: string;
  users: User[];
  tasks: Task[];
  logs: ActivityLog[];
  checklists: Checklist[];
  notifications: Notification[];
}

type CreateTaskInput = {
  title: string;
  description: string;
  createdBy: string;
  assignedTo?: string;
  priority: Priority;
  deadline: string;
};

const now = new Date();
const inDays = (d: number) => new Date(now.getTime() + d * 86400000).toISOString();
const ago = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

const STORAGE_KEY = "taskflow_data_v1";

const isServer = typeof window === "undefined";

function getInitialState(): State {
  let user = null;
let listeners: (() => void)[] = [];

  if (typeof window !== "undefined") {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      user = JSON.parse(savedUser);
    }
  }

  return {
    currentUserId: user?.id ? String(user.id) : "",
    users: user
      ? [
          {
            id: String(user.id),
            name: user.name,
            email: user.email,
            role: user.role,
          },
        ]
      : [],
    tasks: [],
    logs: [],
    checklists: [],
    notifications: [],
  };
}

let state: State = getInitialState();

const listeners = new Set<() => void>();
const emit = () => {
  if (!isServer) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  listeners.forEach((l) => l());
};

function setState(updater: (s: State) => State) {
  state = updater(state);
  emit();
}


export const store = {
  getState: () => state,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  hydrate: () => {
  if (isServer) return;

  const saved = localStorage.getItem(STORAGE_KEY);

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      state = { ...state, ...parsed };
    } catch (e) {
      console.error("Failed to hydrate store", e);
    }
  }

  // ✅ SELALU sync user dari localStorage
  const savedUser = localStorage.getItem("user");
  if (savedUser) {
    const u = JSON.parse(savedUser);
    state.currentUserId = String(u.id);

    // ✅ pastikan user masuk ke state.users
    if (!state.users.find(us => String(us.id) === String(u.id))) {
      state.users.push({
        ...u,
        id: String(u.id)
      });
    }
  }

  

  listeners.forEach((l) => l());

  // ✅ WAJIB DIPANGGIL SELALU
  store.fetchUsers();
},
    
  login: (user: User) => {
    localStorage.setItem("user", JSON.stringify(user));
    const userId = String(user.id);
    setState((s) => {
      // Add user to users list if not present
      const userExists = s.users.some(u => String(u.id) === userId);
      const newUser = { ...user, id: userId };
      return {
        ...s,
        currentUserId: userId,
        users: userExists ? s.users : [...s.users, newUser]
      };
    });
    store.fetchUsers(); // Fetch all users after login
  },

  fetchUsers: async () => {
    try {
      const res = await fetch("http://localhost:3000/users");
      const data = await res.json();
      setState((s) => ({
        ...s,
        users: data.map((u: any) => ({
          id: String(u.id),
          name: u.name,
          email: u.email,
          role: u.role,
        })),
      }));
    } catch (err) {
      console.error("❌ Gagal fetch users:", err);
    }
  },

  fetchTasks: async () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.id) return;

    const res = await fetch(`http://localhost:3000/tasks?user_id=${user.id}&role=${user.role}`);
    const data = await res.json();

    const uniqueTasks = user.role === 'admin' 
      ? data.reduce((acc: any[], curr: any) => {
          if (!acc.find(t => t.id === curr.id)) acc.push(curr);
          return acc;
        }, [])
      : data;

    // 🔥 INI BAGIAN PENTING
    const mappedTasks = uniqueTasks.map((t: any) => ({
      id: String(t.id),
      title: t.title,
      description: t.description,
      createdBy: String(t.created_by),
      assignedTo: t.assigned_to ? String(t.assigned_to) : undefined,
      isDefault: !!t.is_default,
      status: t.status,
      priority: t.priority,
      progress: t.progress,
      deadline: t.deadline,
      createdAt: t.created_at,
    }));

    setState((s) => ({
      ...s,
      tasks: mappedTasks,
    }));

  } catch (err) {
    console.error("❌ Gagal fetch tasks:", err);
  }
},

  fetchLogs: async () => {
    try {
      const res = await fetch("http://localhost:3000/logs");
      if (!res.ok) {
        console.warn("Backend logs endpoint not ready (404). Please restart backend.");
        return;
      }
      const data = await res.json();
      setState((s) => ({
        ...s,
        logs: data.map((l: any) => ({
          id: String(l.id),
          taskId: String(l.task_id),
          taskTitle: l.task_title,
          userId: String(l.user_id),
          action: l.action,
          detail: l.detail,
          timestamp: l.timestamp,
        })),
      }));
    } catch (err) {
      console.error("❌ Gagal fetch logs:", err);
    }
  },

  addLog: async (taskId: string, userId: string, action: string, detail?: string) => {
    try {
      await fetch("http://localhost:3000/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, user_id: userId, action, detail }),
      });
      store.fetchLogs();
    } catch (err) {
      console.error("❌ Gagal add log:", err);
    }
  },

updateTask: async (taskId: string, userId: string, status: TaskStatus, progress: number) => {
  await fetch(`http://localhost:3000/tasks/${taskId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      status,
      progress,
    }),
  });

  store.fetchTasks(); // refresh
},

getUserTaskStatus: (taskId: string, userId: string): TaskStatus => {
  const s = store.getState();
  const logs = s.logs
    .filter(l => l.taskId === taskId && l.userId === userId)
    .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));

  const last = logs[0];

  if (!last) {
  const task = s.tasks.find(t => t.id === taskId);

  if (task) {
    // ❌ JANGAN pakai status task untuk default
    if (!task.isDefault && String(task.assignedTo) === String(userId)) {
      return task.status;
    }
  }

  return "unread";
}

  if (last.action === "done") return "done";
  if (last.action === "progress") return "in_progress";
  if (last.action === "read") return "read";

  return "unread";
},

getUserTaskProgress: (taskId: string, userId: string): number => {
  const s = store.getState();
  const logs = s.logs
    .filter(l => l.taskId === taskId && l.userId === userId && l.action === "progress")
    .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));

  const last = logs[0];

  if (!last) {
  const task = s.tasks.find(t => t.id === taskId);

  if (task) {
    if (!task.isDefault && String(task.assignedTo) === String(userId)) {
      return task.progress;
    }
  }

  return 0;
}

  return parseInt(last.detail || "0");
},

  setCurrentUser: (id: string) => setState((s) => ({ ...s, currentUserId: id })),
  createTask: async (input: Omit<Task, "id" | "createdAt" | "status" | "progress">) => {
  try {
    const res = await fetch("http://localhost:3000/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: input.title,
        description: input.description,
        created_by: input.createdBy,
        assigned_to: input.assignedTo ?? null,
        priority: input.priority,
        deadline: input.deadline,
      }),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message);

    console.log("✅ Masuk DB:", data);

    // 🔥 ambil semua user dari state
const allUsers = store.getState().users;

// 🔥 cari pembuat task
const creator = allUsers.find(u => String(u.id) === String(input.createdBy));

// 🔥 tentukan target penerima notif
let targetUsers: User[] = [];

// ✅ CASE 1: task assign ke 1 orang
if (input.assignedTo) {
  const target = allUsers.find(u => String(u.id) === String(input.assignedTo));
  if (target) targetUsers.push(target);
}

// ✅ CASE 2: broadcast (tidak ada assignedTo)
else {
  targetUsers = allUsers.filter(u => String(u.id) !== String(input.createdBy));
}

// 🔥 bikin notif untuk semua target di BACKEND
for (const u of targetUsers) {
  await store.addNotification({
    userId: String(u.id),
    title: "Tugas Baru",
    message: `${creator?.name || "Seseorang"} (${creator?.role.toUpperCase() || "USER"}) memberikan tugas: ${input.title}`,
    link: `/tasks/${data.id}`,
  });
}

// 🔥 ambil ulang dari database
store.fetchTasks();
store.addLog(String(data.id), input.createdBy, "created");
store.fetchNotifications(); // Update current user's notifications if they are one of the targets (broadcast)

  } catch (err) {
    console.error("❌ Gagal:", err);
  }
},

  fetchNotifications: async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (!user.id) return;

      const res = await fetch(`http://localhost:3000/notifications/${user.id}`);
      const data = await res.json();
      setState((s) => ({
        ...s,
        notifications: data.map((n: any) => ({
          id: String(n.id),
          userId: String(n.user_id),
          title: n.title,
          message: n.message,
          link: n.link,
          isRead: !!n.is_read,
          timestamp: n.timestamp,
        })),
      }));
    } catch (err) {
      console.error("❌ Gagal fetch notifications:", err);
    }
  },

  addNotification: async (notif: Omit<Notification, "id" | "isRead" | "timestamp">) => {
    try {
      await fetch("http://localhost:3000/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: notif.userId,
          title: notif.title,
          message: notif.message,
          link: notif.link,
        }),
      });
      // Kita tidak fetch ulang di sini karena targetnya user lain.
      // User lain akan fetch via polling.
    } catch (err) {
      console.error("❌ Gagal add notification:", err);
    }
  },

  markNotificationRead: async (id: string) => {
    try {
      await fetch(`http://localhost:3000/notifications/${id}/read`, {
        method: "PUT",
      });
      setState((s) => ({
        ...s,
        notifications: s.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        ),
      }));
    } catch (err) {
      console.error("❌ Gagal mark notification read:", err);
    }
  },

  markRead: async (taskId: string, userId: string) => {
  try {
    await fetch(`http://localhost:3000/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        status: "read",
        progress: 0,
      }),
    });

    // ✅ ini yang benar: pakai log per user
    await store.addLog(taskId, userId, "read");

  } catch (err) {
    console.error("❌ Gagal markRead:", err);
  }
},
  updateProgress: async (taskId: string, userId: string, progress: number) => {
    try {
      let status: TaskStatus = "in_progress";
      if (progress >= 100) status = "done";
      else if (progress === 0) status = "read";

      const res = await fetch(`http://localhost:3000/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          status,
          progress,
        }),
      });

      if (!res.ok) throw new Error("Gagal update progress");

      // refresh data dari DB
      store.fetchTasks();
      store.addLog(taskId, userId, progress >= 100 ? "done" : "progress", `${progress}%`);
    } catch (err) {
      console.error("❌ Gagal updateProgress:", err);
    }
  },
  fetchChecklists: async () => {
    try {
      const res = await fetch("http://localhost:3000/checklists");
      if (!res.ok) {
        console.warn("Backend checklists endpoint not ready (404). Please restart backend.");
        return;
      }
      const data = await res.json();
      setState((s) => ({
        ...s,
        checklists: data.map((c: any) => ({
          id: String(c.id),
          title: c.title,
          createdBy: String(c.created_by),
          createdAt: c.created_at,
          items: c.items.map((i: any) => ({
            id: String(i.id),
            title: i.title,
            completed: !!i.completed,
          })),
        })),
      }));
    } catch (err) {
      console.error("❌ Gagal fetch checklists:", err);
    }
  },
  toggleChecklistItem: async (checklistId: string, itemId: string) => {
    try {
      const checklist = state.checklists.find(c => c.id === checklistId);
      if (!checklist) return;
      const item = checklist.items.find(i => i.id === itemId);
      if (!item) return;

      const res = await fetch(`http://localhost:3000/checklists/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !item.completed }),
      });

      if (res.ok) {
        store.fetchChecklists();
      }
    } catch (err) {
      console.error("❌ Gagal toggle checklist item:", err);
    }
  },
  addChecklist: async (title: string, items: string[], userId: string) => {
    try {
      const res = await fetch("http://localhost:3000/checklists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, created_by: userId, items }),
      });

      if (res.ok) {
        store.fetchChecklists();
      }
    } catch (err) {
      console.error("❌ Gagal add checklist:", err);
    }
  },
  deleteChecklist: async (id: string) => {
    try {
      const res = await fetch(`http://localhost:3000/checklists/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        store.fetchChecklists();
      }
    } catch (err) {
      console.error("❌ Gagal delete checklist:", err);
    }
  },
  addDefaultTask: async (title: string, description: string, userId: string) => {
    try {
      const res = await fetch("http://localhost:3000/tasks/default", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          created_by: userId,
        }),
      });

      if (!res.ok) throw new Error("Gagal create default task");

      const data = await res.json();

      // 🔥 AMBIL USER DARI STATE
      const allUsers = store.getState().users;
      const creator = allUsers.find(u => String(u.id) === String(userId));

      // 🔥 TARGET BROADCAST: HR & STAFF (kecuali pembuat jika dia HR/Staff)
      const targets = allUsers.filter(u => 
        (u.role === "hrd" || u.role === "staff") && 
        String(u.id) !== String(userId)
      );

      // 🔥 BIKIN NOTIF
      const notifications: Notification[] = targets.map((u) => ({
        id: `n-broadcast-${Date.now()}-${u.id}`,
        userId: String(u.id),
        title: "Tugas Baru (Broadcast)",
        message: `${creator?.name || "Admin"} (${creator?.role.toUpperCase() || "ADMIN"}) mengirim tugas default: ${title}`,
        link: `/tasks`, // Dashboard/Tugas default
        isRead: false,
        timestamp: new Date().toISOString(),
      }));

      setState((s) => ({
        ...s,
        notifications: [...notifications, ...s.notifications],
      }));

      // refresh data
      store.fetchTasks();
      store.addLog(String(data.id), userId, "created");
    } catch (err) {
      console.error("❌ Gagal:", err);
    }
  },

  deleteTask: async (id: string) => {
    try {
      const res = await fetch(`http://localhost:3000/tasks/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Gagal hapus tugas");

      // refresh data dari DB
      store.fetchTasks();
    } catch (err) {
      console.error("❌ Gagal deleteTask:", err);
    }
  },

  logout: () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setState((s) => ({
      ...s,
      currentUserId: "",
      // Jangan hapus data lain (tasks, logs, etc) agar tetap ada di dashboard saat login kembali
    }));
  },
  resetData: () => {
    if (confirm("Apakah Anda yakin ingin menghapus semua data? Tindakan ini tidak dapat dibatalkan.")) {
      state = {
        currentUserId: "u1",
        users: [],
        tasks: [],
        logs: [],
        checklists: [],
        notifications: [],
      };
      emit();
    }
  },
  updateProfile: (id: string, name: string, avatar?: string) => {
    setState((s) => ({
      ...s,
      users: s.users.map((u) => (u.id === id ? { ...u, name, avatar } : u)),
    }));
  },
};

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
}

export const useCurrentUser = () =>
  useStore((s) => s.users.find((u) => String(u.id) === String(s.currentUserId)));

export const can = {
  createTask: (role: Role) => true,
  manageUsers: (role: Role) => role === "admin",
  viewAllTasks: (role: Role) => role === "admin",
};