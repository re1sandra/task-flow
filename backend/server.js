import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import { db } from "./db.js";

const app = express();

app.use(cors());
app.use(express.json());

const formatMySQLDate = (iso) => {
  if (!iso) return null;
  return new Date(iso)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
};

/* ================= REGISTER ================= */
app.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "Semua field wajib diisi" });
  }

  // cek email
  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {
    if (err) return res.status(500).json({ message: "DB error" });

    if (result.length > 0) {
      return res.status(400).json({ message: "Email sudah dipakai" });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    db.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, role],
      (err) => {
        if (err) return res.status(500).json({ message: "Gagal register" });

        res.json({ message: "Register berhasil ✅" });
      }
    );
  });
});

/* ================= LOGIN ================= */
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {
    if (err) return res.status(500).json({ message: "DB error" });

    if (result.length === 0) {
      return res.status(400).json({ message: "User tidak ditemukan" });
    }

    const user = result[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Password salah" });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  });
});

/* ================= USERS ================= */
app.get("/users", (req, res) => {
  db.query("SELECT id, name, email, role FROM users", (err, results) => {
    if (err) return res.status(500).json({ message: "DB error" });
    res.json(results);
  });
});

/* ================= CREATE TASK (TAG) ================= */
app.post("/tasks", (req, res) => {
  const {
    title,
    description,
    created_by,
    assigned_to,
    priority,
    deadline,
  } = req.body;

  const formattedDeadline = formatMySQLDate(deadline);

  if (!title || !created_by) {
    return res.status(400).json({ message: "Data tidak lengkap" });
  }

  db.query(
    `INSERT INTO tasks 
    (title, description, created_by, assigned_to, is_default, priority, deadline, status, progress) 
    VALUES (?, ?, ?, ?, 0, ?, ?, 'unread', 0)`,

    [title, description, created_by, assigned_to || null, priority, formattedDeadline],

    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Gagal create task" });
      }

      const taskId = result.insertId;

      if (assigned_to) {
        db.query(
          `INSERT INTO task_assignments 
          (task_id, user_id, status, progress) 
          VALUES (?, ?, 'unread', 0)`,
          [taskId, assigned_to],
          (err2) => {
            if (err2) {
              console.error(err2);
              return res.status(500).json({ message: "Gagal assign task" });
            }

            res.json({ id: taskId, message: "Task berhasil dibuat ✅" });
          }
        );
      } else {
        res.json({ id: taskId, message: "Task berhasil dibuat (tanpa assignee) ✅" });
      }
    }
  );
});

/* ================= CREATE DEFAULT TASK ================= */
app.post("/tasks/default", (req, res) => {
  const { title, description, created_by } = req.body;

  if (!title || !created_by) {
    return res.status(400).json({ message: "Data tidak lengkap" });
  }

  // insert ke tasks
  db.query(
    `INSERT INTO tasks 
    (title, description, created_by, is_default, status, progress) 
    VALUES (?, ?, ?, 1, 'unread', 0)`,
    [title, description, created_by],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Gagal create default task" });

      const taskId = result.insertId;

      // ambil semua user HR & STAFF
      db.query(
        `SELECT id FROM users WHERE role IN ('hrd','staff')`,
        (err2, users) => {
          if (err2) return res.status(500).json({ message: "Gagal ambil user" });

          const values = users.map(u => [taskId, u.id, 'unread', 0]);

          db.query(
            `INSERT INTO task_assignments (task_id, user_id, status, progress) VALUES ?`,
            [values],
            (err3) => {
              if (err3) return res.status(500).json({ message: "Gagal assign default task" });

              res.json({ id: taskId, message: "Default task berhasil dibuat ✅" });
            }
          );
        }
      );
    }
  );
});

