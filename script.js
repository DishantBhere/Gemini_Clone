const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");
const themeToggleBtn = document.querySelector("#theme-toggle-btn");

// API Setup
const API_KEY = "AIzaSyBMZJxHBOOj2BGoVgNkcbLno0IB2gqRDDM"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

let controller, typingInterval;
const chatHistory = [];
const userData = { message: "", file: {} };

// Theme setup
const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
document.body.classList.toggle("light-theme", isLightTheme);
themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";

// Create message
const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

// Scroll
const scrollToBottom = () =>
  container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });

// Typing effect
const typingEffect = (text, textElement, botMsgDiv) => {
  textElement.textContent = "";
  const words = text.split(" ");
  let i = 0;
  typingInterval = setInterval(() => {
    if (i < words.length) {
      textElement.textContent += (i === 0 ? "" : " ") + words[i++];
      scrollToBottom();
    } else {
      clearInterval(typingInterval);
      botMsgDiv.classList.remove("loading");
      document.body.classList.remove("bot-responding");
    }
  }, 40);
};

// Gemini Response
const generateResponse = async (botMsgDiv) => {
  const textElement = botMsgDiv.querySelector(".message-text");
  controller = new AbortController();

  chatHistory.push({
    role: "user",
    parts: [
      { text: userData.message },
      ...(userData.file.data
        ? [{ inline_data: (({ fileName, isImage, ...rest }) => rest)(userData.file) }]
        : [])
    ]
  });

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: chatHistory }),
      signal: controller.signal
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);

    const responseText = data.candidates[0].content.parts[0].text.trim();

    typingEffect(responseText, textElement, botMsgDiv);
    chatHistory.push({ role: "model", parts: [{ text: responseText }] });

  } catch (error) {
    textElement.textContent =
      error.name === "AbortError" ? "Response cancelled" : error.message;
    textElement.style.color = "#d62939";
    botMsgDiv.classList.remove("loading");
    document.body.classList.remove("bot-responding");
  } finally {
    scrollToBottom();
    userData.file = {};
  }
};

