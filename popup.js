document.getElementById("email-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  if (email) {
    chrome.runtime.sendMessage({ action: "saveEmail", email }, (response) => {
      if (response.success) {
        alert("Email saved successfully.");
      } else {
        alert("Failed to save email.");
      }
    });
  }
});