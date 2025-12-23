const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");
const themeToggleBtn = document.querySelector("#theme-toggle-btn");

let typingInterval;
const chatHistory = [];
const userData = { message: "", file: {} };

/* ========= THEME ========= */
const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
document.body.classList.toggle("light-theme", isLightTheme);
themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";

/* ========= HELPERS ========= */
const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

const scrollToBottom = () =>
  container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });

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

/* ========= NETLIFY FUNCTION RESPONSE ========= */
const generateResponse = async (botMsgDiv) => {
  const textElement = botMsgDiv.querySelector(".message-text");

  try {
    const res = await fetch("/.netlify/functions/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userData.message
      })
    });

    const data = await res.json();

    if (data.error) {
      throw new Error(data.error);
    }

    if (!data.reply) {
      throw new Error("Empty response from server");
    }

    typingEffect(data.reply, textElement, botMsgDiv);
  } catch (err) {
    textElement.textContent = err.message;
    textElement.style.color = "#d62939";
    botMsgDiv.classList.remove("loading");
    document.body.classList.remove("bot-responding");
  } finally {
    userData.file = {};
    scrollToBottom();
  }
};

/* ========= POLLINATIONS IMAGE ========= */
async function generateImage(prompt) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(
    prompt
  )}?width=512&height=512&nologo=true&seed=1`;
}

/* ========= FORM SUBMIT ========= */
const handleFormSubmit = (e) => {
  e.preventDefault();
  const userMessage = promptInput.value.trim();
  if (!userMessage || document.body.classList.contains("bot-responding")) return;

  userData.message = userMessage;
  promptInput.value = "";

  document.body.classList.add("chats-active", "bot-responding");
  fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");

  const userMsgHTML = `
    <p class="message-text"></p>
    ${
      userData.file.data
        ? userData.file.isImage
          ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment"/>`
          : `<p class="file-attachment"><span class="material-icons">description</span>${userData.file.fileName}</p>`
        : ""
    }
  `;

  const userMsgDiv = createMessageElement(userMsgHTML, "user-message");
  userMsgDiv.querySelector(".message-text").textContent = userMessage;
  chatsContainer.appendChild(userMsgDiv);
  scrollToBottom();

  const lower = userMessage.toLowerCase();
  const isImageRequest =
    lower.includes("generate image") ||
    lower.includes("create image") ||
    lower.includes("image of") ||
    lower.includes("picture of");

  if (isImageRequest) {
    const botMsgDiv = createMessageElement(
      `
      <div class="loading-bubble">
        <img class="avatar" src="images/gemini.svg"/>
        <div class="typing-indicator"><span></span><span></span><span></span></div>
      </div>
      <p class="message-text">Generating image...</p>
    `,
      "bot-message",
      "loading"
    );
    chatsContainer.appendChild(botMsgDiv);

    generateImage(userMessage).then((url) => {
      botMsgDiv.innerHTML = `<img class="avatar" src="images/gemini.svg"/>`;
      const img = document.createElement("img");
      img.src = url;
      img.className = "img-attachment generated-image";
      botMsgDiv.appendChild(img);
      document.body.classList.remove("bot-responding");
      scrollToBottom();
    });

    return;
  }

  const botMsgDiv = createMessageElement(
    `
    <div class="loading-bubble">
      <img class="avatar" src="images/gemini.svg"/>
      <div class="typing-indicator"><span></span><span></span><span></span></div>
    </div>
    <p class="message-text">Just a sec...</p>
  `,
    "bot-message",
    "loading"
  );

  chatsContainer.appendChild(botMsgDiv);
  generateResponse(botMsgDiv);
};

/* ========= FILE UPLOAD ========= */
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
    fileUploadWrapper.classList.add(
      "active",
      isImage ? "img-attached" : "file-attached"
    );

    userData.file = {
      fileName: file.name,
      data: base64,
      mime_type: file.type,
      isImage
    };
  };
});

document.querySelector("#cancel-file-btn").addEventListener("click", () => {
  userData.file = {};
  fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");
});

/* ========= THEME ========= */
themeToggleBtn.addEventListener("click", () => {
  const isLight = document.body.classList.toggle("light-theme");
  localStorage.setItem("themeColor", isLight ? "light_mode" : "dark_mode");
  themeToggleBtn.textContent = isLight ? "dark_mode" : "light_mode";
});

/* ========= DELETE CHAT ========= */
document.querySelector("#delete-chats-btn").addEventListener("click", () => {
  chatsContainer.innerHTML = "";
  chatHistory.length = 0;
  document.body.classList.remove("chats-active", "bot-responding");
});

/* ========= SUGGESTIONS ========= */
document.querySelectorAll(".suggestions-item").forEach((s) => {
  s.addEventListener("click", () => {
    promptInput.value = s.querySelector(".text").textContent;
    promptForm.dispatchEvent(new Event("submit"));
  });
});

/* ========= MOBILE ========= */
document.addEventListener("click", ({ target }) => {
  const wrapper = document.querySelector(".prompt-wrapper");
  const hide =
    target.classList.contains("prompt-input") ||
    (wrapper.classList.contains("hide-controls") &&
      (target.id === "add-file-btn" ||
        target.id === "stop-response-btn"));
  wrapper.classList.toggle("hide-controls", hide);
});

promptForm.addEventListener("submit", handleFormSubmit);
document.querySelector("#add-file-btn").addEventListener("click", () =>
  fileInput.click()
);
