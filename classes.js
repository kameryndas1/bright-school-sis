
/*
  Bright School SIS — Class Directory
  Phase 5: Read-only administrator class view
*/

let classDirectoryRequest = 0;
let classDirectoryRecords = [];

function showClassDirectoryMessage(message) {
  const status = document.getElementById(
    "class-directory-status"
  );
  if (status) status.textContent = message;
}

function clearClassDirectory(message) {
  document.getElementById("class-details")?.remove();
  classDirectoryRequest++;
  classDirectoryRecords = [];

  document.getElementById(
    "class-directory-rows"
  )?.replaceChildren();

  showClassDirectoryMessage(message);
}

async function showClassDetails(sectionId) {
  const section = classDirectoryRecords.find(
    item =>
      item.item_type === "section" &&
      item.item_id === sectionId
  );

  if (!section) return;

  const request = classDirectoryRequest;
  const schedulingPage =
    document.getElementById("scheduling");

  const directoryPanel =
    document.getElementById("class-directory-panel");

  if (!schedulingPage || !directoryPanel) return;

  // Remove the previously opened class profile.
  document.getElementById("class-details")?.remove();

  const panel = document.createElement("div");
  panel.id = "class-details";
  panel.className = "panel";

  const title = document.createElement("h3");
  title.textContent = section.item_label;

  const teachers = new Map(
    classDirectoryRecords
      .filter(item => item.item_type === "teacher")
      .map(item => [item.item_id, item.item_label])
  );

  const teacherName =
    teachers.get(section.assigned_teacher_id) ||
    (section.assigned_teacher_id
      ? "Assigned teacher"
      : "Unassigned");

  const summary = document.createElement("p");
  summary.textContent =
    `Academic Level: ${section.class_level || "—"} | ` +
    `Teacher: ${teacherName} | ` +
    `Enrolled: ${section.enrolled_students ?? 0}`;

  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "Close Class Details";

  close.addEventListener("click", () => {
    panel.remove();
  });

  const rosterTitle = document.createElement("h4");
  rosterTitle.textContent = "Class Roster";

  const status = document.createElement("p");
  status.textContent = "Loading authorized students...";
  status.setAttribute("role", "status");

  const table = document.createElement("table");
  const head = document.createElement("thead");
  const headerRow = document.createElement("tr");

  ["Student", "Grade", "Academic Level"].forEach(value => {
    const th = document.createElement("th");
    th.textContent = value;
    headerRow.appendChild(th);
  });

  head.appendChild(headerRow);

  const body = document.createElement("tbody");
  table.append(head, body);

  panel.append(
    title,
    summary,
    close,
    rosterTitle,
    status,
    table
  );

  directoryPanel.insertAdjacentElement(
    "afterend",
    panel
  );

  try {
    const { data: authData, error: authError } =
      await supabaseClient.auth.getUser();

    if (authError || !authData?.user) {
      throw new Error("Authentication required.");
    }

    const userId = authData.user.id;

    // Fetch only enrollments permitted by Supabase RLS.
    const { data: enrollments, error: enrollError } =
      await supabaseClient
        .from("enrollments")
        .select("student_id")
        .eq("section_id", sectionId);

    if (enrollError) throw enrollError;

    const studentIds = [
      ...new Set(
        (enrollments || []).map(e => e.student_id)
      )
    ];

    let students = [];

    if (studentIds.length > 0) {
      const { data, error } = await supabaseClient
        .from("students")
        .select(
          "id,first_name,last_name,grade_level,academic_level"
        )
        .in("id", studentIds)
        .order("last_name", { ascending: true });

      if (error) throw error;
      students = data || [];
    }

    const { data: verifiedAuth } =
      await supabaseClient.auth.getUser();

    // Discard data if the user or directory changed.
    if (
      request !== classDirectoryRequest ||
      verifiedAuth?.user?.id !== userId ||
      !document.body.classList.contains("authenticated") ||
      !panel.isConnected
    ) return;

    body.replaceChildren();

    students.forEach(student => {
      const row = document.createElement("tr");

      const values = [
        [student.first_name, student.last_name]
          .filter(Boolean).join(" "),
        String(student.grade_level ?? "—"),
        student.academic_level || "—"
      ];

      values.forEach(value => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });

      body.appendChild(row);
    });

    if (studentIds.length === 0) {
      status.textContent = "No accessible enrollments found.";
    } else if (students.length === 0) {
      status.textContent =
        "Enrollments exist, but student records are not accessible.";
    } else {
      status.textContent =
        `${students.length} student(s) displayed.`;
    }

    if (students.length !== studentIds.length) {
      const note = document.createElement("p");
      note.textContent =
        "Some enrolled student records may be restricted by access policies.";
      panel.appendChild(note);
    }

  } catch (error) {
    if (
      request !== classDirectoryRequest ||
      !panel.isConnected
    ) return;

    console.error("Class roster error:", error);
    status.textContent =
      "Unable to load the class roster. Check read permissions.";
  }
}

