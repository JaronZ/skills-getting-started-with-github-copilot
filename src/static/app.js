document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // small helper to escape HTML
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // compute simple initials from email/user part
  function initialsFromEmail(email) {
    const local = String(email).split("@")[0] || "";
    const parts = local.replace(/[^a-z0-9]+/gi, " ").trim().split(/\s+/);
    if (!parts.length || !parts[0]) return (local.charAt(0) || "?").toUpperCase();
    const first = parts[0].charAt(0) || "";
    const second = parts[1] ? parts[1].charAt(0) : "";
    return (first + second).toUpperCase();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Clear existing select options (keep default)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants HTML (includes a delete button for each participant)
        let participantsHtml = `<div class="participants-section"><h5>Participants</h5>`;
        if (!details.participants || details.participants.length === 0) {
          participantsHtml += `<p class="participants-empty">No participants yet</p>`;
        } else {
          participantsHtml += `<ul class="participants-list">`;
          details.participants.forEach((p) => {
            const safeEmail = escapeHtml(p);
            const badge = escapeHtml(initialsFromEmail(p));
            // Add a small delete button next to each participant. Use data attributes to store activity and email.
            participantsHtml += `<li>
                <span class="participant-badge">${badge}</span>
                <span class="participant-email">${safeEmail}</span>
                <button class="participant-delete" data-activity="${escapeHtml(name)}" data-email="${safeEmail}" title="Remove participant" aria-label="Remove ${safeEmail} from ${escapeHtml(name)}">✖</button>
              </li>`;
          });
          participantsHtml += `</ul>`;
        }
        participantsHtml += `</div>`;

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHtml}
        `;

        activitiesList.appendChild(activityCard);

        // Attach click handlers for delete buttons inside this activity card
        activityCard.querySelectorAll('.participant-delete').forEach((btn) => {
          btn.addEventListener('click', async (ev) => {
            const activityName = btn.dataset.activity;
            const email = btn.dataset.email;

            if (!activityName || !email) return;

            // Optional simple confirmation
            const confirmed = window.confirm(`Remove ${email} from ${activityName}?`);
            if (!confirmed) return;

            try {
              const resp = await fetch(`/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`, {
                method: 'DELETE',
              });

              const result = await resp.json().catch(() => ({}));

              if (resp.ok) {
                messageDiv.textContent = result.message || `${email} removed from ${activityName}`;
                messageDiv.className = 'success';
                messageDiv.classList.remove('hidden');
                // Refresh activities list to reflect removal
                fetchActivities();
              } else {
                messageDiv.textContent = result.detail || 'Failed to remove participant';
                messageDiv.className = 'error';
                messageDiv.classList.remove('hidden');
              }

              // Hide message after 5 seconds
              setTimeout(() => messageDiv.classList.add('hidden'), 5000);
            } catch (err) {
              console.error('Error removing participant:', err);
              messageDiv.textContent = 'Failed to remove participant. Please try again.';
              messageDiv.className = 'error';
              messageDiv.classList.remove('hidden');
            }
          });
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // refresh activities to show newly added participant
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
