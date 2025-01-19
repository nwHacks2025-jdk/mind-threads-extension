// background.js
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed. Initializing...");
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
    });
    return true; // Keep the message channel open for async response
  }
});


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "chat-interaction") {
    const { userMessages, chatGptResponses } = message;
    const conversationSummary = summarizeConversation(userMessages, chatGptResponses);

    saveSummaryToDb(conversationSummary);
    sendSummaryToEmail(conversationSummary);
  }
});

const summarizeConversation = (userMessages, chatGptResponses) => {
  return {
    userMessages: userMessages.join("\n"),
    gptResponses: chatGptResponses.join("\n"),
    summary: `User and ChatGPT exchanged messages. User said: ${userMessages.length} times, GPT replied: ${chatGptResponses.length} times.`
  };
};

