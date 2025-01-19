console.log("Content script loaded");

// Track processed messages (avoid duplicates)
const processedMessageIds = new Set();

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

      chrome.runtime.sendMessage({ type: "post-email-to-server" }, (response) => {
        console.log("postEmailToServer response:", response);
      });
    }
  });
});

const trackMessages = () => {
  try {
    setTimeout(() => {
      const messages = document.querySelectorAll("article");
      const userMessages = [];
      const chatGptResponses = [];

      // Only send last message when calling POST API
      const lastGptMessage = {
        messageText: null,
        messageId: null,
      };


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
        let messageText = msg.innerText.trim();

        // Trim unwanted parts
        messageText = messageText.replace(/^ChatGPT said:/, '').trim(); // Remove "ChatGPT said:"
        messageText = messageText.replace(/^ChatGPT$/m, '').trim();
        messageText = messageText.replace(/[\d\w]+$/, ''); // Remove trailing "4o" or similar fragments

        // Remove new blank lines at the start and end
        messageText = messageText.replace(/^\s*[\r\n]+|[\r\n]+\s*$/g, '');

        if (isUserMessage) {
          chatGptResponses.push(messageText);
          console.log("GPT response:", messageText);
        }

        // Update the lastGptMessage if this is a user message
        if (isGptResponse) {
          lastGptMessage.messageText = messageText;
          lastGptMessage.messageId = messageId;
        }
      });

      if (lastGptMessage.messageText) {
        console.log("Last GPT message:", lastGptMessage.messageText);

        // Fetch the email from storage
        chrome.storage.local.get("email", ({ email }) => {
          if (!email) {
            console.log("No email found in storage. Cannot post to server.");
            return;
          }

          const bodyData = {
            email: email,
            gptresponse: lastGptMessage.messageText,
            messageAt: new Date().toISOString().split('T')[0]
          };

          // Sending POST API Request
          chrome.runtime.sendMessage(
            { type: "post-message-to-server", bodyData: bodyData },
            (response) => {
              if (chrome.runtime.lastError) {
                console.error("Error in sendMessage:", chrome.runtime.lastError.message);
              } else {
                console.log("postMessageToServer response:", response);
              }
            }
          );

        });
      }

      // Send to background or wherever you handle them
      if (userMessages.length > 0 || chatGptResponses.length > 0) {
        chrome.runtime.sendMessage({
          type: "chat-interaction",
          userMessages,
          chatGptResponses
        });
        console.log("Messages sent to background script.");
      }
    }, 5000);
  } catch (error) {
    console.error("Error in trackMessages:", error);
  }
};

