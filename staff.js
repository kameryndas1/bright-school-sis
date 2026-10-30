
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


async function setupStaffEditor() {
  // Remove any previous editor when reloading.
  document.getElementById("staff-editor")?.remove();

  const section = document.getElementById("staff");
  if (!section ||
      !document.body.classList.contains("authenticated")) {
    return;
  }

  // Verify the actual signed-in user.
  const { data: authData, error: authError } =
    await supabaseClient.auth.getUser();

  if (authError || !authData?.user) return;

  const uid = authData.user.id;

  // Check both the login role and school staff role.
  const [loginResult, schoolResult] = await Promise.all([
    supabaseClient
      .from("bright_staff_roles")
      .select("role")
      .eq("user_id", uid)
      .maybeSingle(),

    supabaseClient
      .from("staff")
      .select("id,school_id,role,active")
      .eq("auth_user_id", uid)
      .eq("active", true)
      .eq("role", "admin")
  ]);

  if (loginResult.error || schoolResult.error) return;

  const adminSchools = schoolResult.data || [];

  if (loginResult.data?.role !== "administrator" ||
      adminSchools.length !== 1) {
    return;
  }

  const schoolId = adminSchools[0].school_id;

  // Make sure the session has not changed.
  const { data: currentAuth } =
    await supabaseClient.auth.getUser();

  if (currentAuth?.user?.id !== uid ||
      !document.body.classList.contains("authenticated")) {
    return;
  }

  // Build the administrator panel.
  const panel = document.createElement("div");
  panel.id = "staff-editor";
  panel.className = "panel";

  const heading = document.createElement("h2");
  heading.textContent = "Staff Administration";
  panel.appendChild(heading);

  const description = document.createElement("p");
  description.textContent =
    "Edit staff profile information. " +
    "School roles and account permissions are protected.";
  panel.appendChild(description);

  const form = document.createElement("form");
  form.id = "staff-edit-form";

  // Staff selector.
  const selectorLabel = document.createElement("label");
  selectorLabel.textContent = "Select Staff Member";
  selectorLabel.htmlFor = "staff-edit-select";

  const selector = document.createElement("select");
  selector.id = "staff-edit-select";
  selector.required = true;

  const initialOption = document.createElement("option");
  initialOption.value = "";
  initialOption.textContent = "Choose a staff member";
  selector.appendChild(initialOption);

  staffRecords.forEach(staff => {
    const option = document.createElement("option");
    option.value = staff.id;
    option.textContent =
      `${staff.first_name} ${staff.last_name}`;
    selector.appendChild(option);
  });

  form.append(selectorLabel, selector);

  const fields = [
    ["first_name", "First Name", true],
    ["last_name", "Last Name", true],
    ["preferred_name", "Preferred Name", false],
    ["job_title", "Job Title", false],
    ["department", "Department", false]
  ];

  const inputs = {};

  fields.forEach(([key, labelText, required]) => {
    const wrapper = document.createElement("div");
    wrapper.style.marginTop = "12px";

    const label = document.createElement("label");
    label.htmlFor = `staff-edit-${key}`;
    label.textContent = labelText;

    const input = document.createElement("input");
    input.type = "text";
    input.id = `staff-edit-${key}`;
    input.required = required;
    input.maxLength = 150;
    input.style.display = "block";
    input.style.width = "100%";
    input.style.maxWidth = "440px";
    input.style.padding = "9px";

    wrapper.append(label, input);
    form.appendChild(wrapper);
    inputs[key] = input;
  });

  // Populate the form when a staff member is selected.
  selector.addEventListener("change", () => {
    const staff = staffRecords.find(
      record => record.id === selector.value
    );

    fields.forEach(([key]) => {
      inputs[key].value = staff?.[key] || "";
    });
  });

  const saveButton = document.createElement("button");
  saveButton.type = "submit";
  saveButton.textContent = "Save Staff Changes";
  saveButton.style.marginTop = "15px";

  const status = document.createElement("p");
  status.setAttribute("role", "status");

  form.append(saveButton, status);

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const targetId = selector.value;
    if (!targetId) return;

    saveButton.disabled = true;
    status.textContent = "Saving staff changes...";

    try {
      // Recheck authorization before every write.
      const { data: latestAuth, error: latestError } =
        await supabaseClient.auth.getUser();

      if (latestError || latestAuth?.user?.id !== uid ||
          !panel.isConnected) {
        throw new Error("Your session has changed.");
      }

      const { data: latestRole, error: roleError } =
        await supabaseClient
          .from("bright_staff_roles")
          .select("role")
          .eq("user_id", uid)
          .maybeSingle();

      const { data: adminRecord, error: adminError } =
        await supabaseClient
          .from("staff")
          .select("id")
          .eq("auth_user_id", uid)
          .eq("school_id", schoolId)
          .eq("role", "admin")
          .eq("active", true)
          .maybeSingle();

      if (roleError || adminError ||
          latestRole?.role !== "administrator" ||
          !adminRecord) {
        throw new Error("Administrator access not verified.");
      }

      const changes = {};

      fields.forEach(([key]) => {
        const value = inputs[key].value.trim();
        changes[key] = value || null;
      });

      if (!changes.first_name || !changes.last_name) {
        throw new Error("First and last names are required.");
      }

      const { data: updated, error } =
        await supabaseClient
          .from("staff")
          .update(changes)
          .eq("id", targetId)
          .eq("school_id", schoolId)
          .select("id");

      if (error) throw error;

      if (updated?.length !== 1) {
        throw new Error(
          "No authorized staff record was updated."
        );
      }

      await window.loadStaffDirectory();
      window.alert("Staff profile updated successfully.");

    } catch (error) {
      status.textContent =
        error.message || "Unable to save staff changes.";
      console.error("Staff editing error:", error);
    } finally {
      saveButton.disabled = false;
    }
  });

  panel.appendChild(form);

  // Display the editor above the directory.
  section.prepend(panel);
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
document.getElementById("staff-editor")?.remove();
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
    await setupStaffEditor();

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
    document.getElementById("staff-editor")?.remove();
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

