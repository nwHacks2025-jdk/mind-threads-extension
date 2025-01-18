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

const saveSummaryToDb = (summary) => {
  console.log("Saved summary:", summary);
};

const sendSummaryToEmail = (summary) => {
  console.log("Sent summary to email:", summary);
};
