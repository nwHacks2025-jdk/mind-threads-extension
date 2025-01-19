console.log("Content script loaded");

// Track processed messages (avoid duplicates)
const processedMessageIds = new Set();

const trackMessages = () => {
  try {
    const messages = document.querySelectorAll("article");
    const userMessages = [];
    const chatGptResponses = [];

    messages.forEach((msg) => {
      const messageId = msg.getAttribute("data-message-id");
      if (messageId && processedMessageIds.has(messageId)) {
        return;
      }

      if (messageId) {
        processedMessageIds.add(messageId);
      }

      const isUserMessage = msg.querySelector('[data-message-author-role="user"]');
      const isGptResponse = msg.querySelector('[data-message-author-role="assistant"]');
      const messageText = msg.innerText.trim();

      if (isUserMessage) {
        userMessages.push(messageText);
        console.log("User message:", messageText);
      } else if (isGptResponse) {
        chatGptResponses.push(messageText);
        console.log("GPT response:", messageText);
      }
    });

    // Send to background or wherever you handle them
    if (userMessages.length > 0 || chatGptResponses.length > 0) {
      chrome.runtime.sendMessage({
        type: "chat-interaction",
        userMessages,
        chatGptResponses
      });
      console.log("Messages sent to background script.");
    }
  } catch (error) {
    console.error("Error in trackMessages:", error);
  }
};

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "fetch-chat-messages") {
    console.log("Fetching latest chat messages...");
    trackMessages();
  }
});

// Check stored email on page load
document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get("email", (result) => {
    if (!result.email) {
      console.log("No email found. Requesting background to open extension popup...");

      // Send a request to open the extension popup
      chrome.runtime.sendMessage({ type: "open-extension-popup" }, (response) => {
        console.log("Background response:", response);
      });
    } else {
      console.log("Email already saved:", result.email);
    }
  });
});

