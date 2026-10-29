
/*
 Bright School SIS — Student Management
 Valadia Academy
 Directory + Individual Student Profiles
*/

let studentRecords = [];
let studentRequest = 0;

const getStudentBody = () =>
  document.getElementById("studentRows");

function showStudentMessage(message) {
  const tbody = getStudentBody();
  if (!tbody) return;

  tbody.replaceChildren();

  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = 4;
  cell.textContent = message;
  row.appendChild(cell);
  tbody.appendChild(row);
}

function getStudentName(student) {
  return [
    student.preferred_name || student.first_name,
    student.last_name
  ].filter(Boolean).join(" ") || "Unnamed Student";
}

function addProfileField(parent, label, value) {
  const item = document.createElement("div");
  item.style.padding = "12px";
  item.style.background = "#f8fafc";
  item.style.borderRadius = "8px";

  const heading = document.createElement("small");
  heading.textContent = label;
  heading.style.color = "#64748b";

  const content = document.createElement("div");
  content.textContent = String(value ?? "—");
  content.style.fontWeight = "600";
  content.style.marginTop = "5px";

  item.append(heading, content);
  parent.appendChild(item);
}

function closeStudentProfile() {
  const panel = document.getElementById(
    "student-profile-panel"
  );
  if (panel) panel.remove();
}

function openStudentProfile(studentId) {
  if (!document.body.classList.contains(
    "authenticated"
  )) return;

  const student = studentRecords.find(
    s => s.id === studentId
  );
  if (!student) return;

  closeStudentProfile();

  const section = document.getElementById("students");
  if (!section) return;

  const panel = document.createElement("div");
  panel.id = "student-profile-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Student profile");

  Object.assign(panel.style, {
    background: "white",
    padding: "24px",
    borderRadius: "12px",
    boxShadow: "0 4px 18px #00000018",
    marginTop: "20px"
  });

  const top = document.createElement("div");
  Object.assign(top.style, {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap"
  });

  const title = document.createElement("h2");
  title.textContent = getStudentName(student);
  title.style.color = "#173b70";
  title.style.margin = "0";

  const close = document.createElement("button");
  close.textContent = "Close Profile";
  close.type = "button";
  Object.assign(close.style, {
    background: "#173b70",
    color: "white",
    border: "none",
    borderRadius: "7px",
    padding: "10px 14px",
    cursor: "pointer"
  });

  close.addEventListener("click", () => {
    closeStudentProfile();
  });

  top.append(title, close);
  panel.appendChild(top);

  const subtitle = document.createElement("p");
  subtitle.textContent =
    "Valadia Academy • Student Overview";
  subtitle.style.color = "#64748b";
  panel.appendChild(subtitle);

  const grid = document.createElement("div");
  Object.assign(grid.style, {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
    marginTop: "20px"
  });

  addProfileField(
    grid, "Student Number", student.student_number
  );
  addProfileField(
    grid, "First Name", student.first_name
  );
  addProfileField(
    grid, "Last Name", student.last_name
  );
  addProfileField(
    grid, "Preferred Name", student.preferred_name
  );
  addProfileField(
    grid, "Grade Level", student.grade_level
  );
  addProfileField(
    grid, "Academic Level", student.academic_level
  );
  addProfileField(
    grid, "Enrollment Status",
    student.enrollment_status
  );

  panel.appendChild(grid);

  const upcoming = document.createElement("p");
  upcoming.textContent =
    "Schedule, Grades, Attendance, and " +
    "Enrollment History will be added in " +
    "future development phases.";
  upcoming.style.color = "#64748b";
  upcoming.style.marginTop = "24px";
  panel.appendChild(upcoming);

  section.appendChild(panel);
  panel.scrollIntoView({
    behavior: "smooth", block: "nearest"
  });
}

function renderStudentDirectory(query = "") {
  const tbody = getStudentBody();
  if (!tbody) return;

  tbody.replaceChildren();

  const search = query.trim().toLowerCase();

  const filtered = studentRecords.filter(student =>
    [
      getStudentName(student),
      student.first_name,
      student.last_name,
      student.student_number,
      student.grade_level,
      student.academic_level,
      student.enrollment_status
    ].some(value =>
      String(value ?? "").toLowerCase().includes(search)
    )
  );

  if (filtered.length === 0) {
    showStudentMessage(
      search ? "No matching students." :
      "No accessible students found."
    );
    return;
  }

  filtered.forEach(student => {
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    const nameButton = document.createElement("button");
    nameButton.type = "button";
    nameButton.textContent = getStudentName(student);

    Object.assign(nameButton.style, {
      color: "#173b70",
      background: "none",
      border: "none",
      padding: "0",
      fontWeight: "bold",
      cursor: "pointer",
      textDecoration: "underline"
    });

    nameButton.addEventListener("click", () => {
      openStudentProfile(student.id);
    });

    nameCell.appendChild(nameButton);
    row.appendChild(nameCell);

    const values = [
      student.student_number || "—",
      "Grade " + (student.grade_level ?? "—") +
        " • " + (student.academic_level || "Unassigned"),
      student.enrollment_status || "—"
    ];

    values.forEach(value => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });

    tbody.appendChild(row);
  });
}

window.loadStudentDirectory = async function () {
  if (!document.body.classList.contains(
    "authenticated"
  )) return;

  const request = ++studentRequest;
  closeStudentProfile();
  showStudentMessage("Loading students...");

  try {
    const { data, error } = await supabaseClient
      .from("students")
      .select(
        "id,student_number,first_name,last_name," +
        "preferred_name,grade_level,academic_level," +
        "enrollment_status"
      )
      .order("last_name", { ascending: true })
      .limit(100);

    if (error) throw error;

    if (
      request !== studentRequest ||
      !document.body.classList.contains("authenticated")
    ) return;

    studentRecords = data || [];

    renderStudentDirectory(
      document.getElementById("search")?.value || ""
    );

  } catch (error) {
    console.error("Student directory error:", error);
    showStudentMessage("Unable to load students.");
  }
};

const studentSearch = document.getElementById("search");

if (studentSearch) {
  studentSearch.addEventListener(
    "input",
    event => {
      event.stopImmediatePropagation();
      closeStudentProfile();
      renderStudentDirectory(event.target.value);
    },
    true
  );
}

supabaseClient.auth.onAuthStateChange(event => {
  if (event === "SIGNED_OUT") {
    studentRequest++;
    studentRecords = [];
    closeStudentProfile();
    showStudentMessage("Sign in to view students.");
  }
});

console.log("Student profiles module ready");