// ⭐ FINAL POLLINATIONS FUNCTION
async function generateImage(prompt) {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&seed=1`;
  console.log("generateImage -> URL:", url);
  return url;
}

// ⭐ FORM SUBMIT
const handleFormSubmit = (e) => {
  e.preventDefault();
  const userMessage = promptInput.value.trim();
  if (!userMessage || document.body.classList.contains("bot-responding")) return;

  userData.message = userMessage;
  promptInput.value = "";

  document.body.classList.add("chats-active", "bot-responding");
  fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");

  // User message bubble
  const userMsgHTML = `
    <p class="message-text"></p>
    ${
      userData.file.data
        ? userData.file.isImage
          ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment" />`
          : `<p class="file-attachment"><span class="material-icons">description</span>${userData.file.fileName}</p>`
        : ""
    }
  `;
  
  const userMsgDiv = createMessageElement(userMsgHTML, "user-message");
  userMsgDiv.querySelector(".message-text").textContent = userMessage;
  chatsContainer.appendChild(userMsgDiv);
  scrollToBottom();

  // Detect Image Request
  const lower = userMessage.toLowerCase();
  const isImageRequest =
    lower.includes("generate image") ||
    lower.includes("generate images") ||
    lower.includes("create image") ||
    lower.includes("create images") ||
    lower.includes("make image") ||
    lower.includes("make images") ||
    lower.includes("image of") ||
    lower.includes("images of") ||
    lower.includes("picture of");

  if (isImageRequest) {

    const promptText = userMessage
      .replace(/generate images?/i, "")
      .replace(/create images?/i, "")
      .replace(/make images?/i, "")
      .replace(/image(s)? of/i, "")
      .trim() || userMessage;

    // Bot bubble while generating
    const botMsgHTML = `
      <div class="loading-bubble">
        <img class="avatar" src="images/gemini.svg" />
        <div class="typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
      <p class="message-text">Generating image...</p>
    `;

    const botMsgDiv = createMessageElement(botMsgHTML, "bot-message", "loading");
    chatsContainer.appendChild(botMsgDiv);
    scrollToBottom();

    generateImage(promptText)
      .then((url) => {
        const imgEl = document.createElement("img");
        imgEl.className = "img-attachment generated-image";
        imgEl.src = url;

        imgEl.onload = () => {
          botMsgDiv.classList.remove("loading");
          botMsgDiv.innerHTML = `<img class="avatar" src="images/gemini.svg" />`;
          botMsgDiv.appendChild(imgEl);
          document.body.classList.remove("bot-responding");
          scrollToBottom();
        };

        imgEl.onerror = (e) => {
          console.error("Image failed:", url, e);
          botMsgDiv.classList.remove("loading");
          botMsgDiv.innerHTML =
            `<img class="avatar" src="images/gemini.svg" /><p class="message-text" style="color:#d62939;">Image load failed.</p>`;
          document.body.classList.remove("bot-responding");
          scrollToBottom();
        };
      })
      .catch((err) => {
        console.error("generateImage ERROR:", err);
        botMsgDiv.classList.remove("loading");
        botMsgDiv.innerHTML =
          `<img class="avatar" src="images/gemini.svg" /><p class="message-text" style="color:#d62939;">Image generation failed.</p>`;
        document.body.classList.remove("bot-responding");
      });

    return;
  }

  // ⭐ Normal Gemini text response
  setTimeout(() => {
    const botMsgHTML = `
      <div class="loading-bubble">
        <img class="avatar" src="images/gemini.svg" />
        <div class="typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
      <p class="message-text">Just a sec...</p>
    `;

    const botMsgDiv = createMessageElement(botMsgHTML, "bot-message", "loading");
    chatsContainer.appendChild(botMsgDiv);
    scrollToBottom();
    generateResponse(botMsgDiv);
  }, 500);
};
//<!-- Coding By Dishant - and Ayush -->
// File Upload
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  const isImage = file.type.startsWith("image/");

  reader.readAsDataURL(file);
  
  reader.onload = (e) => {
    fileInput.value = "";

    const base64 = e.target.result.split(",")[1];

    fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
    fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");

    userData.file = {
      fileName: file.name,
      data: base64,
      mime_type: file.type,
      isImage
    };
  };
});

// Cancel File
document.querySelector("#cancel-file-btn").addEventListener("click", () => {
  userData.file = {};
  fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");
});

// Stop Response
document.querySelector("#stop-response-btn").addEventListener("click", () => {
  controller?.abort();
  clearInterval(typingInterval);
  const loadingBubble = chatsContainer.querySelector(".bot-message.loading");
  if (loadingBubble) loadingBubble.classList.remove("loading");
  document.body.classList.remove("bot-responding");
});

// Theme toggle
themeToggleBtn.addEventListener("click", () => {
  const isLight = document.body.classList.toggle("light-theme");
  localStorage.setItem("themeColor", isLight ? "light_mode" : "dark_            mode");
  themeToggleBtn.textContent = isLight ? "dark_mode" : "light_mode";
});

// Delete chats
document.querySelector("#delete-chats-btn").addEventListener("click", () => {
  chatsContainer.innerHTML = "";
  chatHistory.length = 0;
  document.body.classList.remove("chats-active", "bot-responding");
});

// Suggestions
document.querySelectorAll(".suggestions-item").forEach((s) => {
  s.addEventListener("click", () => {
    promptInput.value = s.querySelector(".text").textContent;
    promptForm.dispatchEvent(new Event("submit"));
  });
});

// Mobile controls
document.addEventListener("click", ({ target }) => {
  const wrapper = document.querySelector(".prompt-wrapper");
  const hide =
    target.classList.contains("prompt-input") ||
    (wrapper.classList.contains("hide-controls") &&
      (target.id === "add-file-btn" || target.id === "stop-response-btn"));
  wrapper.classList.toggle("hide-controls", hide);
});

// Form submit
promptForm.addEventListener("submit", handleFormSubmit);

// Open file dialog
document.querySelector("#add-file-btn").addEventListener("click", () => fileInput.click());
