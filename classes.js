
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
  classDirectoryRequest++;
  classDirectoryRecords = [];

  document.getElementById(
    "class-directory-rows"
  )?.replaceChildren();

  showClassDirectoryMessage(message);
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

    values.forEach(value => {
      const cell = document.createElement("td");
      cell.textContent = value;
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

