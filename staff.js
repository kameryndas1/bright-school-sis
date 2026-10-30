
/*
  Bright School SIS — Staff Directory
  Phase 4: Read-only staff management
*/

let staffRecords = [];
let staffRequest = 0;

function showStaffMessage(message) {
  const tbody = document.getElementById("staffRows");
  if (!tbody) return;

  tbody.replaceChildren();

  const row = document.createElement("tr");
  const cell = document.createElement("td");

  cell.colSpan = 5;
  cell.textContent = message;

  row.appendChild(cell);
  tbody.appendChild(row);
}

function renderStaffDirectory(query = "") {
  const tbody = document.getElementById("staffRows");
  if (!tbody) return;

  tbody.replaceChildren();

  const search = query.trim().toLowerCase();

  const filtered = staffRecords.filter(staff => {
    const values = [
      staff.first_name,
      staff.last_name,
      staff.preferred_name,
      staff.job_title,
      staff.department,
      staff.role,
      staff.active ? "Active" : "Inactive"
    ];

    return values.some(value =>
      String(value ?? "")
        .toLowerCase()
        .includes(search)
    );
  });

  if (filtered.length === 0) {
    showStaffMessage(
      search
        ? "No matching staff members."
        : "No accessible staff records found."
    );
    return;
  }

  filtered.forEach(staff => {
    const row = document.createElement("tr");

    const fullName = [
      staff.preferred_name || staff.first_name,
      staff.last_name
    ].filter(Boolean).join(" ");

    const values = [
      fullName || "Unnamed Staff",
      staff.job_title ||
        (staff.role === "admin"
          ? "Administrator" : "Teacher"),
      staff.department || "—",
      staff.role === "admin"
        ? "Administrator"
        : staff.role === "teacher"
          ? "Teacher" : staff.role,
      staff.active ? "Active" : "Inactive"
    ];

    values.forEach(value => {
      const cell = document.createElement("td");
      cell.textContent = value ?? "—";
      row.appendChild(cell);
    });

    tbody.appendChild(row);
  });
}

window.loadStaffDirectory = async function () {
  if (!document.body.classList.contains(
    "authenticated"
  )) return;

  const request = ++staffRequest;

  staffRecords = [];
  showStaffMessage("Loading staff...");

  try {
    const { data: userData, error: authError } =
      await supabaseClient.auth.getUser();

    if (authError || !userData?.user) {
      throw new Error("Authentication required.");
    }

    const { data, error } = await supabaseClient
      .from("staff")
      .select(
        "id,first_name,last_name,preferred_name," +
        "job_title,department,role,active"
      )
      .order("last_name", { ascending: true })
      .limit(100);

    if (error) throw error;

    if (
      request !== staffRequest ||
      !document.body.classList.contains(
        "authenticated"
      )
    ) return;

    staffRecords = data || [];

    renderStaffDirectory(
      document.getElementById("staffSearch")
        ?.value || ""
    );

  } catch (error) {
    if (request !== staffRequest) return;

    console.error("Staff directory error:", error);
    showStaffMessage(
      "Unable to load staff. Check staff read permissions."
    );
  }
};

// Search staff without another database request.
document.getElementById("staffSearch")
  ?.addEventListener("input", event => {
    renderStaffDirectory(event.target.value);
  });

// Load staff when the Staff navigation tab opens.
document.querySelector(
  '#navigation button[data-page="staff"]'
)?.addEventListener("click", () => {
  window.loadStaffDirectory();
});

// Clear cached staff information on sign-out.
supabaseClient.auth.onAuthStateChange(event => {
  if (event === "SIGNED_OUT") {
    staffRequest++;
    staffRecords = [];

    const search = document.getElementById(
      "staffSearch"
    );
    if (search) search.value = "";

    showStaffMessage("Sign in to view staff.");
  }
});

console.log("Staff Directory module ready");

