
/*
  Bright School SIS
  Student Management Module
  Valadia Academy
*/

window.loadStudentDirectory = async function () {
  const tbody = document.getElementById("studentRows");

  if (!tbody) return;

  // Do not load records while the login screen is shown.
  if (!document.body.classList.contains("authenticated")) {
    return;
  }

  tbody.replaceChildren();

  function showMessage(message) {
    tbody.replaceChildren();
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.textContent = message;
    row.appendChild(cell);
    tbody.appendChild(row);
  }

  showMessage("Loading students...");

  try {
    const { data, error } = await supabaseClient
      .from("students")
      .select("id, student_number")
      .limit(50);

    if (error) throw error;

    // Check again in case the user signed out.
    if (!document.body.classList.contains("authenticated")) {
      tbody.replaceChildren();
      return;
    }

    if (!data || data.length === 0) {
      showMessage("No accessible students found.");
      return;
    }

    tbody.replaceChildren();

    data.forEach((student, index) => {
      const row = document.createElement("tr");

      [
        "Student " + (index + 1),
        student.student_number || "—",
        "Not assigned",
        "Read-only"
      ].forEach(value => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });

      tbody.appendChild(row);
    });

  } catch (error) {
    showMessage("Unable to load students.");
    console.error("Student directory error:", error);
  }
};

console.log("Student Management module ready");
