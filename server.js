const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

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

/* ================= TEACHERS ================= */

const teachers = [

{
username: "simbiat001",
password: "12345",
subjects: ["ENGLISH","LITERATURE"],
classes: ["JSS1","JSS2","JSS3","SS1","SS2","SS3"]
},

{
username: "rachael001",
password: "12345",
subjects: ["MATHEMATICS"],
classes: ["JSS1","JSS2","JSS3","SS1","SS2","SS3"]
},

{
username: "dolapo001",
password: "12345",
subjects: ["ECONOMICS","COMMERCE","FINANCIAL ACCOUNTING","IRS"],
classes: ["JSS1","JSS2","JSS3","SS1","SS2","SS3"]
},

{
username: "lateef001",
password: "12345",
subjects: ["YORUBA"],
classes: ["JSS1","JSS2","JSS3","SS1","SS2","SS3"]
},

{
username: "emmanuel001",
password: "12345",
subjects: [
"CITIZENSHIP AND HERITAGE",
"DIGITAL TECHNOLOGIES",
"BIOLOGY",
"CHEMISTRY",
"PHYSICS",
"AGRIC",
"CRS"
],
classes: ["JSS1","JSS2","JSS3","SS1","SS2","SS3"]
},

{
username: "yomi001",
password: "12345",
subjects: ["MARKETING","IRS","DIGITAL TECHNOLOGIES"],
classes: ["JSS1","JSS2","JSS3","SS1","SS2","SS3"]
},

{
username: "brown001",
password: "12345",
subjects: ["GOVERNMENT","INTERMEDIATE SCIENCE","PHE"],
classes: ["JSS1","JSS2","JSS3","SS1","SS2","SS3"]
},

{
username: "ruth001",
password: "12345",
subjects: ["HISTORY","CCA","HOME MANAGEMENT"],
classes: ["JSS1","JSS2","JSS3"]
},

{
username: "peace001",
password: "12345",
subjects: ["BUSINESS STUDIES","SOCIAL CITIZENSHIP"],
classes: ["JSS1","JSS2","JSS3"]
}

];

