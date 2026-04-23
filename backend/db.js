import mysql from "mysql2";

export const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "", // kosong kalau XAMPP
  database: "taskcontrol", // pastikan sama dengan phpMyAdmin kamu
});

db.connect((err) => {
  if (err) {
    console.error("DB Error:", err);
  } else {
    console.log("MySQL Connected ✅");
  }
});