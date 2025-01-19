document.addEventListener("DOMContentLoaded", () => {
  const submitBtn = document.getElementById("popup-submit");
  const cancelBtn = document.getElementById("popup-cancel");

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

        window.close();
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