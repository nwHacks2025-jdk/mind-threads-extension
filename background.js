// background.js
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed. Initializing...");
  chrome.storage.local.remove("email"); // This is introduced for the sake of debugging
  initializeExtension();
});

function initializeExtension() {
  // Example: Check if the email is already saved
  chrome.storage.local.get("email", (result) => {
    if (!result.email) {
      console.log("No email found. Prompting user...");
      // Optionally trigger an action or send a message to a content script
    } else {
      console.log("Email already exists:", result.email);
    }
  });

  // Add any other startup logic here
}

chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (details.url.includes("/backend-api/lat/r")) {
      console.log("ChatGPT API response received:", details.url);

      // Notify the content script to extract responses from the DOM
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { type: "fetch-chat-messages" });
        }
      });
    }
  },
  { urls: ["*://chatgpt.com/backend-api/lat/r*"] }
);

// Listen for messages from content or popup scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "saveEmail") {
    chrome.storage.local.set({ email: request.email }, () => {
      console.log("Email saved:", request.email);
      sendResponse({ success: true });
      postEmailToServer(); // Call POST API to send email to backend
    });
    return true; // Keep the message channel open for async response
  }
});


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "chat-interaction") {
    const { userMessages, chatGptResponses } = message;
    const conversationSummary = summarizeConversation(userMessages, chatGptResponses);
  }
});

const summarizeConversation = (userMessages, chatGptResponses) => {
  return {
    userMessages: userMessages.join("\n"),
    gptResponses: chatGptResponses.join("\n"),
    summary: `User and ChatGPT exchanged messages. User said: ${userMessages.length} times, GPT replied: ${chatGptResponses.length} times.`
  };
};


function postEmailToServer() {
  // Retrieve the stored email from chrome.storage
  chrome.storage.local.get("email", ({ email }) => {
    if (!email) {
      console.log("No email found in storage. Cannot post to server.");
      return;
    }

    // Make a POST request with the stored email
    fetch("http://localhost:8080/api/extension/member", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email })
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.text();
      })
      .then((text) => {
        if (text === "Success") {
          console.log("Request was successful, and the response is exactly 'Success'.");
        } else {
          console.log(`Request was successful, but the response is: '${text}'`);
        }
      })
      .catch((error) => {
        console.error("Error posting email to server:", error);
      });
  });
}