/* ================= GET TASKS ================= */
app.get("/tasks", (req, res) => {
  const userId = req.query.user_id;
  const userRole = req.query.role;

  if (userRole === 'admin') {
    // Admin sees all tasks + their assignments
    const query = `
      SELECT 
        t.id, t.title, t.description, t.created_by, t.assigned_to, t.is_default, t.priority, t.deadline, t.created_at,
        ta.user_id, ta.status, ta.progress, ta.read_at
      FROM tasks t
      LEFT JOIN task_assignments ta ON t.id = ta.task_id
      ORDER BY t.created_at DESC
    `;
    db.query(query, (err, result) => {
      if (err) return res.status(500).json({ message: "DB error" });
      res.json(result);
    });
  } else {

    const query = `
      SELECT 
        t.id, t.title, t.description, t.created_by, t.assigned_to, t.is_default, t.priority, t.deadline, t.created_at,
        IFNULL(ta.status, 'unread') as status,
        IFNULL(ta.progress, 0) as progress,
        ta.read_at,
        ? as user_id
      FROM tasks t
      LEFT JOIN task_assignments ta ON t.id = ta.task_id AND ta.user_id = ?
      WHERE t.is_default = 1 OR (t.is_default = 0 AND (ta.user_id = ? OR t.created_by = ?))
      ORDER BY t.created_at DESC
    `;
    db.query(query, [userId, userId, userId, userId], (err, result) => {
      if (err) return res.status(500).json({ message: "DB error" });
      res.json(result);
    });
  }
});

/* ================= UPDATE TASK STATUS ================= */
app.put("/tasks/:id", (req, res) => {
  const { status, progress, user_id } = req.body;
  const taskId = req.params.id;

  // Use UPSERT logic (Insert or Update) to handle new users on default tasks
  const query = `
    INSERT INTO task_assignments (task_id, user_id, status, progress, read_at)
    VALUES (?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
    status = VALUES(status),
    progress = VALUES(progress),
    read_at = NOW()
  `;

  db.query(query, [taskId, user_id, status, progress], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Gagal update task" });
    }
    res.json({ message: "Task updated ✅" });
  });
});

/* ================= DELETE TASK ================= */
app.delete("/tasks/:id", (req, res) => {
  const taskId = req.params.id;

  db.query("DELETE FROM activity_logs WHERE task_id = ?", [taskId], (err0) => {
    db.query("DELETE FROM task_assignments WHERE task_id = ?", [taskId], (err) => {
      if (err) return res.status(500).json({ message: "Gagal hapus assignments" });

      db.query("DELETE FROM tasks WHERE id = ?", [taskId], (err2) => {
        if (err2) return res.status(500).json({ message: "Gagal hapus task" });

        res.json({ message: "Task dihapus ✅" });
      });
    });
  });
});

/* ================= CHECKLISTS ================= */
app.post("/checklists", (req, res) => {
  const { title, created_by, items } = req.body;
  
  db.query(
    "INSERT INTO checklists (title, created_by) VALUES (?, ?)",
    [title, created_by],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Gagal buat checklist" });
      
      const checklistId = result.insertId;
      const values = items.map(item => [checklistId, item, 0]);
      
      db.query(
        "INSERT INTO checklist_items (checklist_id, title, completed) VALUES ?",
        [values],
        (err2) => {
          if (err2) return res.status(500).json({ message: "Gagal buat items" });
          res.json({ message: "Checklist berhasil dibuat ✅" });
        }
      );
    }
  );
});

app.get("/checklists", (req, res) => {
  db.query(
    `SELECT c.id, c.title, c.created_by, c.created_at, 
            ci.id as item_id, ci.title as item_title, ci.completed 
     FROM checklists c
     LEFT JOIN checklist_items ci ON c.id = ci.checklist_id
     ORDER BY c.created_at DESC`,
    (err, results) => {
      if (err) return res.status(500).json({ message: "DB error" });
      
      // Group by checklist id
      const checklists = [];
      results.forEach(row => {
        let c = checklists.find(x => x.id === row.id);
        if (!c) {
          c = { 
            id: row.id, 
            title: row.title, 
            created_by: row.created_by, 
            created_at: row.created_at, 
            items: [] 
          };
          checklists.push(c);
        }
        if (row.item_id) {
          c.items.push({ 
            id: row.item_id, 
            title: row.item_title, 
            completed: !!row.completed 
          });
        }
      });
      
      res.json(checklists);
    }
  );
});

