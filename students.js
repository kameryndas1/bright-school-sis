
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
        "id,school_id,student_number,first_name,last_name," +
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
   
await setupStudentEditor();
   
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

async function setupStudentEditor() {
  const section = document.getElementById("students");
 // Temporary read-only administrator diagnostic
 let diagnostic = document.getElementById("admin-diagnostic");

  if (!diagnostic && section) {
    diagnostic = document.createElement("p");
    diagnostic.id = "admin-diagnostic";
    diagnostic.setAttribute("role", "status");
    diagnostic.style.cssText =
      "padding:12px;background:#eef2ff;color:#173b70;" +
      "border-radius:8px;margin:12px 0";
    section.prepend(diagnostic);
  }

  const reportAdminCheck = message => {
    console.log("Student editor:", message);
    if (diagnostic) diagnostic.textContent = message;
  };

  reportAdminCheck("Checking student administration access...");

  if (!section ||
      !document.body.classList.contains("authenticated")) return;

  const { data: userData, error: userError } =
    await supabaseClient.auth.getUser();

  if (userError || !userData?.user) {
   reportAdminChecl("Authentication check failed.");
   return;
  }
   
  const uid = userData.user.id;

  const [rolesResult, staffResult] = await Promise.all([
    supabaseClient.from("bright_staff_roles")
      .select("role").eq("user_id", uid).maybeSingle(),
    supabaseClient.from("staff")
      .select("school_id,role,active")
      .eq("auth_user_id", uid)
  ]);

  if (rolesResult.error || staffResult.error) {
   reportAdminCheck("Staff permission query failed.");
   return;
  }

  const adminSchools = (staffResult.data || []).filter(
    s => s.role === "admin" && s.active === true
  );

  
  if (rolesResult.data?.role !== "administrator") {
    reportAdminCheck("Administrator login role not verified.");
    return;
  }

  if (adminSchools.length !== 1) {
    reportAdminCheck("School administrator record not available.");
    return;
  }

  reportAdminCheck("Administrator checks passed.");


  const schoolId = adminSchools[0].school_id;
  document.getElementById("student-editor")?.remove();

  const panel = document.createElement("section");
  panel.id = "student-editor";
  panel.style.cssText =
    "background:white;padding:20px;margin:20px 0;" +
    "border:1px solid #ddd;border-radius:12px";

  const heading = document.createElement("h3");
  heading.textContent = "Student Administration";
  panel.appendChild(heading);

  const form = document.createElement("form");
  form.style.cssText =
    "display:grid;gap:12px;max-width:480px";

  function field(label, name, type = "text") {
    const wrapper = document.createElement("label");
    wrapper.textContent = label;
    const input = document.createElement("input");
    input.name = name;
    input.type = type;
    input.style.cssText =
      "display:block;width:100%;padding:10px;" +
      "box-sizing:border-box";
    if (type !== "number") input.maxLength = 100;
    wrapper.appendChild(input);
    form.appendChild(wrapper);
    return input;
  }

  function choice(label, name, options) {
    const wrapper = document.createElement("label");
    wrapper.textContent = label;
    const select = document.createElement("select");
    select.name = name;
    select.style.cssText =
      "display:block;width:100%;padding:10px";
    options.forEach(value => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
    wrapper.appendChild(select);
    form.appendChild(wrapper);
    return select;
  }

  const recordSelect = choice(
    "Action", "record", ["New Student"]
  );

  function refreshOptions() {
    const previous = recordSelect.value;
    recordSelect.replaceChildren();

    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "New Student";
    recordSelect.appendChild(blank);

    studentRecords
      .filter(s => s.school_id === schoolId)
      .forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = getStudentName(s);
        recordSelect.appendChild(opt);
      });

    recordSelect.value = previous || "";
  }

  const number = field("Student Number", "student_number");
  const first = field("First Name", "first_name");
  const last = field("Last Name", "last_name");
  const preferred = field("Preferred Name", "preferred_name");
  const grade = field("Grade Level", "grade_level", "number");
  grade.min = "0";
  grade.max = "12";

  const level = choice("Academic Level", "academic_level",
    ["Primary", "Standard", "Advanced"]);

  const status = choice("Enrollment Status",
    "enrollment_status",
    ["active", "withdrawn", "graduated"]);

  first.required = true;
  last.required = true;
  grade.required = true;

  recordSelect.addEventListener("change", () => {
    const student = studentRecords.find(
      s => s.id === recordSelect.value
    );

    number.value = student?.student_number || "";
    number.readOnly = !!student;
    first.value = student?.first_name || "";
    last.value = student?.last_name || "";
    preferred.value = student?.preferred_name || "";
    grade.value = student?.grade_level ?? 5;
    level.value = student?.academic_level || "Standard";
    status.value = student?.enrollment_status || "active";
    number.required = !student;
  });

  const message = document.createElement("p");
  message.setAttribute("role", "status");

  const save = document.createElement("button");
  save.type = "submit";
  save.textContent = "Save Student";
  save.style.cssText =
    "padding:12px;background:#173b70;color:white;" +
    "border:0;border-radius:8px;cursor:pointer";

  form.append(save, message);
  panel.appendChild(form);
  section.prepend(panel);

  refreshOptions();
  recordSelect.dispatchEvent(new Event("change"));

  form.addEventListener("submit", async event => {
    event.preventDefault();

    save.disabled = true;
    message.textContent = "Saving...";

    const existing = studentRecords.find(
      s => s.id === recordSelect.value
    );

    const values = {
      first_name: first.value.trim(),
      last_name: last.value.trim(),
      preferred_name: preferred.value.trim() || null,
      grade_level: Number(grade.value),
      academic_level: level.value,
      enrollment_status: status.value
    };

    try {
      if (!values.first_name || !values.last_name ||
          !Number.isInteger(values.grade_level) ||
          values.grade_level < 0 ||
          values.grade_level > 12) {
        throw new Error("Check the required fields.");
      }

      let result;

      if (existing) {
        result = await supabaseClient
          .from("students")
          .update(values)
          .eq("id", existing.id)
          .eq("school_id", schoolId)
          .select("id")
          .single();
      } else {
        const studentNumber = number.value.trim();

        if (!studentNumber) {
          throw new Error("Student number is required.");
        }

        result = await supabaseClient
          .from("students")
          .insert({
            ...values,
            school_id: schoolId,
            student_number: studentNumber
          })
          .select("id")
          .single();
      }

      if (result.error) throw result.error;

      message.textContent = "Student saved successfully.";
      await window.loadStudentDirectory();
      refreshOptions();

    } catch (error) {
      message.textContent = "Save failed: " + error.message;
    } finally {
      save.disabled = false;
    }
  });
}



