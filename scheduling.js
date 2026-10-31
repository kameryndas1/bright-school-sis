
/*
  Bright School SIS — Teacher Assignments
  Phase 4: Administrator-only scheduling
*/

let assignmentRequest = 0;
let assignmentOptions = [];
let assignmentAdminUser = null;

function clearAssignmentView(message = "") {
  const controls = document.getElementById(
    "assignment-admin-controls"
  );
  const rows = document.getElementById("assignment-rows");
  const status = document.getElementById(
    "assignment-message"
  );

  if (controls) controls.hidden = true;
  if (rows) rows.replaceChildren();
  if (status) status.textContent = message;

  assignmentOptions = [];
  assignmentAdminUser = null;
}

function fillAssignmentSelect(id, items, placeholder) {
  const select = document.getElementById(id);
  if (!select) return;

  select.replaceChildren();

  const first = document.createElement("option");
  first.value = "";
  first.textContent = placeholder;
  select.appendChild(first);

  items.forEach(item => {
    const option = document.createElement("option");
    option.value = item.item_id;
    option.textContent = item.item_label;
    select.appendChild(option);
  });
}

function renderAssignments() {
  const teachers = assignmentOptions.filter(
    item => item.item_type === "teacher"
  );
  const sections = assignmentOptions.filter(
    item => item.item_type === "section"
  );

  const teacherNames = new Map(
    teachers.map(t => [t.item_id, t.item_label])
  );

  fillAssignmentSelect(
    "assignment-teacher",
    teachers,
    "Choose a teacher"
  );

  fillAssignmentSelect(
    "assignment-section",
    sections.filter(s => !s.assigned_teacher_id),
    "Choose an unassigned class"
  );

  const tbody = document.getElementById(
    "assignment-rows"
  );
  if (!tbody) return;

  tbody.replaceChildren();

  sections.forEach(section => {
    const row = document.createElement("tr");

    const values = [
      section.item_label,
      section.class_level || "—",
      teacherNames.get(section.assigned_teacher_id) ||
        (section.assigned_teacher_id
          ? "Assigned staff member"
          : "Unassigned"),
      String(section.enrolled_students ?? 0)
    ];

    values.forEach(value => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });

    tbody.appendChild(row);
  });
}

window.loadTeacherAssignments = async function () {
  const request = ++assignmentRequest;
  clearAssignmentView("Checking scheduling access...");

  if (!document.body.classList.contains(
    "authenticated"
  )) return;

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

    if (request !== assignmentRequest ||
        !document.body.classList.contains(
          "authenticated"
        )) return;

    if (error) {
      if (error.code === "42501" ||
          error.code === "P0002" ||
          error.code === "P0003") {
        clearAssignmentView(
          "Teacher assignment management is " +
          "available to administrators only."
        );
        return;
      }

      throw error;
    }

    const { data: rechecked } =
      await supabaseClient.auth.getUser();

    if (request !== assignmentRequest ||
        rechecked?.user?.id !== uid) return;

    assignmentAdminUser = uid;
    assignmentOptions = data || [];

    renderAssignments();

    document.getElementById(
      "assignment-admin-controls"
    ).hidden = false;

    document.getElementById(
      "assignment-message"
    ).textContent =
      "Select an active teacher and an unassigned section.";

  } catch (error) {
    if (request !== assignmentRequest) return;

    console.error("Scheduling error:", error);
    clearAssignmentView(
      "Unable to load teacher assignments."
    );
  }
};

document.getElementById("assignment-form")
  ?.addEventListener("submit", async event => {
    event.preventDefault();

    const teacherId = document.getElementById(
      "assignment-teacher"
    ).value;

    const sectionId = document.getElementById(
      "assignment-section"
    ).value;

    const saveButton = document.getElementById(
      "assignment-save"
    );

    const status = document.getElementById(
      "assignment-message"
    );

    if (!teacherId || !sectionId ||
        !assignmentAdminUser) return;

    const originalRequest = assignmentRequest;
    saveButton.disabled = true;
    status.textContent = "Saving assignment...";

    try {
      const { data: authData, error: authError } =
        await supabaseClient.auth.getUser();

      if (authError ||
          authData?.user?.id !== assignmentAdminUser ||
          originalRequest !== assignmentRequest) {
        throw new Error("Your session has changed.");
      }

      const { data, error } = await supabaseClient.rpc(
        "bright_assign_teacher_to_section",
        {
          p_teacher_id: teacherId,
          p_section_id: sectionId
        }
      );

      if (error) throw error;

      if (originalRequest !== assignmentRequest) return;

      await window.loadTeacherAssignments();

      const updatedStatus = document.getElementById(
        "assignment-message"
      );
      if (updatedStatus &&
          assignmentAdminUser === authData.user.id) {
        updatedStatus.textContent = data;
      }

    } catch (error) {
      if (originalRequest !== assignmentRequest) return;
      status.textContent =
        error.message || "Assignment could not be saved.";
    } finally {
      saveButton.disabled = false;
    }
  });

// Load assignments when Scheduling is opened.
document.querySelector(
  '#navigation button[data-page="scheduling"]'
)?.addEventListener("click", () => {
  window.loadTeacherAssignments();
});

// Remove all scheduling data when signing out.
supabaseClient.auth.onAuthStateChange(event => {
  if (event === "SIGNED_OUT") {
    assignmentRequest++;
    clearAssignmentView("Sign in to view Scheduling.");
  }
});

console.log("Scheduling module ready");

