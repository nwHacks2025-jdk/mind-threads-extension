document.addEventListener("DOMContentLoaded", () => {
  const submitBtn = document.getElementById("popup-submit");
  const cancelBtn = document.getElementById("popup-cancel");
  const confirmationEl = document.getElementById("confirmation-message");

  // On "Submit" click
  submitBtn.addEventListener("click", () => {
    const email = document.getElementById("email-input").value.trim();
    if (email) {
      // Save the email in Chrome storage
      chrome.storage.local.set({ email }, () => {
        console.log("Email saved:", email);

        chrome.runtime.sendMessage({ type: "post-email-to-server" }, (response) => {
          console.log("Background response:", response);
        });

        // Hide form elements or disable further interaction if needed
        submitBtn.disabled = true;
        cancelBtn.disabled = true;
        // Show the confirmation message
        if (confirmationEl) {
          confirmationEl.style.display = "block";
        }

        // Optionally close the window after a short delay
        setTimeout(() => {
          window.close();
        }, 1500); // waits 1.5 seconds before closing
      });
    } else {
      alert("Please enter a valid email.");
    }
  });

  // On "Cancel" click
  cancelBtn.addEventListener("click", () => {
    // Close the popup (or do any other cleanup)
    window.close();
  });
});