function renderClassDirectory() {
  const tbody = document.getElementById(
    "class-directory-rows"
  );
  if (!tbody) return;

  tbody.replaceChildren();

  const level = document.getElementById(
    "class-level-filter"
  )?.value || "All";

  const teachers = new Map(
    classDirectoryRecords
      .filter(item => item.item_type === "teacher")
      .map(item => [item.item_id, item.item_label])
  );

  const sections = classDirectoryRecords
    .filter(item => item.item_type === "section")
    .filter(item =>
      level === "All" || item.class_level === level
    )
    .sort((a, b) =>
      a.item_label.localeCompare(b.item_label)
    );

  sections.forEach(section => {
    const row = document.createElement("tr");

    const values = [
      section.item_label,
      section.class_level || "—",
      teachers.get(section.assigned_teacher_id) ||
        (section.assigned_teacher_id
          ? "Assigned teacher"
          : "Unassigned"),
      String(section.enrolled_students ?? 0)
    ];

values.forEach((value, index) => {
  const cell = document.createElement("td");

  if (index === 0) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = value;
    button.style.cssText =
      "border:0;background:none;color:#173b70;" +
      "font-weight:bold;text-decoration:underline;" +
      "cursor:pointer;text-align:left;padding:0";

    button.addEventListener("click", () => {
      showClassDetails(section.item_id);
    });

    cell.appendChild(button);
  } else {
    cell.textContent = value;
  }

  row.appendChild(cell);
});

    tbody.appendChild(row);
  });

  showClassDirectoryMessage(
    sections.length
      ? `${sections.length} class sections displayed.`
      : "No matching class sections."
  );
}

window.loadClassDirectory = async function () {
  clearClassDirectory("Checking class access...");

  if (!document.body.classList.contains(
    "authenticated"
  )) return;

  const request = classDirectoryRequest;

  try {
    const { data: authData, error: authError } =
      await supabaseClient.auth.getUser();

    if (authError || !authData?.user) {
      throw new Error("Authentication required.");
    }

    const uid = authData.user.id;

    const { data, error } = await supabaseClient.rpc(
      "bright_list_teacher_assignment_options"
    );

    if (request !== classDirectoryRequest) return;

    if (error) {
      if (["42501", "P0002", "P0003"].includes(
        error.code
      )) {
        showClassDirectoryMessage(
          "Class management is available to administrators."
        );
        return;
      }
      throw error;
    }

    const { data: rechecked } =
      await supabaseClient.auth.getUser();

    if (
      request !== classDirectoryRequest ||
      rechecked?.user?.id !== uid ||
      !document.body.classList.contains("authenticated")
    ) return;

    classDirectoryRecords = data || [];
    renderClassDirectory();

  } catch (error) {
    if (request !== classDirectoryRequest) return;

    console.error("Class Directory error:", error);
    showClassDirectoryMessage(
      "Unable to load Class Directory."
    );
  }
};

document.getElementById("class-level-filter")
  ?.addEventListener("change", renderClassDirectory);

document.querySelector(
  '#navigation button[data-page="scheduling"]'
)?.addEventListener("click", () => {
  window.loadClassDirectory();
});

supabaseClient.auth.onAuthStateChange(event => {
  if (event === "SIGNED_OUT") {
    clearClassDirectory("Sign in to view classes.");
  }
});

console.log("Class Directory module ready");

