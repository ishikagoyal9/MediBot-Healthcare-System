
      // ============================================
      // BACKEND CONFIGURATION
      // ============================================
      const API_BASE_URL = "https://medibot-healthcare-system.onrender.com";
      async function handleLogin(e) {
        e.preventDefault();

        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;

        // Show loading
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = "🔄 Logging in...";
        submitBtn.disabled = true;

        try {
          // Create FormData
          const formData = new FormData();
          formData.append("email", email);
          formData.append("password", password);

          // Call backend
          const response = await fetch(`${API_BASE_URL}/login`, {
            method: "POST",
            body: formData,
          });

          const data = await response.json();

          if (response.ok && data.status === "success") {
            // ✅ Login successful
            currentUser = data.user;

            // Store in localStorage for session persistence
            localStorage.setItem("medibot_user", JSON.stringify(data.user));

            alert("✅ Login Successful!\n\nWelcome back, " + data.user.name);

            closeLoginModal();
            openDashboard();
          } else {
            // ❌ Login failed
            alert(
              "❌ Login Failed!\n\n" + (data.message || "Invalid credentials")
            );
          }
        } catch (error) {
          console.error("Login error:", error);
          alert(
            "❌ Login Error!\n\n" +
              "Could not connect to server.\n" +
              "Please ensure backend is running:\n" +
              "uvicorn main:app --reload"
          );
        } finally {
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
        }
      }
      async function handleSignup(e) {
        e.preventDefault();

        const name = document.getElementById("signupName").value;
        const email = document.getElementById("signupEmail").value;
        const password = document.getElementById("signupPassword").value;

        // Validate
        if (!name || !email || !password) {
          alert("⚠️ Please fill all fields!");
          return;
        }

        if (password.length < 6) {
          alert("⚠️ Password must be at least 6 characters!");
          return;
        }

        // Show loading
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = "🔄 Creating account...";
        submitBtn.disabled = true;

        try {
          // Create FormData
          const formData = new FormData();
          formData.append("name", name);
          formData.append("email", email);
          formData.append("password", password);

          // Call backend
          const response = await fetch(`${API_BASE_URL}/register`, {
            method: "POST",
            body: formData,
          });

          const data = await response.json();

          if (response.ok && data.status === "success") {
            // ✅ Registration successful
            alert(
              "✅ Registration Successful!\n\n" +
                "Account created for: " +
                email +
                "\n\n" +
                "Please login to continue."
            );

            // Switch to login form
            showLogin();

            // Pre-fill email
            document.getElementById("loginEmail").value = email;
          } else {
            // ❌ Registration failed
            alert(
              "❌ Registration Failed!\n\n" + (data.message || "Unknown error")
            );
          }
        } catch (error) {
          console.error("Signup error:", error);
          alert(
            "❌ Registration Error!\n\n" +
              "Could not connect to server.\n" +
              "Please ensure backend is running:\n" +
              "uvicorn main:app --reload"
          );
        } finally {
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
        }
      }

      // ============================================
      // LOGOUT WITH SESSION CLEANUP
      // ============================================
      function handleLogout() {
        if (confirm("Are you sure you want to logout?")) {
          // Clear user data
          currentUser = null;
          localStorage.removeItem("medibot_user");

          // Clear other data
          uploadedReports = [];
          chatHistory = [];

          // Close all modals
          const dashboard = document.getElementById("dashboardOverlay");
          const bmiPage = document.getElementById("bmiPage");
          const chatWindow = document.getElementById("chatWindow");

          if (dashboard) dashboard.classList.remove("active");
          if (bmiPage) bmiPage.classList.remove("active");
          if (chatWindow) chatWindow.classList.remove("active");

          alert("✅ Logged out successfully!");
        }
      }

      // ============================================
      // CHECK SESSION ON PAGE LOAD
      // ============================================
      window.addEventListener("load", () => {
        console.log("MediBot Frontend Loaded");
        console.log("Backend URL:", API_BASE_URL);

        createParticles();
        checkBackendConnection();

        // ✨ NEW: Check if user was logged in
        const storedUser = localStorage.getItem("medibot_user");
        if (storedUser) {
          try {
            currentUser = JSON.parse(storedUser);
            console.log("✅ Session restored for:", currentUser.email);

            // Show notification
            setTimeout(() => {
              if (
                confirm(
                  "Welcome back, " +
                    currentUser.name +
                    "!\n\nWould you like to open your dashboard?"
                )
              ) {
                openDashboard();
              }
            }, 1000);
          } catch (e) {
            console.error("Error restoring session:", e);
            localStorage.removeItem("medibot_user");
          }
        }

        // Show disclaimer
        if (!sessionStorage.getItem("disclaimerShown")) {
          setTimeout(() => {
            const disclaimer =
              "⚠️ MEDICAL DISCLAIMER\n\n" +
              "MediBot provides general health information only.\n\n" +
              "This is NOT a substitute for professional medical advice.\n\n" +
              "Always consult your physician for medical conditions.\n\n" +
              "In emergency, call 108 or 112 immediately.";
            alert(disclaimer);
            sessionStorage.setItem("disclaimerShown", "true");
          }, 1000);
        }
      });

      // ============================================
      // UPDATE DASHBOARD WITH USER DATA
      // ============================================
      function openDashboard() {
        const dashboard = document.getElementById("dashboardOverlay");
        if (dashboard) {
          dashboard.classList.add("active");
        }

        if (currentUser) {
          const nameEl = document.getElementById("dashUserName");
          const emailEl = document.getElementById("dashUserEmail");
          const welcomeEl = document.getElementById("dashWelcomeName");

          if (nameEl) nameEl.textContent = currentUser.name;
          if (emailEl) emailEl.textContent = currentUser.email;
          if (welcomeEl) welcomeEl.textContent = currentUser.name.split(" ")[0];
        }

        displayReports();
      }
      let currentUser = null;
      let uploadedReports = [];
      let healthMetrics = {
        bp: "120/80",
        sugar: "95",
        weight: "68",
        heart: "72",
    };
      let chatHistory = [];
      let isBackendOnline = false;
      async function checkBackendConnection() {
        try {
          const response = await fetch(`${API_BASE_URL}/`, {
            method: "GET",
          });

          if (response.ok) {
            isBackendOnline = true;
            console.log("✓ Backend connected successfully");
            return true;
          } else {
            throw new Error("Server not responding");
          }
        } catch (error) {
          isBackendOnline = false;
          console.error("✗ Backend connection failed:", error);
          return false;
        }
      }
      async function sendChatMessage() {
        const input = document.getElementById("chatInput");
        const sendButton = document.getElementById("chatSend");
        const message = input.value.trim();

        if (!message) return;

        // Disable input while processing
        input.disabled = true;
        if (sendButton) sendButton.disabled = true;

        // Add user message to UI
        addChatMessage(message, "user");
        input.value = "";

        // Show typing indicator
        const typingId = addTypingIndicator();

        try {
          // Call your real backend API
          const formData = new FormData();
          formData.append("message", message);

          const response = await fetch(`${API_BASE_URL}/anaser`, {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error(
              `API Error: ${response.status} ${response.statusText}`
            );
          }

          const data = await response.json();
          // Remove typing indicator
          removeTypingIndicator(typingId);

          // Add bot response to UI
          if (data.response) {
            addChatMessage(data.response, "bot");

            // Store in history for context
            chatHistory.push({
              user: message,
              bot: data.response,
            });
          } else {
            addChatMessage(
              "Sorry, I received an empty response. Please try again.",
              "bot"
            );
          }
        } catch (error) {
          console.error("Chat Error:", error);
          removeTypingIndicator(typingId);

          // Fallback error message
          const errorMsg =
            `⚠️ <strong>Connection Error</strong><br><br>` +
            `I'm having trouble connecting to the server.<br><br>` +
            `<strong>Please ensure:</strong><br>` +
            `• Backend is running: <code>uvicorn main:app --reload</code><br>` +
            `• Server is at: ${API_BASE_URL}<br>` +
            `• Check console for more details<br><br>` +
            `<em>Error: ${error.message}</em>`;
          addChatMessage(errorMsg, "bot");
        } finally {
          // Re-enable input
          input.disabled = false;
          if (sendButton) sendButton.disabled = false;
          input.focus();
        }
      }

      // Add typing indicator
      function addTypingIndicator() {
        const container = document.getElementById("chatMessages");
        const typingDiv = document.createElement("div");
        const typingId = "typing-" + Date.now();
        typingDiv.id = typingId;
        typingDiv.className = "chat-message bot";
        typingDiv.innerHTML = `
        <div class="message-avatar bot-avatar">🤖</div>
        <div class="message-content">
            <em>Typing...</em>
        </div>`;
        container.appendChild(typingDiv);
        container.scrollTop = container.scrollHeight;
        return typingId;
      }

      // Remove typing indicator
      function removeTypingIndicator(typingId) {
        const typingDiv = document.getElementById(typingId);
        if (typingDiv) {
          typingDiv.remove();
        }
      }

      // Add message to chat UI
      function addChatMessage(text, type) {
        const container = document.getElementById("chatMessages");
        const messageDiv = document.createElement("div");
        messageDiv.className = `chat-message ${type}`;

        const avatar =
          type === "bot"
            ? '<div class="message-avatar bot-avatar">🤖</div>'
            : '<div class="message-avatar user-avatar-chat">👤</div>';

        messageDiv.innerHTML = `
        ${avatar}
        <div class="message-content">${text}</div>`;
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
      }

      // Handle Enter key press
      function handleChatKeyPress(e) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          sendChatMessage();
        }
      }

      // Toggle chat window
      function toggleChat() {
        const chatWindow = document.getElementById("chatWindow");
        chatWindow.classList.toggle("active");

        // Check connection when opening
        if (chatWindow.classList.contains("active")) {
          checkBackendConnection();
        }
      }

      // Open chat from dashboard
      function openChatFromDashboard() {
        document.getElementById("chatWindow").classList.add("active");
        checkBackendConnection();
      }
      function createParticles() {
        const container = document.getElementById("particles");
        if (!container) return;
        for (let i = 0; i < 30; i++) {
          const particle = document.createElement("div");
          particle.className = "particle";
          particle.style.width = Math.random() * 100 + 50 + "px";
          particle.style.height = particle.style.width;
          particle.style.left = Math.random() * 100 + "%";
          particle.style.top = Math.random() * 100 + "%";
          particle.style.animationDelay = Math.random() * 25 + "s";
          particle.style.animationDuration = Math.random() * 15 + 20 + "s";
          container.appendChild(particle);
        }
      }

      function scrollToSection(id) {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
        const navLinks = document.getElementById("navLinks");
        if (navLinks) {
          navLinks.classList.remove("active");
        }
      }

      function toggleMobileMenu() {
        const navLinks = document.getElementById("navLinks");
        if (navLinks) {
          navLinks.classList.toggle("active");
        }
      }

      function openLoginModal() {
        const modal = document.getElementById("loginModal");
        if (modal) {
          modal.classList.add("active");
          document.body.style.overflow = "hidden";
        }
      }

      function closeLoginModal() {
        const modal = document.getElementById("loginModal");
        if (modal) {
          modal.classList.remove("active");
          document.body.style.overflow = "auto";
        }
      }

      function showSignup() {
        const loginForm = document.getElementById("loginForm");
        const signupForm = document.getElementById("signupForm");
        if (loginForm) loginForm.style.display = "none";
        if (signupForm) signupForm.style.display = "block";
      }

      function showLogin() {
        const loginForm = document.getElementById("loginForm");
        const signupForm = document.getElementById("signupForm");
        if (loginForm) loginForm.style.display = "block";
        if (signupForm) signupForm.style.display = "none";
      }
      function openBMICalculator() {
        const dashboard = document.getElementById("dashboardOverlay");
        const bmiPage = document.getElementById("bmiPage");
        if (dashboard) dashboard.classList.remove("active");
        if (bmiPage) bmiPage.classList.add("active");
      }

      function backToDashboard() {
        const dashboard = document.getElementById("dashboardOverlay");
        const bmiPage = document.getElementById("bmiPage");
        if (bmiPage) bmiPage.classList.remove("active");
        if (dashboard) dashboard.classList.add("active");
      }

      function calculateBMI() {
        const height = parseFloat(document.getElementById("bmiHeight").value);
        const weight = parseFloat(document.getElementById("bmiWeight").value);

        if (!height || !weight || height <= 0 || weight <= 0) {
          alert("⚠️ Please enter valid height and weight values!");
          return;
        }

        const heightInMeters = height / 100;
        const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(1);

        let category = "";
        let advice = "";
        let color = "";

        if (bmi < 18.5) {
          category = "Underweight";
          advice =
            "You may need to gain weight. Consider a nutrient-rich diet with adequate calories. Consult a nutritionist for a personalized meal plan.";
          color = "#3b82f6";
        } else if (bmi >= 18.5 && bmi < 25) {
          category = "Normal Weight";
          advice =
            "Congratulations! You have a healthy weight. Maintain it with balanced diet and regular exercise.";
          color = "#10b981";
        } else if (bmi >= 25 && bmi < 30) {
          category = "Overweight";
          advice =
            "Consider losing weight through healthy diet and regular exercise. Aim for 30 minutes of physical activity daily.";
          color = "#f59e0b";
        } else {
          category = "Obese";
          advice =
            "It's important to work on weight reduction. Consult a doctor or dietitian for a safe weight loss plan.";
          color = "#ef4444";
        }

        document.getElementById("bmiValue").textContent = bmi;
        document.getElementById("bmiValue").style.color = color;
        document.getElementById("bmiCategory").textContent = category;
        document.getElementById("bmiCategory").style.color = color;
        document.getElementById("bmiAdvice").textContent = advice;
        document.getElementById("bmiResult").style.display = "block";

        document
          .getElementById("bmiResult")
          .scrollIntoView({ behavior: "smooth", block: "nearest" });
      }

      function openUploadReport() {
        const modal = document.getElementById("uploadModal");
        if (modal) {
          modal.classList.add("active");
          document.body.style.overflow = "hidden";
        }
      }

      function closeUploadModal() {
        const modal = document.getElementById("uploadModal");
        const success = document.getElementById("uploadSuccess");
        if (modal) modal.classList.remove("active");
        if (success) success.style.display = "none";
        document.body.style.overflow = "auto";
      }

      function handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
          if (file.size > 10 * 1024 * 1024) {
            alert("⚠️ File size exceeds 10MB limit!");
            return;
          }

          const success = document.getElementById("uploadSuccess");
          if (success) success.style.display = "block";

          setTimeout(() => {
            const report = {
              name: file.name,
              date: new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              }),
              type: file.type.includes("pdf") ? "PDF" : "Image",
              size: (file.size / 1024).toFixed(2) + " KB",
            };

            uploadedReports.push(report);
            displayReports();
            closeUploadModal();
          }, 2000);
        }
      }

      function displayReports() {
        const container = document.getElementById("reportsListDash");
        if (!container) return;

        if (uploadedReports.length === 0) {
          container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔭</div>
                <h3 style="color: #666; margin-bottom: 0.5rem;">No reports yet</h3>
                <p>Upload your first medical report to get started</p>
            </div>`;
          return;
        }

        const colors = [
          "linear-gradient(135deg, #10b981, #059669)",
          "linear-gradient(135deg, #3b82f6, #2563eb)",
          "linear-gradient(135deg, #8b5cf6, #7c3aed)",
          "linear-gradient(135deg, #f59e0b, #d97706)",
          "linear-gradient(135deg, #ef4444, #dc2626)",
        ];

        container.innerHTML = uploadedReports
          .map(
            (report, index) => `
        <div class="report-card" style="background: ${
          colors[index % colors.length]
        }">
            <h3 style="font-size: 1.2rem; margin-bottom: 0.5rem;">📄 ${
              report.name
            }</h3>
            <p style="opacity: 0.9; margin-bottom: 0.3rem;">${report.date}</p>
            <p style="font-size: 0.85rem; opacity: 0.8;">${report.type} • ${
              report.size
            }</p>
        </div>`)
          .join("");
      }

      function showEmergency() {
        const modal = document.getElementById("emergencyModal");
        if (modal) {
          modal.classList.add("active");
          document.body.style.overflow = "hidden";
        }
      }

      function closeEmergency() {
        const modal = document.getElementById("emergencyModal");
        if (modal) {
          modal.classList.remove("active");
          document.body.style.overflow = "auto";
        }
      }
// ============================================
// ✅ FIXED: Contact Form Handler
// ============================================
// Purana function ko replace karo isse:

async function handleContactSubmit(e) {
  e.preventDefault();
  
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.textContent;
  
  // Get form inputs
  const nameInput = form.querySelector('input[type="text"]');
  const emailInput = form.querySelector('input[type="email"]');
  const subjectInput = form.querySelectorAll('input[type="text"]')[1];
  const messageInput = form.querySelector('textarea');
  
  // Validate inputs
  if (!nameInput.value || !emailInput.value || !subjectInput.value || !messageInput.value) {
    alert('⚠️ Please fill all fields!');
    return;
  }
  
  // Create FormData
  const formData = new FormData();
  formData.append('name', nameInput.value.trim());
  formData.append('email', emailInput.value.trim());
  formData.append('subject', subjectInput.value.trim());
  formData.append('message', messageInput.value.trim());
  
  try {
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = '📤 Sending...';
    submitBtn.style.opacity = '0.7';
    
    // Check backend connection
    if (!isBackendOnline) {
      throw new Error('Backend is offline. Please start your FastAPI server.');
    }
    
    // Send to backend
    const response = await fetch(`${API_BASE_URL}/contact`, {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (response.ok && data.status === 'success') {
      // ✅ Success
      alert(
        '✅ Message Sent Successfully!\n\n' +
        data.message + '\n\n' +
        `Submission ID: #${data.submission_id}`
      );
      
      // Reset form
      form.reset();
      
      // Optional: Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
    } else {
      // ❌ Server returned error
      throw new Error(data.message || 'Unknown error occurred');
    }
    
  } catch (error) {
    console.error('❌ Contact form error:', error);
    
    // Show detailed error message
    alert(
      '❌ Failed to send message!\n\n' +
      `Error: ${error.message}\n\n` +
      '⚠️ Troubleshooting:\n' +
      '1. Ensure backend is running: uvicorn main:app --reload\n' +
      '2. Check backend URL: ' + API_BASE_URL + '\n' +
      '3. Check browser console for details'
    );
    
  } finally {
    // Reset button state
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;
    submitBtn.style.opacity = '1';
  }
}

