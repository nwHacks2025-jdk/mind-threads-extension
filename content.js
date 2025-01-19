console.log("Content script loaded");
let isOn = true;

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
  // If toggle is off, do not proceed with tracking or server calls
  if (!isOn) {
    console.log("Tracking is disabled by the toggle.");
    return;
  }

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

          // Only send the POST request if the toggle is still on
          if (isOn) {
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
          } else {
            console.log("Toggle turned off. Skipping postMessageToServer call.");
          }

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


document.addEventListener('DOMContentLoaded', () => {
  // Create a floating toggle button
  const toggleButton = document.createElement('button');
  toggleButton.innerText = 'Mind Thread On'; // Initial button text
  toggleButton.id = 'floating-toggle-button';

  // Apply basic styles for absolute positioning and default color
  Object.assign(toggleButton.style, {
    position: 'absolute', // Changed from fixed to absolute
    backgroundColor: '#34b96d',
    padding: '8px 12px',
    color: '#fff',
    border: 'none',
    borderRadius: '17px',
    cursor: 'pointer',
    fontSize: '14px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
    transition: 'background-color 0.3s ease',
    zIndex: '10000'
  });

  // Append the button to the body
  document.body.appendChild(toggleButton);

  // Function to position the button relative to #composer-background
  const positionButton = () => {
    const targetElement = document.querySelector('#composer-background');
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      // Example positioning: place the button above and to the right of #composer-background
      toggleButton.style.top = `${window.scrollY + rect.top - toggleButton.offsetHeight - 20}px`;
      toggleButton.style.left = `${window.scrollX + rect.right - 128}px`;
    } else {
      console.warn('#composer-background not found!');
    }
  };

  // Initial positioning
  positionButton();

  // Update position on window resize (optional)
  window.addEventListener('resize', positionButton);
  window.addEventListener('scroll', positionButton); // Optional: update on scroll if needed

  // Add a click event listener to toggle color and text
  toggleButton.addEventListener('click', () => {
    // Flip the state
    isOn = !isOn;

    // Update styles and text based on the new state
    if (isOn) {
      toggleButton.style.backgroundColor = '#34b96d';
      toggleButton.style.color = '#fff';
      toggleButton.style.padding = '8px 12px';
      toggleButton.innerText = 'Mind Thread On';
    } else {
      toggleButton.style.backgroundColor = '#2F2F2F';
      toggleButton.style.color = '#B4B4B4';
      toggleButton.style.padding = '8px 11.5px';
      toggleButton.innerText = 'Mind Thread Off';
    }

    console.log(`Toggle button clicked: ${toggleButton.innerText}`);
  });
});