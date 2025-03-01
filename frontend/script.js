let chatSessions = [];
let currentSessionId = null;

document.addEventListener("DOMContentLoaded", () => {
  const toggleSidebarBtn = document.getElementById("toggleSidebarBtn");
  const sidebar = document.getElementById("sidebar");
  if (toggleSidebarBtn && sidebar) {
    toggleSidebarBtn.addEventListener("click", () => {
      sidebar.classList.toggle("collapsed");
    });
  }

  const chatForm = document.getElementById("chatForm");
  const chatHistoryDiv = document.getElementById("chatHistory");
  const loadingDiv = document.getElementById("loading");
  const newChatFields = document.getElementById("newChatFields");

  const userIdInput = document.getElementById("userId");
  const leetcodeUrlInput = document.getElementById("leetcodeUrl");
  const skillLevelSelect = document.getElementById("skillLevel");
  const doubtInput = document.getElementById("doubt");

  const chatContainer = document.querySelector(".chat-container");
  chatContainer.style.display = "none";

  let isNewChat = true;
  let savedSkillLevel = "";
  let savedUserId = "";

  const newChatSidebarBtn = document.getElementById("newChatSidebarBtn");
  newChatSidebarBtn.addEventListener("click", () => {
    startNewChat();
  });

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      if (
        confirm(
          "Are you sure you want to logout? This will clear your current session data.",
        )
      ) {
        logoutUser();
      }
    });
  }

  // Start a new chat (new session) without clearing the user ID.
  function startNewChat() {
    chatHistoryDiv.innerHTML = "";
    // Instead of resetting the entire form, clear only specific fields:
    leetcodeUrlInput.value = "";
    skillLevelSelect.value = "";
    doubtInput.value = "";
    newChatFields.style.display = "flex";
    isNewChat = true;
    currentSessionId = null;
    chatContainer.style.display = "none";
    // Do not re-enable userId here because we want to keep it locked.
    // Refresh sessions for the same user.
    if (userIdInput.value.trim()) {
      fetchSessions(userIdInput.value.trim());
    }
  }

  function logoutUser() {
    chatHistoryDiv.innerHTML = "";
    // Clear fields except userId
    leetcodeUrlInput.value = "";
    skillLevelSelect.value = "";
    doubtInput.value = "";
    newChatFields.style.display = "flex";
    isNewChat = true;
    savedSkillLevel = "";
    savedUserId = "";
    currentSessionId = null;
    chatContainer.style.display = "none";
    userIdInput.disabled = false; // Unlock user ID
    chatSessions = [];
    const existingList = document.getElementById("chatList");
    if (existingList) {
      existingList.innerHTML = "";
    }
  }

  // Fetch sessions when userId input loses focus.
  userIdInput.addEventListener("blur", () => {
    if (userIdInput.value.trim()) {
      fetchSessions(userIdInput.value.trim());
    }
  });

  function fetchSessions(user_id) {
    fetch(
      `http://44.192.97.35:5000/api/session?user_id=${encodeURIComponent(user_id)}`,
    )
      .then((response) => response.json())
      .then((data) => {
        // data is an array of session_id strings; store as objects.
        chatSessions = data.map((session_id) => ({ user_id, session_id }));
        renderChatSessions();
      })
      .catch((err) => console.error("Failed to fetch sessions", err));
  }

  function renderChatSessions() {
    const existingList = document.getElementById("chatList");
    if (existingList) {
      existingList.innerHTML = "";
    } else {
      const chatListDiv = document.createElement("div");
      chatListDiv.classList.add("chat-list");
      chatListDiv.id = "chatList";
      const sidebar = document.getElementById("sidebar");
      sidebar.insertBefore(
        chatListDiv,
        document.getElementById("newChatSidebarBtn"),
      );
    }
    const chatListDiv = document.getElementById("chatList");
    chatSessions.forEach((session) => {
      const btn = document.createElement("button");
      btn.classList.add("nav-btn");
      btn.textContent = `Chat ${session.session_id.slice(0, 8)}`;
      chatListDiv.appendChild(btn);
      btn.addEventListener("click", () => {
        loadSession(session);
      });
    });
  }

  function loadSession(session) {
    currentSessionId = session.session_id;
    chatContainer.style.display = "flex";
    chatHistoryDiv.innerHTML = "";
    newChatFields.style.display = "none";
    const user_id = userIdInput.value.trim();
    fetch(
      `http://44.192.97.35:5000/api/history?user_id=${encodeURIComponent(user_id)}&session_id=${encodeURIComponent(session.session_id)}`,
    )
      .then((response) => response.json())
      .then((data) => {
        data.forEach((item) => {
          const cleanedContent = removeBoldSyntax(item.content);
          appendMessage(item.role, cleanedContent);
        });
        isNewChat = false;
        savedSkillLevel = skillLevelSelect.value;
        savedUserId = user_id;
      })
      .catch((err) => console.error("Failed to load session history", err));
  }

  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    sendMessage();
  });

  doubtInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  });

  function sendMessage() {
    const user_id = userIdInput.value.trim();
    const question = doubtInput.value.trim();
    let leetcode_url = null;
    let skill_level = null;

    if (isNewChat) {
      leetcode_url = leetcodeUrlInput.value.trim();
      skill_level = skillLevelSelect.value;
      if (!user_id || !question || !leetcode_url || !skill_level) {
        alert("Please fill in all required fields for a new chat.");
        return;
      }
      savedSkillLevel = skill_level;
      savedUserId = user_id;
      // Lock user ID once a chat starts.
      userIdInput.disabled = true;
    } else {
      if (!user_id || !question) {
        alert("User ID and doubt are required.");
        return;
      }
      skill_level = savedSkillLevel;
      leetcode_url = null;
    }

    // If continuing a chat, use currentSessionId; if new, session_id remains undefined.
    const session_id = isNewChat ? null : currentSessionId;

    chatContainer.style.display = "flex";

    let userMessage = question;
    if (isNewChat && leetcode_url) {
      userMessage += "\nLeetCode URL: " + leetcode_url;
    }
    appendMessage("user", userMessage);

    doubtInput.value = "";
    showLoading();

    const payload = {
      user_id: user_id,
      question: question,
      skill_level: skill_level,
    };
    if (isNewChat) {
      payload.leetcode_url = leetcode_url;
    }
    if (!isNewChat && session_id) {
      payload.session_id = session_id;
    }

    fetch("http://44.192.97.35:5000/api/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((response) =>
        response.json().then((data) => ({ ok: response.ok, data })),
      )
      .then(({ ok, data }) => {
        hideLoading();
        if (!ok) {
          appendMessage("assistant", "Error: " + data.detail);
        } else {
          let cleanedText = removeHeadings(data.answer);
          cleanedText = removeBoldSyntax(cleanedText);
          typeAssistantMessage(cleanedText);
          // When starting a new chat, store the session_id and refresh sessions.
          if (isNewChat) {
            currentSessionId = data.session_id;
            isNewChat = false;
            newChatFields.style.display = "none";
            fetchSessions(user_id);
          }
        }
      })
      .catch((error) => {
        hideLoading();
        appendMessage("assistant", "An error occurred. Please try again.");
        console.error("Fetch error:", error);
      });
  }

  function appendMessage(role, message) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", role);
    messageDiv.innerHTML = message;
    chatHistoryDiv.appendChild(messageDiv);
    chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
  }

  function showLoading() {
    loadingDiv.style.display = "flex";
  }
  function hideLoading() {
    loadingDiv.style.display = "none";
  }

  function typeAssistantMessage(fullText) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", "assistant");
    messageDiv.innerHTML = "";
    chatHistoryDiv.appendChild(messageDiv);

    let index = 0;
    let currentText = "";
    const formattedText = formatMarkdown(fullText);

    const typingInterval = setInterval(() => {
      if (index < formattedText.length) {
        currentText += formattedText.charAt(index);
        messageDiv.innerHTML = currentText;
        chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
        index++;
      } else {
        clearInterval(typingInterval);
        addCopyButtonsToCodeBlocks(messageDiv);
      }
    }, 15);
  }

  function removeHeadings(str) {
    return str.replace(/^###\s?.*$/gm, "").replace(/^\s*\n/gm, "");
  }
  function removeBoldSyntax(str) {
    return str.replace(/\*\*(.*?)\*\*/g, "$1");
  }
  function formatMarkdown(text) {
    let formatted = text.replace(/```([\s\S]*?)```/g, (match, code) => {
      return `<pre><code>${escapeHtml(code.trim())}</code></pre>`;
    });
    formatted = formatted.replace(/`([^`]+)`/g, (match, code) => {
      return `<code>${escapeHtml(code)}</code>`;
    });
    formatted = formatted.replace(/\n/g, "<br/>");
    return formatted;
  }
  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function addCopyButtonsToCodeBlocks(parentDiv) {
    const codeBlocks = parentDiv.querySelectorAll("pre code");
    codeBlocks.forEach((block) => {
      const copyBtn = document.createElement("button");
      copyBtn.innerText = "Copy";
      copyBtn.classList.add("copy-btn");
      copyBtn.addEventListener("click", () => {
        copyToClipboard(block.innerText);
      });
      block.parentNode.insertBefore(copyBtn, block);
    });
  }
  function copyToClipboard(text) {
    navigator.clipboard
      .writeText(text)
      .then(() => alert("Code copied to clipboard!"))
      .catch(() => alert("Failed to copy code."));
  }

  function renderChatSessions() {
    const existingList = document.getElementById("chatList");
    if (existingList) {
      existingList.innerHTML = "";
    } else {
      const chatListDiv = document.createElement("div");
      chatListDiv.classList.add("chat-list");
      chatListDiv.id = "chatList";
      const sidebar = document.getElementById("sidebar");
      sidebar.insertBefore(
        chatListDiv,
        document.getElementById("newChatSidebarBtn"),
      );
    }
    const chatListDiv = document.getElementById("chatList");
    chatSessions.forEach((session) => {
      const btn = document.createElement("button");
      btn.classList.add("nav-btn");
      btn.textContent = `Chat ${session.session_id.slice(0, 8)}`;
      chatListDiv.appendChild(btn);
      btn.addEventListener("click", () => {
        loadSession(session);
      });
    });
  }
});