app.put("/checklists/items/:id", (req, res) => {
  const itemId = req.params.id;
  const { completed } = req.body;
  
  db.query(
    "UPDATE checklist_items SET completed = ? WHERE id = ?",
    [completed ? 1 : 0, itemId],
    (err) => {
      if (err) return res.status(500).json({ message: "Gagal update item" });
      res.json({ message: "Item updated ✅" });
    }
  );
});

app.delete("/checklists/:id", (req, res) => {
  const id = req.params.id;
  db.query("DELETE FROM checklist_items WHERE checklist_id = ?", [id], (err) => {
    db.query("DELETE FROM checklists WHERE id = ?", [id], (err2) => {
      res.json({ message: "Checklist dihapus ✅" });
    });
  });
});

/* ================= ACTIVITY LOGS ================= */
app.get("/logs", (req, res) => {
  db.query(
    `SELECT l.*, t.title as task_title, u.name as user_name 
     FROM activity_logs l
     JOIN tasks t ON l.task_id = t.id
     JOIN users u ON l.user_id = u.id
     ORDER BY l.timestamp DESC LIMIT 20`,
    (err, results) => {
      if (err) return res.status(500).json({ message: "DB error" });
      res.json(results);
    }
  );
});

app.post("/logs", (req, res) => {
  const { task_id, user_id, action, detail } = req.body;
  db.query(
    "INSERT INTO activity_logs (task_id, user_id, action, detail) VALUES (?, ?, ?, ?)",
    [task_id, user_id, action, detail],
    (err) => {
      if (err) return res.status(500).json({ message: "Gagal simpan log" });
      res.json({ message: "Log saved ✅" });
    }
  );
});

/* ================= NOTIFICATIONS ================= */
app.get("/notifications/:userId", (req, res) => {
  const userId = req.params.userId;
  db.query(
    "SELECT * FROM notifications WHERE user_id = ? ORDER BY timestamp DESC LIMIT 50",
    [userId],
    (err, results) => {
      if (err) {
        // Jika tabel belum ada, kita buatkan dulu
        if (err.code === 'ER_NO_SUCH_TABLE') {
          db.query(`
            CREATE TABLE IF NOT EXISTS notifications (
              id INT AUTO_INCREMENT PRIMARY KEY,
              user_id INT NOT NULL,
              title VARCHAR(255) NOT NULL,
              message TEXT NOT NULL,
              link VARCHAR(255),
              is_read TINYINT(1) DEFAULT 0,
              timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `, (err2) => {
            if (err2) return res.status(500).json({ message: "Gagal buat tabel notif" });
            return res.json([]);
          });
        } else {
          return res.status(500).json({ message: "DB error" });
        }
      } else {
        res.json(results);
      }
    }
  );
});

app.post("/notifications", (req, res) => {
  const { user_id, title, message, link } = req.body;
  db.query(
    "INSERT INTO notifications (user_id, title, message, link, is_read) VALUES (?, ?, ?, ?, 0)",
    [user_id, title, message, link],
    (err) => {
      if (err) return res.status(500).json({ message: "Gagal simpan notif" });
      res.json({ message: "Notification saved ✅" });
    }
  );
});

app.put("/notifications/:id/read", (req, res) => {
  const id = req.params.id;
  db.query(
    "UPDATE notifications SET is_read = 1 WHERE id = ?",
    [id],
    (err) => {
      if (err) return res.status(500).json({ message: "Gagal update notif" });
      res.json({ message: "Notification marked as read ✅" });
    }
  );
});

/* ================= RUN SERVER ================= */
app.listen(3000, () => {
  console.log("Server jalan di http://localhost:3000 🚀");
});