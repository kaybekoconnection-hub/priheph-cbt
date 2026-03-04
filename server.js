require("dotenv").config();
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const { Pool } = require("pg");

const app = express();
const PORT = 3000;

const db = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:yourpassword@localhost:5432/yourdbname",
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false
});

db.query(`
  CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    fullname TEXT,
    username TEXT UNIQUE,
    class_level TEXT,
    password TEXT
  );
`)
.then(() => console.log("Students table ready"))
.catch(err => console.error("Table creation error:", err));

db.query(`
  ALTER TABLE students
  ADD COLUMN IF NOT EXISTS username TEXT;
`);

db.query(`
  ALTER TABLE students
  ADD COLUMN IF NOT EXISTS class_level TEXT;
`);
/* ================= CREATE QUESTIONS TABLE ================= */
db.query(`
  CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    class_level TEXT,
    subject TEXT,
    question TEXT,
    option_a TEXT,
    option_b TEXT,
    option_c TEXT,
    option_d TEXT,
    correct_answer TEXT
  );
`)
.then(() => console.log("Questions table ready"))
.catch(err => console.error("Questions table error:", err));


/* ================= CREATE RESULTS TABLE ================= */
db.query(`
  CREATE TABLE IF NOT EXISTS results (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    class_level TEXT,
    subject TEXT,
    score INTEGER,
    total INTEGER,
    answers JSONB,
    time_used INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`)
.then(() => console.log("Results table ready"))
.catch(err => console.error("Results table error:", err));
db.query(`
  ALTER TABLE results
  ADD COLUMN IF NOT EXISTS retake_allowed BOOLEAN DEFAULT FALSE;
`);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
  secret: "cbtsecret",
  resave: false,
  saveUninitialized: false,
}));

app.use(express.static("public"));

const classes = ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"];
const subjects = ["Mathematics", "English", "Biology", "Physics", "Chemistry"];

/* ================= STUDENT REGISTER ================= */
app.post("/register", async (req, res) => {
  const { fullname, class_level, username, password } = req.body;
  try {
    await db.query(
      "INSERT INTO students(fullname,class_level,username,password) VALUES($1,$2,$3,$4)",
      [fullname, class_level, username, password]
    );
    res.json({ success: true });
  } catch (err) {
  console.log("REGISTER ERROR:", err);
  res.json({ success: false });
}
});

/* ================= STUDENT LOGIN ================= */
app.post("/login", async (req, res) => {

  const username = req.body.matric?.trim();
  const password = req.body.password?.trim();

  if (!username || !password) {
    return res.json({ success: false });
  }

  try {

    const result = await db.query(
      "SELECT * FROM students WHERE username = $1 AND password = $2",
      [username, password]
    );

    if (result.rows.length === 0) {
      return res.json({ success: false });
    }

    // Save session
   req.session.regenerate((err) => {
  if (err) {
    return res.json({ success: false });
  }

  // 🔥 Clear everything completely
  req.session.student = result.rows[0];
  req.session.examQuestions = null;
  req.session.startTime = null;

  return res.json({
    success: true,
    student: result.rows[0]
  });
});


  } catch (err) {
    console.log(err);
    return res.json({ success: false });
  }
});

/* ================= ADMIN LOGIN PAGE ================= */
app.get("/admin", (req, res) => {
  res.sendFile(__dirname + "/public/admin.html");
});

/* ================= ADMIN LOGIN ================= */
app.post("/admin-login", (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "admin123") {
    req.session.admin = true;
    return res.json({ success: true });
  }

  res.json({ success: false });
});

/* ================= ADMIN DASHBOARD ================= */
app.get("/admin-dashboard", (req, res) => {
  if (!req.session.admin) {
    return res.redirect("/admin");
  }

  res.sendFile(__dirname + "/public/admin-dashboard.html");
});

/* ================= ADMIN LOGOUT ================= */
app.get("/admin-logout", (req, res) => {
  req.session.destroy();
  res.redirect("/admin");
});

