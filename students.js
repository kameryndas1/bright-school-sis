
/*
 Bright School SIS — Student Directory
 Valadia Academy
*/

let studentRecords = [];
let studentRequest = 0;

function renderStudentDirectory(query = "") {
  const tbody = document.getElementById("studentRows");
  if (!tbody) return;

  tbody.replaceChildren();

  const search = query.trim().toLowerCase();

  const filtered = studentRecords.filter(student => {
    const name = [
      student.first_name,
      student.last_name,
      student.preferred_name
    ].filter(Boolean).join(" ");

    return [
      name,
      student.student_number,
      student.grade_level,
      student.academic_level,
      student.enrollment_status
    ].some(value =>
      String(value ?? "").toLowerCase().includes(search)
    );
  });

  if (!filtered.length) {
    showStudentMessage(
      search ? "No matching students." :
      "No accessible students found."
    );
    return;
  }

  filtered.forEach(student => {
    const row = document.createElement("tr");

    const name = [
      student.preferred_name || student.first_name,
      student.last_name
    ].filter(Boolean).join(" ") || "Unnamed Student";

    const values = [
      name,
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

function showStudentMessage(message) {
  const tbody = document.getElementById("studentRows");
  if (!tbody) return;

  tbody.replaceChildren();

  const row = document.createElement("tr");
  const cell = document.createElement("td");

  cell.colSpan = 4;
  cell.textContent = message;

  row.appendChild(cell);
  tbody.appendChild(row);
}

window.loadStudentDirectory = async function () {
  if (!document.body.classList.contains("authenticated")) {
    return;
  }

  const request = ++studentRequest;
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

    if (request !== studentRequest ||
        !document.body.classList.contains("authenticated")) {
      return;
    }

    studentRecords = data || [];
    renderStudentDirectory(
      document.getElementById("search")?.value || ""
    );

  } catch (error) {
    console.error("Student directory:", error);
    showStudentMessage("Unable to load students.");
  }
};

// Connect search without allowing the old demo
// search handler to overwrite Supabase records.
const studentSearch = document.getElementById("search");

if (studentSearch) {
  studentSearch.addEventListener("input", event => {
    event.stopImmediatePropagation();
    renderStudentDirectory(event.target.value);
  }, true);
}

// Clear records when the staff session ends.
if (typeof supabaseClient !== "undefined") {
  supabaseClient.auth.onAuthStateChange(event => {
    if (event === "SIGNED_OUT") {
      studentRequest++;
      studentRecords = [];
      showStudentMessage("Sign in to view students.");
    }
  });
}

console.log("Student Directory module ready");

