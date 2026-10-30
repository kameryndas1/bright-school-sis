
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


function showStaffProfile(staffId) {
  const staff = staffRecords.find(
    record => record.id === staffId
  );

  if (!staff) return;

  const section = document.getElementById("staff");
  if (!section) return;

  let profile = document.getElementById("staff-profile");

  if (!profile) {
    profile = document.createElement("div");
    profile.id = "staff-profile";
    profile.className = "panel";
    section.appendChild(profile);
  }

  profile.replaceChildren();

  const heading = document.createElement("h2");
  heading.textContent = [
    staff.preferred_name || staff.first_name,
    staff.last_name
  ].filter(Boolean).join(" ");

  const subtitle = document.createElement("p");
  subtitle.textContent =
    "Staff Profile — Valadia Academy";

  profile.append(heading, subtitle);

  const details = [
    ["Position",
      staff.job_title ||
      (staff.role === "admin"
        ? "Administrator" : "Teacher")],
    ["Department", staff.department || "Not specified"],
    ["School Role",
      staff.role === "admin"
        ? "Administrator"
        : staff.role === "teacher"
          ? "Teacher" : staff.role],
    ["Status", staff.active ? "Active" : "Inactive"]
  ];

  details.forEach(([label, value]) => {
    const paragraph = document.createElement("p");
    const strong = document.createElement("strong");

    strong.textContent = label + ": ";
    paragraph.append(strong, document.createTextNode(value));

    profile.appendChild(paragraph);
  });

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.textContent = "Close Profile";

  closeButton.style.cssText =
    "padding:10px 16px;background:#173b70;" +
    "color:white;border:0;border-radius:7px;" +
    "cursor:pointer;margin-top:10px";

  closeButton.addEventListener("click", () => {
    profile.remove();
  });

  profile.appendChild(closeButton);
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

values.forEach((value, index) => {
  const cell = document.createElement("td");

  if (index === 0) {
    const nameButton = document.createElement("button");

    nameButton.type = "button";
    nameButton.textContent = value ?? "Unnamed Staff";

    nameButton.style.cssText =
      "border:0;background:none;color:#173b70;" +
      "font-weight:bold;text-decoration:underline;" +
      "cursor:pointer;padding:0;text-align:left";

    nameButton.addEventListener("click", () => {
      showStaffProfile(staff.id);
    });

    cell.appendChild(nameButton);
  } else {
    cell.textContent = value ?? "—";
  }

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
document.getElementById("staff-profile")?.remove();
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
    document.getElementById("staff-profile")?.remove();
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