/* ================= UPLOAD QUESTION ================= */
app.post("/upload-question", async (req, res) => {

  if (!req.session.admin) {
    return res.json({ success: false });
  }

  const {
    class_level,
    subject,
    question,
    option_a,
    option_b,
    option_c,
    option_d,
    correct_answer
  } = req.body;

  try {
   await db.query(
  `INSERT INTO questions
  (class_level, subject, question, option_a, option_b, option_c, option_d, correct_answer)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
  [
    class_level.trim(),
    subject.trim().toUpperCase(),
    question,
    option_a,
    option_b,
    option_c,
    option_d,
    correct_answer.trim().toUpperCase()
  ]
);

    res.json({ success: true });

  } catch (err) {
    console.log(err);
    res.json({ success: false });
  }
});

/* ================= BULK UPLOAD QUESTIONS ================= */
app.post("/bulk-upload", async (req, res) => {

  if (!req.session.admin) {
    return res.json({ success: false, message: "Unauthorized" });
  }

  const { class_level, subject, content } = req.body;

  if (!class_level || !subject || !content) {
    return res.json({ success: false, message: "Missing data" });
  }

  const blocks = content.split(/\n\s*\n/);
  let inserted = 0;

  try {
    for (let block of blocks) {

      const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length < 6) continue;

      const question = lines[0];

      const option_a = lines.find(l => /^A\./i.test(l))?.replace(/^A\.\s*/i, "");
const option_b = lines.find(l => /^B\./i.test(l))?.replace(/^B\.\s*/i, "");
const option_c = lines.find(l => /^C\./i.test(l))?.replace(/^C\.\s*/i, "");
const option_d = lines.find(l => /^D\./i.test(l))?.replace(/^D\.\s*/i, "");
      
      
      

      const answerLine = lines.find(l => /^ANSWER/i.test(l));
      if (!question || !option_a || !option_b || !option_c || !option_d || !answerLine) continue;

      const correct_answer = answerLine.split(":")[1]?.trim().toUpperCase();

      await db.query(
        `INSERT INTO questions
        (class_level, subject, question, option_a, option_b, option_c, option_d, correct_answer)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          class_level.trim(),
          subject.trim().toUpperCase(),
          question,
          option_a,
          option_b,
          option_c,
          option_d,
          correct_answer
        ]
      );

      inserted++;
    }

    res.json({ success: true, inserted });

  } catch (err) {
    console.log(err);
    res.json({ success: false, message: "Database error" });
  }
});

/* ================= ADMIN VIEW QUESTIONS SUMMARY ================= */
app.get("/admin-questions", async (req, res) => {

  if (!req.session.admin) {
    return res.redirect("/admin");
  }

  try {

    const result = await db.query(`
      SELECT class_level, subject, COUNT(*) AS total_questions
      FROM questions
      GROUP BY class_level, subject
      ORDER BY class_level, subject
    `);

    let output = `
      <h2>Uploaded Questions Summary</h2>
      <table border="1" cellpadding="10">
        <tr>
          <th>Class</th>
          <th>Subject</th>
          <th>Total Questions</th>
        </tr>
    `;

    result.rows.forEach(row => {
      output += `
        <tr>
          <td>${row.class_level}</td>
          <td>${row.subject}</td>
          <td>${row.total_questions}</td>
        </tr>
      `;
    });

    output += "</table>";

    res.send(output);

  } catch (err) {
    console.log(err);
    res.send("Error loading questions");
  }

});

/* ================= ADMIN VIEW FULL QUESTIONS ================= */
app.get("/admin-questions/:class/:subject", async (req, res) => {

  if (!req.session.admin) {
    return res.redirect("/admin");
  }

  const class_level = req.params.class;
  const subject = req.params.subject;

  try {

    const result = await db.query(
      `SELECT * FROM questions
       WHERE UPPER(TRIM(class_level)) = $1
       AND UPPER(TRIM(subject)) = $2
       ORDER BY id ASC`,
      [
        class_level.trim().toUpperCase(),
        subject.trim().toUpperCase()
      ]
    );

    if (result.rows.length === 0) {
      return res.send("<h3>No questions found for this class & subject</h3>");
    }

    let output = `
      <h2>Questions for ${class_level} - ${subject}</h2>
      <p>Total: ${result.rows.length}</p>
      <hr>
    `;

    result.rows.forEach((q, index) => {
      output += `
        <div style="margin-bottom:25px; padding:15px; border:1px solid #ccc;">
          <p><strong>${index + 1}.</strong> ${q.question}</p>
          <ul>
            <li>A. ${q.option_a}</li>
            <li>B. ${q.option_b}</li>
            <li>C. ${q.option_c}</li>
            <li>D. ${q.option_d}</li>
          </ul>
          <p><strong>Correct Answer:</strong> ${q.correct_answer}</p>
        </div>
      `;
    });

    res.send(output);

 } catch (err) {
    console.log(err);
    res.send("Error loading questions");
  }

});
/* ================= ADMIN DELETE PAGE ================= */
app.get("/admin-delete", (req, res) => {

  if (!req.session.admin) {
    return res.redirect("/admin");
  }

  res.send(`
    <h2>Delete Questions by Class & Subject</h2>

    <form method="POST" action="/admin-delete-questions">
      <label>Class:</label>
      <input name="class_level" required />

      <br><br>

      <label>Subject:</label>
      <input name="subject" required />

      <br><br>

      <button type="submit">Delete Questions</button>
    </form>

    <p style="color:red;">
      Warning: This will permanently delete all questions for that class and subject.
    </p>
  `);

});

