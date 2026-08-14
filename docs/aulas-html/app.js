(() => {
  const root = document.documentElement;
  const completedKey = "ess-completed-lessons";
  const objectiveKey = "ess-objectives";

  function readStoredList(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch {
      return [];
    }
  }

  function writeStoredList(key, values) {
    try {
      localStorage.setItem(key, JSON.stringify(values));
    } catch {
      // ponytail: local progress is optional; use the page normally when storage is unavailable.
    }
  }

  function applyTheme(theme) {
    root.dataset.theme = theme;
    const button = document.querySelector("[data-theme-toggle]");
    if (button) {
      button.textContent = theme === "dark" ? "☀" : "◐";
      button.setAttribute(
        "aria-label",
        theme === "dark" ? "Usar tema claro" : "Usar tema escuro",
      );
    }
  }

  let savedTheme = "";
  try {
    savedTheme = localStorage.getItem("ess-theme") || "";
  } catch {
    // Using the system preference is enough when storage is unavailable.
  }
  applyTheme(
    savedTheme ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
  );
  document
    .querySelector("[data-theme-toggle]")
    ?.addEventListener("click", () => {
      const theme = root.dataset.theme === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("ess-theme", theme);
      } catch {
        // Theme persistence is optional.
      }
      applyTheme(theme);
    });

  function updateCourseProgress() {
    const completed = readStoredList(completedKey);
    document.querySelectorAll("[data-lesson-card]").forEach((card) => {
      const done = completed.includes(Number(card.dataset.lesson));
      card.classList.toggle("done", done);
      card.querySelector("[data-card-status]").textContent = done
        ? "Concluída ✓"
        : "Estudar →";
    });
    const total = document.querySelectorAll("[data-lesson-card]").length;
    const label = document.querySelector("[data-course-progress]");
    const bar = document.querySelector("[data-course-progress-bar]");
    if (label) label.textContent = `${completed.length}/${total}`;
    if (bar)
      bar.style.width = `${total ? (completed.length / total) * 100 : 0}%`;
  }

  document
    .querySelector("[data-complete]")
    ?.addEventListener("click", (event) => {
      const lesson = Number(event.currentTarget.dataset.complete);
      const completed = readStoredList(completedKey);
      const next = completed.includes(lesson)
        ? completed.filter((item) => item !== lesson)
        : [...completed, lesson];
      writeStoredList(completedKey, next);
      event.currentTarget.textContent = next.includes(lesson)
        ? "Aula concluída ✓"
        : "Marcar aula como concluída";
      document.querySelector("[data-completion-status]").textContent =
        next.includes(lesson) ? "Progresso salvo neste navegador." : "";
    });
  updateCourseProgress();

  const storedObjectives = readStoredList(objectiveKey);
  document.querySelectorAll("[data-objective]").forEach((input) => {
    input.checked = storedObjectives.includes(input.dataset.objective);
    input.addEventListener("change", () => {
      const current = readStoredList(objectiveKey);
      const next = input.checked
        ? [...new Set([...current, input.dataset.objective])]
        : current.filter((item) => item !== input.dataset.objective);
      writeStoredList(objectiveKey, next);
    });
  });

  document.querySelectorAll("[data-check-answer]").forEach((button) => {
    button.addEventListener("click", () => {
      const question = button.closest("[data-answer]");
      const selected = question.querySelector("input:checked");
      const feedback = question.querySelector(".quiz-feedback");
      if (!selected) {
        feedback.textContent = "Escolha uma alternativa antes de conferir.";
        feedback.hidden = false;
        question.classList.remove("correct", "incorrect");
        return;
      }
      const correct = selected.value === question.dataset.answer;
      question.classList.toggle("correct", correct);
      question.classList.toggle("incorrect", !correct);
      feedback.hidden = false;
      feedback.textContent = `${correct ? "Correto. " : "Ainda não. "}${feedback.dataset.explanation || feedback.textContent}`;
      feedback.dataset.explanation = feedback.textContent.replace(
        /^(Correto\. |Ainda não\. )/,
        "",
      );
    });
  });

  const progress = document.querySelector("[data-reading-progress]");
  function updateReadingProgress() {
    if (!progress) return;
    const height = document.documentElement.scrollHeight - innerHeight;
    progress.style.width = `${height > 0 ? (scrollY / height) * 100 : 0}%`;
  }
  updateReadingProgress();
  addEventListener("scroll", updateReadingProgress, { passive: true });
})();