/* ================= STUDENT REGISTER ================= */
app.post("/register", async (req, res) => {
  const { fullname, class_level, username, password } = req.body;
  try {
    await db.query(
      "INSERT INTO students(fullname,class_level,username,password) VALUES($1,$2,$3,$4)",
      [fullname, class_level, username, password]
    );
    res.json({ success: true });
  } catch {
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
    req.session.student = result.rows[0];

    // Send student back to frontend
    return res.json({
      success: true,
      student: result.rows[0]
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

app.get("/admin-delete", (req, res) => {
  if (!req.session.admin) {
    return res.redirect("/admin");
  }

  res.sendFile(__dirname + "/public/admin-delete.html");
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

/* ================= START EXAM ================= */
app.post("/start-exam", async (req, res) => {

  if (!req.session.student) {
    return res.json({ success: false });
  }

  req.session.startTime = Date.now();

  const { subject } = req.body;
  const class_level = req.session.student.class_level;

  // BLOCK STUDENT FROM TAKING SAME EXAM AGAIN
  const alreadyTaken = await db.query(
    "SELECT * FROM results WHERE student_id = $1 AND subject = $2",
    [
      req.session.student.id,
      subject.trim().toUpperCase()
    ]
  );

  if (alreadyTaken.rows.length > 0) {
    return res.json({
      success: false,
      message: "You have already taken this exam. Contact admin if you need a retake."
    });
  }

  try {

    const result = await db.query(
      `SELECT * FROM questions
       WHERE UPPER(TRIM(class_level)) = $1
       AND UPPER(TRIM(subject)) = $2
       ORDER BY RANDOM()
       LIMIT 30`,
      [
        class_level.trim().toUpperCase(),
        subject.trim().toUpperCase()
      ]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.json({
        success: false,
        questions: []
      });
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

    const endTime = Date.now();
    const startTime = req.session.startTime || endTime;
    const timeUsed = Math.floor((endTime - startTime) / 1000);

    const questions = req.session.examQuestions || [];

    let score = 0;

    questions.forEach((q, index) => {
      if (
        answers[index] &&
        answers[index].toUpperCase() === q.correct_answer.toUpperCase()
      ) {
        score += 2;
      }
    });

    await db.query(
  "INSERT INTO results(student_id, class_level, subject, score, total, answers, time_used) VALUES($1,$2,$3,$4,$5,$6,$7)",
  [
    req.session.student.id,
    class_level,
    subject.trim().toUpperCase(),
    score,
    questions.length * 2,
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

/* ================= TEACHER RESULTS ================= */

app.get("/teacher-results", async (req, res) => {

  if (!req.session.teacher) {
    return res.json([]);
  }

  const teacherSubjects = req.session.teacher.subjects;

  const result = await db.query(`
    SELECT 
      results.id,
      students.fullname AS name,
      students.username AS matric,
      results.class_level,
      results.subject,
      results.score,
      results.total
    FROM results
    JOIN students ON students.id = results.student_id
    ORDER BY results.created_at DESC
  `);

  const filtered = result.rows.filter(r =>
    teacherSubjects.includes(r.subject)
  );

  res.json(filtered);

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
     AND subject = $2
     LIMIT 50`,
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
/* ================= TEACHER VIEW RESULT ================= */
app.get("/teacher/view/:id", async (req, res) => {

  if (!req.session.teacher) {
    return res.redirect("/teacher-login.html");
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

    const questionsData = await db.query(
      `SELECT * FROM questions WHERE id = ANY($1::int[])`,
      [questionIds]
    );

    const questions = questionIds.map(id =>
      questionsData.rows.find(q => q.id === id)
    );

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
          <p><strong>Q${index + 1}.</strong> ${q.question}</p>

          <ul style="list-style:none;">
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

/* ================= TEACHER LOGIN ================= */

app.post("/teacher-login", (req, res) => {

  const { username, password } = req.body;

  const teacher = teachers.find(
    t => t.username === username && t.password === password
  );

  if (!teacher) {
    return res.json({ success: false });
  }

  req.session.teacher = teacher;

  res.json({ success: true });

});
/* ================= DELETE RESULT ================= */

app.post("/admin/delete-result", async (req, res) => {

  if (!req.session.admin) {
    return res.json({ success: false });
  }

  const { resultId } = req.body;

  try {

    await db.query(
      "DELETE FROM results WHERE id = $1",
      [resultId]
    );

    res.json({ success: true });

  } catch (err) {
    console.log(err);
    res.json({ success: false });
  }

});

/* ================= TEACHER DASHBOARD ================= */

app.get("/teacher-dashboard", (req, res) => {

  if (!req.session.teacher) {
    return res.redirect("/teacher-login.html");
  }

  res.sendFile(__dirname + "/public/teacher-dashboard.html");

});

app.get("/check-users", async (req, res) => {
  const result = await db.query("SELECT username, password FROM students");
  res.json(result.rows);
});


/* ================= GET QUESTIONS ================= */

app.get("/get-questions", async (req,res)=>{

if(!req.session.admin){
return res.json([]);
}

const result = await db.query(
"SELECT * FROM questions ORDER BY id DESC"
);

res.json(result.rows);

});


/* ================= DELETE SUBJECT QUESTIONS ================= */

app.post("/delete-subject-questions", async (req,res)=>{

if(!req.session.admin){
return res.json({success:false});
}

const {class_level, subject} = req.body;

try{

await db.query(
"DELETE FROM questions WHERE UPPER(TRIM(class_level))=$1 AND UPPER(TRIM(subject))=$2",
[
class_level.trim().toUpperCase(),
subject.trim().toUpperCase()
]
);

res.json({success:true});

}catch(err){

console.log(err);
res.json({success:false});

}

});


app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});