/* ================= DELETE QUESTIONS ================= */
app.post("/admin-delete-questions", async (req, res) => {

  if (!req.session.admin) {
    return res.redirect("/admin");
  }

  const { class_level, subject } = req.body;

  try {

    const result = await db.query(
      `DELETE FROM questions
       WHERE UPPER(TRIM(class_level)) = $1
       AND UPPER(TRIM(subject)) = $2`,
      [
        class_level.trim().toUpperCase(),
        subject.trim().toUpperCase()
      ]
    );

    res.send(`
      <h3>${result.rowCount} questions deleted successfully.</h3>
      <a href="/admin-delete">Go Back</a>
    `);

  } catch (err) {
    console.log(err);
    res.send("Delete failed");
  }

});

/* ================= START EXAM ================= */
app.post("/start-exam", async (req, res) => {

  if (!req.session.student) {
    return res.json({ success: false });
  }

  const { subject } = req.body;
  const studentId = req.session.student.id;
  const class_level = req.session.student.class_level;

  // Check if student already wrote
  const existing = await db.query(
    `SELECT id, retake_allowed FROM results
     WHERE student_id = $1
     AND UPPER(TRIM(subject)) = $2
     LIMIT 1`,
    [
      studentId,
      subject.trim().toUpperCase()
    ]
  );

  if (existing.rows.length > 0) {

    if (!existing.rows[0].retake_allowed) {
      return res.json({
        success: false,
        message: "You have already submitted this exam."
      });
    }

    // If retake allowed → delete old result
    await db.query(
      `DELETE FROM results WHERE id = $1`,
      [existing.rows[0].id]
    );
  }

  req.session.startTime = Date.now();

  try {

    const result = await db.query(
      `SELECT * FROM questions
       WHERE UPPER(TRIM(class_level)) = $1
       AND UPPER(TRIM(subject)) = $2
       ORDER BY RANDOM()`,
      [
        class_level.trim().toUpperCase(),
        subject.trim().toUpperCase()
      ]
    );

    if (!result.rows.length) {
      return res.json({ success: false, questions: [] });
    }

    req.session.examQuestions = result.rows;

    res.json({
      success: true,
      questions: result.rows
    });

  } catch (err) {
    console.log(err);
    res.json({ success: false });
  }

});

/* ================= SUBMIT EXAM ================= */
app.post("/submit-exam", async (req, res) => {

  if (!req.session.student) {
    return res.json({ success: false });
  }

  const { answers, subject } = req.body;
  const class_level = req.session.student.class_level;

  try {

    if (!req.session.startTime) {
  return res.json({
    success: false,
    message: "Session expired. Please login again."
  });
}

const endTime = Date.now();
const timeUsed = Math.floor((endTime - req.session.startTime) / 1000);

    const questions = req.session.examQuestions || [];

    let correctCount = 0;

questions.forEach((q, index) => {
  if (
    answers[index] &&
    answers[index].toUpperCase() === q.correct_answer.toUpperCase()
  ) {
    correctCount++;
  }
});

// Scale score to 60
const totalQuestions = questions.length;
const scaledScore = Math.round((correctCount / totalQuestions) * 60);

    await db.query(
  "INSERT INTO results(student_id, class_level, subject, score, total, answers, time_used) VALUES($1,$2,$3,$4,$5,$6,$7)",
  [
    req.session.student.id,
    class_level,
    subject.trim().toUpperCase(),
    scaledScore,
    60,
    JSON.stringify({
      answers: answers,
      questionIds: questions.map(q => q.id)
    }),
    timeUsed
  ]
);

    req.session.examQuestions = null;
    req.session.startTime = null;

    res.json({ success: true, score });

  } catch (err) {
    console.log(err);
    res.json({ success: false });
  }

});