// ============================================
// ✅ NEW: Admin Function to View Submissions
// ============================================
async function viewContactSubmissions() {
  try {
    const response = await fetch(`${API_BASE_URL}/get-contacts`);
    const data = await response.json();
    
    console.log('📧 Contact Submissions:', data);
    console.log(`Total: ${data.total_submissions}`);
    
    // Display in console
    data.submissions.forEach(sub => {
      console.log('\n-------------------');
      console.log(`ID: ${sub.id}`);
      console.log(`Name: ${sub.name}`);
      console.log(`Email: ${sub.email}`);
      console.log(`Subject: ${sub.subject}`);
      console.log(`Message: ${sub.message}`);
      console.log(`Time: ${sub.timestamp}`);
    });
    
    return data;
    
  } catch (error) {
    console.error('Error fetching submissions:', error);
  }
}

// ============================================
// ✅ Optional: Show submissions in modal
// ============================================
function showContactSubmissionsModal() {
  fetch(`${API_BASE_URL}/get-contacts`)
    .then(res => res.json())
    .then(data => {
      let html = `
        <h2>📧 Contact Form Submissions</h2>
        <p>Total: ${data.total_submissions}</p>
        <hr style="margin: 20px 0;">
      `;
      
      if (data.submissions.length === 0) {
        html += '<p style="text-align: center; color: #999;">No submissions yet.</p>';
      } else {
        data.submissions.reverse().forEach(sub => {
          html += `
            <div style="background: #f8f9ff; padding: 15px; border-radius: 10px; margin-bottom: 15px;">
              <strong>${sub.name}</strong> (${sub.email})<br>
              <strong>Subject:</strong> ${sub.subject}<br>
              <strong>Message:</strong> ${sub.message}<br>
              <small style="color: #666;">📅 ${sub.timestamp}</small>
            </div>
          `;
        });
      }
      
      // Show in article modal (reusing existing modal)
      const modal = document.getElementById('articleModal');
      const contentDiv = document.getElementById('articleContent');
      
      if (modal && contentDiv) {
        contentDiv.innerHTML = html;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    })
    .catch(error => {
      alert('Error loading submissions: ' + error.message);
    });
}

// ============================================
// Testing: Call in browser console
// ============================================
// viewContactSubmissions(); // View all submissions
// showContactSubmissionsModal(); // Show in modal
   

      function showArticleModal(e, articleKey) {
  e.preventDefault();
  
  const articles = {
    heart: {
      title: "Understanding Heart Health: Prevention Tips",
      emoji: "🫀",
      content: `
        <h2 style="color: var(--primary); margin-bottom: 1rem;">Understanding Heart Health: Prevention Tips</h2>
        <p style="color: #666; margin-bottom: 2rem;"> ⏱️ 5 min read</p>
        
        <p style="line-height: 1.8; margin-bottom: 1.5rem;">Your heart is one of the most vital organs in your body, working tirelessly to pump blood and oxygen throughout your system. Taking care of your heart should be a top priority for everyone, regardless of age.</p>
        
        <h3 style="color: var(--dark); margin: 2rem 0 1rem;">🥗 Diet & Nutrition</h3>
        <p style="line-height: 1.8; margin-bottom: 1rem;">A heart-healthy diet includes:</p>
        <ul style="line-height: 2; margin-bottom: 1.5rem; margin-left: 2rem;">
          <li>Plenty of fruits and vegetables</li>
          <li>Whole grains and fiber-rich foods</li>
          <li>Lean proteins like fish and poultry</li>
          <li>Healthy fats from nuts, avocados, and olive oil</li>
          <li>Limited sodium, sugar, and saturated fats</li>
        </ul>
        
        <h3 style="color: var(--dark); margin: 2rem 0 1rem;">💪 Exercise Regularly</h3>
        <p style="line-height: 1.8; margin-bottom: 1.5rem;">Aim for at least 150 minutes of moderate aerobic activity or 75 minutes of vigorous activity per week. Walking, swimming, cycling, and dancing are excellent choices.</p>
        
        <h3 style="color: var(--dark); margin: 2rem 0 1rem;">🚭 Quit Smoking</h3>
        <p style="line-height: 1.8; margin-bottom: 1.5rem;">Smoking is one of the biggest risk factors for heart disease. Your heart health begins to improve within hours of quitting.</p>
        
        <h3 style="color: var(--dark); margin: 2rem 0 1rem;">😴 Get Quality Sleep</h3>
        <p style="line-height: 1.8; margin-bottom: 1.5rem;">Adults should aim for 7-9 hours of quality sleep per night. Poor sleep is linked to high blood pressure and heart disease.</p>
        
        <div style="background: linear-gradient(135deg, #fff3cd, #fef3c7); padding: 1.5rem; border-radius: 15px; margin-top: 2rem; border: 2px solid #ffc107;">
          <p style="color: #856404; font-weight: 700;">⚠️ Remember: Regular check-ups with your healthcare provider are essential for monitoring your heart health!</p>
        </div>` },
    mental: {
      title: "Mental Wellness: Managing Stress in Modern Life",
      emoji: "🧠",
      content: `
        <h2 style="color: var(--primary); margin-bottom: 1rem;">Mental Wellness: Managing Stress in Modern Life</h2>
        <p style="color: #666; margin-bottom: 2rem;"> ⏱️ 7 min read</p>
        
        <p style="line-height: 1.8; margin-bottom: 1.5rem;">In today's fast-paced world, stress has become an inevitable part of daily life. However, managing stress effectively is crucial for maintaining both mental and physical health.</p>
        
        <h3 style="color: var(--dark); margin: 2rem 0 1rem;">🧘 Mindfulness & Meditation</h3>
        <p style="line-height: 1.8; margin-bottom: 1.5rem;">Even 10 minutes of daily meditation can significantly reduce stress levels. Apps like Headspace or Calm can help you get started.</p>
        
        <h3 style="color: var(--dark); margin: 2rem 0 1rem;">🤝 Social Connections</h3>
        <p style="line-height: 1.8; margin-bottom: 1.5rem;">Strong relationships with friends and family provide emotional support and reduce feelings of isolation and stress.</p>
        
        <h3 style="color: var(--dark); margin: 2rem 0 1rem;">⏰ Time Management</h3>
        <p style="line-height: 1.8; margin-bottom: 1rem;">Effective strategies include:</p>
        <ul style="line-height: 2; margin-bottom: 1.5rem; margin-left: 2rem;">
          <li>Prioritizing tasks using the Eisenhower Matrix</li>
          <li>Breaking large projects into smaller steps</li>
          <li>Learning to say "no" to unnecessary commitments</li>
          <li>Setting realistic goals and deadlines</li>
        </ul>
        
        <h3 style="color: var(--dark); margin: 2rem 0 1rem;">🎨 Hobbies & Creative Outlets</h3>
        <p style="line-height: 1.8; margin-bottom: 1.5rem;">Engaging in activities you enjoy helps reduce stress and provides a healthy escape from daily pressures.</p>
        
        <div style="background: linear-gradient(135deg, #dbeafe, #bfdbfe); padding: 1.5rem; border-radius: 15px; margin-top: 2rem; border: 2px solid #3b82f6;">
          <p style="color: #1e40af; font-weight: 700;">💡 Tip: If stress becomes overwhelming, don't hesitate to seek help from a mental health professional.</p>
        </div>`},
    nutrition: {
      title: "Nutrition Guide: Eating for Optimal Health",
      emoji: "🥗",
      content: `
        <h2 style="color: var(--primary); margin-bottom: 1rem;">Nutrition Guide: Eating for Optimal Health</h2>
        <p style="color: #666; margin-bottom: 2rem;"> ⏱️ 6 min read</p>
        
        <p style="line-height: 1.8; margin-bottom: 1.5rem;">Good nutrition is the foundation of good health. What you eat directly impacts your energy levels, mood, weight, and risk of chronic diseases.</p>
        
        <h3 style="color: var(--dark); margin: 2rem 0 1rem;">🍎 Balanced Diet Basics</h3>
        <p style="line-height: 1.8; margin-bottom: 1rem;">A healthy plate should include:</p>
        <ul style="line-height: 2; margin-bottom: 1.5rem; margin-left: 2rem;">
          <li><strong>50% Vegetables & Fruits</strong> - Variety of colors</li>
          <li><strong>25% Whole Grains</strong> - Brown rice, quinoa, whole wheat</li>
          <li><strong>25% Protein</strong> - Fish, poultry, beans, nuts</li>
          <li><strong>Healthy Fats</strong> - Olive oil, avocados, nuts</li>
        </ul>
        
        <h3 style="color: var(--dark); margin: 2rem 0 1rem;">💧 Hydration</h3>
        <p style="line-height: 1.8; margin-bottom: 1.5rem;">Drink 8-10 glasses of water daily. Proper hydration improves energy, digestion, and skin health.</p>
        
        <h3 style="color: var(--dark); margin: 2rem 0 1rem;">🚫 Foods to Limit</h3>
        <ul style="line-height: 2; margin-bottom: 1.5rem; margin-left: 2rem;">
          <li>Processed foods high in sodium</li>
          <li>Sugary drinks and desserts</li>
          <li>Trans fats and excessive saturated fats</li>
          <li>Refined carbohydrates</li>
        </ul>
        
        <h3 style="color: var(--dark); margin: 2rem 0 1rem;">⭐ Superfoods to Include</h3>
        <p style="line-height: 1.8; margin-bottom: 1.5rem;">Berries, leafy greens, nuts, seeds, fatty fish, legumes, and whole grains pack maximum nutrition.</p>
        
        <div style="background: linear-gradient(135deg, #d1fae5, #a7f3d0); padding: 1.5rem; border-radius: 15px; margin-top: 2rem; border: 2px solid #10b981;">
          <p style="color: #065f46; font-weight: 700;">✨ Remember: Small, consistent changes lead to lasting results. Don't aim for perfection!</p>
        </div>`},
    fitness: {
      title: "Fitness Fundamentals: Building a Sustainable Routine",
      emoji: "💪",
      content: `
        <h2 style="color: var(--primary); margin-bottom: 1rem;">Fitness Fundamentals: Building a Sustainable Routine</h2>
        <p style="color: #666; margin-bottom: 2rem;">⏱️ 8 min read</p>
        
        <p style="line-height: 1.8; margin-bottom: 1.5rem;">Starting a fitness journey can be overwhelming, but the key to success is creating a routine that fits your lifestyle and that you can maintain long-term.</p>
        
        <h3 style="color: var(--dark); margin: 2rem 0 1rem;">🎯 Setting Realistic Goals</h3>
        <p style="line-height: 1.8; margin-bottom: 1.5rem;">Use the SMART framework: Specific, Measurable, Achievable, Relevant, and Time-bound. Start small and build gradually.</p>
        
        <h3 style="color: var(--dark); margin: 2rem 0 1rem;">🏋️ Types of Exercise</h3>
        <ul style="line-height: 2; margin-bottom: 1.5rem; margin-left: 2rem;">
          <li><strong>Cardio</strong> - Running, cycling, swimming (150 min/week)</li>
          <li><strong>Strength Training</strong> - Weights, resistance bands (2-3 days/week)</li>
          <li><strong>Flexibility</strong> - Yoga, stretching (daily)</li>
          <li><strong>Balance</strong> - Tai chi, single-leg exercises</li>
        </ul>
        
        <h3 style="color: var(--dark); margin: 2rem 0 1rem;">📅 Creating Your Schedule</h3>
        <p style="line-height: 1.8; margin-bottom: 1.5rem;">Block out specific times for exercise. Morning workouts often have higher adherence rates. Find what works for your schedule.</p>
        
        <h3 style="color: var(--dark); margin: 2rem 0 1rem;">🔄 Progressive Overload</h3>
        <p style="line-height: 1.8; margin-bottom: 1.5rem;">Gradually increase weight, reps, or intensity every 2-3 weeks to continue making progress and avoid plateaus.</p>
        
        <h3 style="color: var(--dark); margin: 2rem 0 1rem;">😴 Recovery Matters</h3>
        <p style="line-height: 1.8; margin-bottom: 1.5rem;">Rest days are crucial! They allow muscles to repair and grow. Aim for 1-2 rest days per week.</p>
        
        <div style="background: linear-gradient(135deg, #fecaca, #fca5a5); padding: 1.5rem; border-radius: 15px; margin-top: 2rem; border: 2px solid #ef4444;">
          <p style="color: #991b1b; font-weight: 700;">⚠️ Always consult a doctor before starting a new exercise program, especially if you have existing health conditions.</p>
        </div>`},
    sleep: {
      title: "Sleep Science: The Foundation of Good Health",
      emoji: "😴",
      content: `
        <h2 style="color: var(--primary); margin-bottom: 1rem;">Sleep Science: The Foundation of Good Health</h2>
        <p style="color: #666; margin-bottom: 2rem;"> ⏱️ 5 min read</p>
        
        <p style="line-height: 1.8; margin-bottom: 1.5rem;">Quality sleep is essential for physical health, mental clarity, emotional well-being, and overall quality of life. Yet, millions struggle with sleep issues.</p>
        
        <h3 style="color: var(--dark); margin: 2rem 0 1rem;">😴 Why Sleep Matters</h3>
        <p style="line-height: 1.8; margin-bottom: 1rem;">During sleep, your body:</p>
        <ul style="line-height: 2; margin-bottom: 1.5rem; margin-left: 2rem;">
          <li>Repairs cells and tissues</li>
          <li>Consolidates memories</li>
          <li>Regulates hormones</li>
          <li>Strengthens immune system</li>
          <li>Removes brain toxins</li>
        </ul>
        
        <h3 style="color: var(--dark); margin: 2rem 0 1rem;">🛏️ Sleep Hygiene Tips</h3>
        <ul style="line-height: 2; margin-bottom: 1.5rem; margin-left: 2rem;">
          <li><strong>Consistent Schedule</strong> - Same bedtime/wake time daily</li>
          <li><strong>Cool, Dark Room</strong> - 60-67°F (15-19°C) is ideal</li>
          <li><strong>No Screens</strong> - Avoid blue light 1 hour before bed</li>
          <li><strong>Comfortable Bedding</strong> - Invest in quality mattress/pillows</li>
          <li><strong>Limit Caffeine</strong> - No caffeine after 2 PM</li>
        </ul>
        
        <h3 style="color: var(--dark); margin: 2rem 0 1rem;">🧘 Relaxation Techniques</h3>
        <p style="line-height: 1.8; margin-bottom: 1.5rem;">Try progressive muscle relaxation, deep breathing, or guided meditation to wind down before sleep.</p>
        
        <h3 style="color: var(--dark); margin: 2rem 0 1rem;">⏰ How Much Sleep Do You Need?</h3>
        <ul style="line-height: 2; margin-bottom: 1.5rem; margin-left: 2rem;">
          <li>Adults: 7-9 hours</li>
          <li>Teenagers: 8-10 hours</li>
          <li>Children: 9-12 hours</li>
        </ul>
        
        <div style="background: linear-gradient(135deg, #e0e7ff, #c7d2fe); padding: 1.5rem; border-radius: 15px; margin-top: 2rem; border: 2px solid #6366f1;">
          <p style="color: #312e81; font-weight: 700;">💤 If you consistently struggle with sleep, consult a doctor. Sleep disorders are treatable!</p>
        </div>`},
    meditation: {
      title: "Mindfulness & Meditation: A Beginner's Guide",
      emoji: "🧘",
      content: `
        <h2 style="color: var(--primary); margin-bottom: 1rem;">Mindfulness & Meditation: A Beginner's Guide</h2>
        <p style="color: #666; margin-bottom: 2rem;">  ⏱️ 6 min read</p>
        
        <p style="line-height: 1.8; margin-bottom: 1.5rem;">Meditation is a practice that trains your mind to focus and redirect thoughts. It's accessible to everyone and can be done anywhere, anytime.</p>
        
        <h3 style="color: var(--dark); margin: 2rem 0 1rem;">🌟 Benefits of Meditation</h3>
        <ul style="line-height: 2; margin-bottom: 1.5rem; margin-left: 2rem;">
          <li>Reduces stress and anxiety</li>
          <li>Improves focus and concentration</li>
          <li>Enhances self-awareness</li>
          <li>Promotes emotional health</li>
          <li>Lengthens attention span</li>
          <li>May reduce age-related memory loss</li>
        </ul>
        
        <h3 style="color: var(--dark); margin: 2rem 0 1rem;">🧘 Getting Started</h3>
        <p style="line-height: 1.8; margin-bottom: 1rem;"><strong>1. Find a Quiet Space</strong></p>
        <p style="line-height: 1.8; margin-bottom: 1.5rem;">Choose a calm, distraction-free environment.</p>
        
        <p style="line-height: 1.8; margin-bottom: 1rem;"><strong>2. Start Small</strong></p>
        <p style="line-height: 1.8; margin-bottom: 1.5rem;">Begin with just 5 minutes daily. Gradually increase as you feel comfortable.</p>
        
        <p style="line-height: 1.8; margin-bottom: 1rem;"><strong>3. Focus on Breathing</strong></p>
        <p style="line-height: 1.8; margin-bottom: 1.5rem;">Pay attention to each inhale and exhale. When your mind wanders, gently bring it back.</p>
        
        <p style="line-height: 1.8; margin-bottom: 1rem;"><strong>4. Be Patient</strong></p>
        <p style="line-height: 1.8; margin-bottom: 1.5rem;">It's normal for your mind to wander. That's part of the practice!</p>
        
        <h3 style="color: var(--dark); margin: 2rem 0 1rem;">🎯 Simple Techniques</h3>
        <ul style="line-height: 2; margin-bottom: 1.5rem; margin-left: 2rem;">
          <li><strong>Body Scan</strong> - Focus on each body part progressively</li>
          <li><strong>Breath Counting</strong> - Count each exhale up to 10, repeat</li>
          <li><strong>Loving-kindness</strong> - Send positive thoughts to yourself and others</li>
          <li><strong>Walking Meditation</strong> - Focus on each step mindfully</li>
        </ul>
        
        <div style="background: linear-gradient(135deg, #d1fae5, #a7f3d0); padding: 1.5rem; border-radius: 15px; margin-top: 2rem; border: 2px solid #10b981;">
          <p style="color: #065f46; font-weight: 700;">🎯 Tip: Consistency beats duration. 5 minutes daily is better than 30 minutes once a week!</p>
        </div>`
    }
  };
  const articleData = articles[articleKey];
  if (articleData) {
    const contentDiv = document.getElementById("articleContent");
    if (contentDiv) {
      contentDiv.innerHTML = articleData.content;
    }
  }
  
  const modal = document.getElementById("articleModal");
  if (modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }
}

      function closeArticleModal() {
        const modal = document.getElementById("articleModal");
        if (modal) {
          modal.classList.remove("active");
          document.body.style.overflow = "auto";
        }
      }

      function editHealthMetric(metric) {
        const metricNames = {
          bp: "Blood Pressure (e.g., 120/80)",
          sugar: "Blood Sugar (mg/dL)",
          weight: "Weight (kg)",
          heart: "Heart Rate (bpm)",
        };

        const newValue = prompt(
          `Enter your ${metricNames[metric]}:`,
          healthMetrics[metric]
        );
        if (newValue && newValue.trim()) {
          healthMetrics[metric] = newValue.trim();
          const element = document.getElementById(`${metric}Value`);
          if (element) {
            element.textContent = newValue.trim();
          }
        }
      }
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          closeLoginModal();
          closeUploadModal();
          closeEmergency();
          closeArticleModal();
          const chatWindow = document.getElementById("chatWindow");
          if (chatWindow) chatWindow.classList.remove("active");
        }
      });

      const uploadArea = document.getElementById("uploadArea");
      if (uploadArea) {
        uploadArea.addEventListener("dragover", (e) => {
          e.preventDefault();
          uploadArea.style.borderColor = "var(--primary)";
          uploadArea.style.background =
            "linear-gradient(135deg, #e8efff, #f5f7ff)";
        });

        uploadArea.addEventListener("dragleave", () => {
          uploadArea.style.borderColor = "#e5e5e5";
          uploadArea.style.background =
            "linear-gradient(135deg, #f8f9ff, #f5f7ff)";
        });

        uploadArea.addEventListener("drop", (e) => {
          e.preventDefault();
          uploadArea.style.borderColor = "#e5e5e5";
          uploadArea.style.background =
            "linear-gradient(135deg, #f8f9ff, #f5f7ff)";

          const files = e.dataTransfer.files;
          if (files.length > 0) {
            const event = { target: { files: [files[0]] } };
            handleFileUpload(event);
          }
        });
      }
      window.addEventListener("load", () => {
        console.log("MediBot Frontend Loaded");
        console.log("Backend URL:", API_BASE_URL);

        createParticles();
        checkBackendConnection();

        // Show disclaimer once per session
        if (!sessionStorage.getItem("disclaimerShown")) {
          setTimeout(() => {
            const disclaimer =
              "⚠️ MEDICAL DISCLAIMER\n\n" +
              "MediBot provides general health information only.\n\n" +
              "This is NOT a substitute for professional medical advice.\n\n" +
              "Always consult your physician for medical conditions.\n\n" +
              "In emergency, call 108 or 112 immediately.";
            alert(disclaimer);
            sessionStorage.setItem("disclaimerShown", "true");
          }, 1000);
        }
      });

      window.addEventListener("resize", () => {
        if (window.innerWidth > 968) {
          const navLinks = document.getElementById("navLinks");
          if (navLinks) {
            navLinks.classList.remove("active");
          }
        }
      });
      function displayReports() {
        const container = document.getElementById("reportsListDash");
        if (!container) return;

        if (uploadedReports.length === 0) {
          container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔭</div>
                <h3 style="color: #666; margin-bottom: 0.5rem;">No reports yet</h3>
                <p>Upload your first medical report to get started</p>
            </div>`;
          return;
        }

        const colors = [
          "linear-gradient(135deg, #10b981, #059669)",
          "linear-gradient(135deg, #3b82f6, #2563eb)",
          "linear-gradient(135deg, #8b5cf6, #7c3aed)",
          "linear-gradient(135deg, #f59e0b, #d97706)",
          "linear-gradient(135deg, #ef4444, #dc2626)",
        ];

        container.innerHTML = uploadedReports
          .map(
            (report, index) => `
        <div class="report-card" style="background: ${colors[index % colors.length]}; position: relative;">
            <button onclick="deleteReport(${index})" 
                    style="position: absolute; top: 1rem; right: 1rem; 
                           background: rgba(255,255,255,0.3); border: none; 
                           color: white; width: 35px; height: 35px; 
                           border-radius: 50%; cursor: pointer; 
                           font-size: 1.2rem; font-weight: bold;
                           transition: all 0.3s;"
                    onmouseover="this.style.background='rgba(255,255,255,0.5)'; this.style.transform='scale(1.1)'"
                    onmouseout="this.style.background='rgba(255,255,255,0.3)'; this.style.transform='scale(1)'">
                ×
            </button>
            <h3 style="font-size: 1.2rem; margin-bottom: 0.5rem; padding-right: 3rem;">📄 ${report.name}</h3>
            <p style="opacity: 0.9; margin-bottom: 0.3rem;">${report.date}</p>
            <p style="font-size: 0.85rem; opacity: 0.8;">${report.type} • ${report.size}</p>
            <button onclick="analyzeReport(${index})" 
                    style="margin-top: 1rem; padding: 0.6rem 1.2rem; 
                           background: rgba(255,255,255,0.9); 
                           border: none; border-radius: 10px; 
                           color: var(--primary); font-weight: 700; 
                           cursor: pointer; transition: all 0.3s;"
                    onmouseover="this.style.background='white'; this.style.transform='translateY(-2px)'"
                    onmouseout="this.style.background='rgba(255,255,255,0.9)'; this.style.transform='translateY(0)'">
                🔍 Analyze Report
            </button>
        </div>`)
          .join("");
      }
      
      function deleteReport(index) {
        if (confirm('Are you sure you want to delete this report?')) {
          uploadedReports.splice(index, 1);
          displayReports();
          alert('✅ Report deleted successfully!');
        }
      }
      
      async function analyzeReport(index) {
        const report = uploadedReports[index];
        
        if (!isBackendOnline) {
          alert('⚠️ Backend connection required for report analysis!\n\nPlease ensure your FastAPI server is running.');
          return;
        }
        
        // Show loading message
        const loadingMsg = `🔍 Analyzing ${report.name}...\n\nPlease wait while we process your medical report.`;
        alert(loadingMsg);
        
        try {
          // Create FormData with the report information
          const formData = new FormData();
          formData.append('report_name', report.name);
          formData.append('report_type', report.type);
          formData.append('report_date', report.date);
          
          // Call your backend API
          const response = await fetch(`${API_BASE_URL}/analyze-report`, {
            method: 'POST',
            body: formData
          });
          
          if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
          }
          const data = await response.json(); 
          // Display analysis results
          if (data.analysis) {
            showReportAnalysis(report, data.analysis);
          } else {
            alert('❌ No analysis data received from server.');
          }
          
        } catch (error) {
          console.error('Report Analysis Error:', error);
          alert(`❌ Error analyzing report:\n\n${error.message}\n\nPlease check your backend connection.`);
        }
      }
      
      function showReportAnalysis(report, analysis) {
        // Create and show analysis modal
        const modal = document.getElementById('articleModal');
        const contentDiv = document.getElementById('articleContent');
        
        if (modal && contentDiv) {
          contentDiv.innerHTML = `
            <h2 style="color: var(--primary); margin-bottom: 1rem;">📊 Report Analysis: ${report.name}</h2>
            <p style="color: #666; margin-bottom: 2rem;">Uploaded on ${report.date}</p>
            
            <div style="background: linear-gradient(135deg, #f8f9ff, #e8efff); padding: 2rem; border-radius: 20px; margin-bottom: 2rem; border: 3px solid var(--primary);">
              <h3 style="color: var(--dark); margin-bottom: 1rem;">🔍 AI Analysis Results</h3>
              <div style="line-height: 1.8; color: #333;">
                ${analysis}
              </div>
            </div>
            
            <div style="background: linear-gradient(135deg, #fff3cd, #fef3c7); padding: 1.5rem; border-radius: 15px; border: 2px solid #ffc107;">
              <p style="color: #856404; font-weight: 700;">⚠️ Medical Disclaimer: This AI analysis is for informational purposes only. Always consult your healthcare provider for professional medical advice.</p>
            </div>`;
          modal.classList.add('active');
          document.body.style.overflow = 'hidden';
        }
      }