/* ================= ADMIN RESULTS ================= */
app.get("/admin-results", async (req, res) => {
  if (!req.session.admin) return res.json([]);

 const result = await db.query(`
  SELECT 
    results.id,
    students.fullname AS name,
    students.username AS matric,
    results.class_level,
    results.subject,
    results.score,
    results.total,
    results.answers,
    results.time_used
  FROM results
  JOIN students ON students.id = results.student_id
  ORDER BY results.created_at DESC
`);

  res.json(result.rows);
});
/* ================= ADMIN ALLOW RETAKE ================= */
app.post("/admin/allow-retake", async (req, res) => {

  if (!req.session.admin) {
    return res.json({ success: false });
  }

  const { resultId } = req.body;

  try {

    await db.query(
      `UPDATE results
       SET retake_allowed = TRUE
       WHERE id = $1`,
      [resultId]
    );

    res.json({ success: true });

  } catch (err) {
    console.log(err);
    res.json({ success: false });
  }

});
/* ================= ADMIN VIEW RESULT ================= */
app.get("/admin/view/:id", async (req, res) => {

  if (!req.session.admin) {
    return res.redirect("/admin");
  }
  const resultId = req.params.id;

  try {

    const resultData = await db.query(
      `SELECT results.*, students.fullname
       FROM results
       JOIN students ON students.id = results.student_id
       WHERE results.id = $1`,
      [resultId]
    );

    if (resultData.rows.length === 0) {
      return res.send("Result not found");
    }

    const result = resultData.rows[0];
    let parsed;

if (typeof result.answers === "string") {
  parsed = JSON.parse(result.answers);
} else {
  parsed = result.answers;
}

let studentAnswers;
let questionIds;

if (parsed && parsed.questionIds) {
  studentAnswers = parsed.answers;
  questionIds = parsed.questionIds;
} else {
  studentAnswers = parsed;
  questionIds = null;
}

let questions;

if (questionIds && questionIds.length > 0) {
  const questionsData = await db.query(
    `SELECT * FROM questions WHERE id = ANY($1::int[])`,
    [questionIds]
  );

  questions = questionIds.map(id =>
    questionsData.rows.find(q => q.id === id)
  );

} else {
 const questionsData = await db.query(
  `SELECT * FROM questions
   WHERE class_level = $1
   AND subject = $2`,
  [result.class_level, result.subject]
);

  questions = questionsData.rows;
}

    let output = `
      <h2>Review for ${result.fullname}</h2>
      <p>Class: ${result.class_level}</p>
      <p>Subject: ${result.subject}</p>
      <p>Score: ${result.score}/${result.total}</p>
      <hr>
    `;

   questions.forEach((q, index) => {

  const studentAnswer = studentAnswers[index] || null;
  const correctAnswer = q.correct_answer;

  // Map options
  const options = {
    A: q.option_a,
    B: q.option_b,
    C: q.option_c,
    D: q.option_d
  };

  const studentText = studentAnswer ? options[studentAnswer] : "Not Answered";
  const correctText = options[correctAnswer];

  const isCorrect =
    studentAnswer &&
    studentAnswer.toUpperCase() === correctAnswer.toUpperCase();

  output += `
    <div style="margin-bottom:25px; padding:15px; border:1px solid #ccc;">
      <p><strong>Q${index + 1}.</strong> ${q.question.replace(/^\d+\.\s*/, "")}</p>

      <ul style="list-style:none; padding-left:0;">
        <li>A. ${q.option_a}</li>
        <li>B. ${q.option_b}</li>
        <li>C. ${q.option_c}</li>
        <li>D. ${q.option_d}</li>
      </ul>

      <p><strong>Student Chose:</strong> 
        ${studentAnswer ? studentAnswer + ". " + studentText : "Not Answered"}
      </p>

      <p><strong>Correct Answer:</strong> 
        ${correctAnswer}. ${correctText}
      </p>

      <p style="color:${isCorrect ? "green" : "red"};">
        <strong>${isCorrect ? "✔ Correct" : "✘ Wrong"}</strong>
      </p>
    </div>
  `;
});

    res.send(output);

  } catch (err) {
    console.log(err);
    res.send("Error loading result");
  }

});
app.get("/student-info", (req, res) => {
  if (!req.session.student) {
    return res.json({ success: false });
  }

  res.json({
    success: true,
    student: req.session.student
  });
});
app.get("/check-users", async (req, res) => {
  const result = await db.query("SELECT username, password FROM students");
  res.json(result.rows);
});


app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});