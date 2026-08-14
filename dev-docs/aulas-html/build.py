"""Build interactive study pages from the Software Security Engineering lessons."""

from dataclasses import dataclass
from html import escape
from pathlib import Path
import re

from lesson_data import GUIDES


SOURCE_DIRECTORY = Path(__file__).parents[1]
OUTPUT_DIRECTORY = Path(__file__).parent
LESSON_PATTERN = re.compile(r"^Aula (?P<number>\d{2})\.md$")


@dataclass(frozen=True)
class Lesson:
    """Represent one source transcript used to create a study page."""

    number: int
    source_name: str
    paragraphs: tuple[str, ...]

    @property
    def page_name(self) -> str:
        """Return the generated HTML file name."""

        return f"aula-{self.number:02d}.html"


def read_lessons() -> list[Lesson]:
    """Load all numbered lesson transcripts in numeric order.

    Returns:
        Parsed lessons available in the source directory.

    Raises:
        RuntimeError: If a lesson has no curated learning guide.
    """

    lessons = []
    for source_path in sorted(SOURCE_DIRECTORY.glob("Aula *.md")):
        match = LESSON_PATTERN.match(source_path.name)
        if match:
            number = int(match.group("number"))
            if number not in GUIDES:
                raise RuntimeError(f"Aula {number:02d} não possui guia didático.")
            lessons.append(parse_lesson(source_path, number))
    return lessons


def parse_lesson(source_path: Path, number: int) -> Lesson:
    """Extract readable transcript paragraphs from a Markdown source.

    Args:
        source_path: Markdown transcript file.
        number: Numeric lesson identifier.

    Returns:
        Lesson with source metadata and transcript paragraphs.
    """

    paragraphs: list[str] = []
    current_lines: list[str] = []

    def finish_paragraph() -> None:
        if current_lines:
            paragraphs.append(" ".join(current_lines))
            current_lines.clear()

    for line in source_path.read_text(encoding="utf-8").splitlines():
        stripped_line = line.strip()
        if not stripped_line or stripped_line.startswith("#"):
            finish_paragraph()
        else:
            current_lines.append(stripped_line)
    finish_paragraph()
    return Lesson(number, source_path.name, tuple(paragraphs))


def render_header(active_page: str) -> str:
    """Render the shared header for the study guide."""

    active_class = "active" if active_page == "index" else ""
    return f"""<header class="site-header">
  <a class="brand" href="index.html"><span class="brand-mark">ES</span><span><strong>Engenharia de Software Seguro</strong><small>Guia interativo de estudo</small></span></a>
  <nav class="site-nav" aria-label="Navegação principal"><a class="{active_class}" href="index.html">Aulas</a><a href="../Enunciado.md">Enunciado</a></nav>
  <button class="theme-toggle" type="button" data-theme-toggle aria-label="Alternar tema">◐</button>
</header>"""


def render_shell(title: str, active_page: str, content: str, body_class: str) -> str:
    """Wrap page content in the common accessible HTML shell."""

    return f"""<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Material interativo de estudo para a disciplina Engenharia de Software Seguro.">
  <title>{escape(title)} · Engenharia de Software Seguro</title>
  <link rel="stylesheet" href="style.css">
</head>
<body class="{body_class}" data-page="{active_page}">
  <a class="skip-link" href="#main-content">Pular para o conteúdo</a>
  <div class="progress-track" aria-hidden="true"><span data-reading-progress></span></div>
  {render_header(active_page)}
  <main id="main-content">{content}</main>
  <footer class="site-footer">Engenharia de Software Seguro · Material de revisão baseado nas transcrições das aulas.</footer>
  <script src="app.js" defer></script>
</body>
</html>"""


def render_concepts(concepts: tuple[tuple[str, str, str], ...]) -> str:
    """Render expandable concept cards.

    Args:
        concepts: Curated title, explanation, and application tuples.

    Returns:
        HTML for the concept card section.
    """

    cards = []
    for index, (title, explanation, application) in enumerate(concepts, 1):
        application_html = f"<p class=\"application\"><strong>Use na prática:</strong> {escape(application)}</p>" if application else ""
        cards.append(f"""<details class="concept-card" {'open' if index == 1 else ''}>
  <summary><span>{index:02d}</span><strong>{escape(title)}</strong><i>⌄</i></summary>
  <div><p>{escape(explanation)}</p>{application_html}</div>
</details>""")
    return "\n".join(cards)


def render_quiz(number: int, questions: tuple[tuple[str, tuple[str, str, str], int, str], ...]) -> str:
    """Render immediately checked multiple-choice questions.

    Args:
        number: Lesson identifier used to keep form controls unique.
        questions: Prompt, choices, correct index, and feedback tuples.

    Returns:
        HTML for the lesson quiz.
    """

    rendered_questions = []
    for question_index, (prompt, options, answer, feedback) in enumerate(questions, 1):
        options_html = "\n".join(
            f'<label><input type="radio" name="q{number}-{question_index}" value="{option_index}"><span>{escape(option)}</span></label>'
            for option_index, option in enumerate(options)
        )
        rendered_questions.append(f"""<fieldset class="quiz-question" data-answer="{answer}">
  <legend>{question_index}. {escape(prompt)}</legend>
  {options_html}
  <button type="button" data-check-answer>Conferir resposta</button>
  <p class="quiz-feedback" aria-live="polite" hidden>{escape(feedback)}</p>
</fieldset>""")
    return "\n".join(rendered_questions)


def render_lesson_page(lesson: Lesson, lessons: list[Lesson], index: int) -> str:
    """Render a complete interactive learning page for one lesson."""

    guide = GUIDES[lesson.number]
    objectives = "\n".join(
        f'<label class="objective"><input type="checkbox" data-objective="{lesson.number}-{objective_index}"><span>{escape(objective)}</span></label>'
        for objective_index, objective in enumerate(guide["objectives"], 1)
    )
    transcript = "\n".join(f"<p>{escape(paragraph)}</p>" for paragraph in lesson.paragraphs)
    previous = lessons[index - 1] if index else None
    following = lessons[index + 1] if index < len(lessons) - 1 else None
    previous_link = f'<a href="{previous.page_name}">← Aula {previous.number:02d}</a>' if previous else "<span>Início da sequência</span>"
    following_link = f'<a href="{following.page_name}">Aula {following.number:02d} →</a>' if following else "<span>Fim da sequência</span>"
    content = f"""<section class="lesson-hero">
  <p class="eyebrow">{escape(guide["module"])} · Aula {lesson.number:02d} de {len(lessons)}</p>
  <h1>{escape(guide["title"])}</h1>
  <p>{escape(guide["summary"])}</p>
  <div class="question-banner"><span>Pergunta-guia</span><strong>{escape(guide["question"])}</strong></div>
</section>
<section class="study-section objectives-section"><div><p class="eyebrow">Ao terminar</p><h2>Você deve conseguir</h2></div><div class="objectives">{objectives}</div></section>
<section class="study-section"><p class="eyebrow">Construa o conceito</p><h2>Ideias essenciais</h2><div class="concept-list">{render_concepts(guide["concepts"])}</div></section>
<section class="study-section quiz-section"><p class="eyebrow">Revisão ativa</p><h2>Teste seu entendimento</h2><p>Responda sem consultar o material. O feedback aparece imediatamente.</p><div class="quiz">{render_quiz(lesson.number, guide["quiz"])}</div></section>
<section class="study-section reflection"><p class="eyebrow">Fechamento</p><h2>Explique com suas palavras</h2><p>Como você aplicaria a pergunta-guia desta aula ao analisar um sistema real?</p><button type="button" class="complete-button" data-complete="{lesson.number}">Marcar aula como concluída</button><span class="completion-status" data-completion-status></span></section>
<details class="transcript"><summary>Ver transcrição integral da aula <span>⌄</span></summary><div>{transcript}</div><p class="source-label">Fonte: {escape(lesson.source_name)}</p></details>
<nav class="lesson-navigation" aria-label="Navegação entre aulas">{previous_link}<a href="index.html">Índice das aulas</a>{following_link}</nav>"""
    return render_shell(guide["title"], "lesson", content, "lesson-page")


def render_index(lessons: list[Lesson]) -> str:
    """Render the course index and learning progress overview."""

    cards = "\n".join(
        f"""<a class="lesson-card" data-lesson-card data-lesson="{lesson.number}" href="{lesson.page_name}">
  <span class="lesson-number">{lesson.number:02d}</span><span><small>{escape(GUIDES[lesson.number]["module"])}</small><strong>{escape(GUIDES[lesson.number]["title"])}</strong><em data-card-status>Estudar →</em></span>
</a>"""
        for lesson in lessons
    )
    content = f"""<section class="index-hero"><p class="eyebrow">Guia de estudo</p><h1>Engenharia de Software Seguro</h1><p>Aprenda os conceitos centrais da disciplina em {len(lessons)} aulas com explicações curadas, revisão ativa, quiz e transcrição de referência.</p><div class="course-progress"><span>Progresso do curso</span><strong data-course-progress>0/{len(lessons)}</strong><div><i data-course-progress-bar></i></div></div></section>
<section class="index-intro"><p>Comece pela primeira aula ou retome de onde parou. As aulas seguem a sequência: requisitos → ameaças → riscos → arquitetura → implementação → testes.</p></section>
<section class="lesson-grid" aria-label="Aulas da disciplina">{cards}</section>
<section class="support-links"><a href="video-tira-duvidas.html"><strong>Vídeo de tira-dúvidas</strong><span>Orientações complementares da disciplina →</span></a><a href="../Enunciado.md"><strong>Enunciado do trabalho</strong><span>Atividades e critérios acadêmicos →</span></a></section>"""
    return render_shell("Aulas", "index", content, "index-page")


def render_support_page() -> str:
    """Render the course Q&A transcript using the neutral course branding."""

    source_path = SOURCE_DIRECTORY / "Vídeo Tira-Dúvidas.md"
    content = "\n".join(
        f"<p>{escape(paragraph.strip())}</p>"
        for paragraph in source_path.read_text(encoding="utf-8").split("\n\n")
        if paragraph.strip() and not paragraph.startswith("#")
    )
    page = f"""<section class="lesson-hero"><p class="eyebrow">Material de apoio</p><h1>Vídeo de tira-dúvidas</h1><p>Orientações iniciais sobre quiz, grupos e a primeira entrega.</p></section><details class="transcript" open><summary>Transcrição do vídeo <span>⌄</span></summary><div>{content}</div></details><p class="source-label">Fonte: Vídeo Tira-Dúvidas.md</p>"""
    return render_shell("Vídeo de tira-dúvidas", "support", page, "lesson-page")


def build() -> None:
    """Generate the interactive guide and every lesson page."""

    lessons = read_lessons()
    if len(lessons) != len(GUIDES):
        raise RuntimeError("A quantidade de aulas e guias didáticos não coincide.")
    (OUTPUT_DIRECTORY / "index.html").write_text(render_index(lessons), encoding="utf-8")
    for index, lesson in enumerate(lessons):
        (OUTPUT_DIRECTORY / lesson.page_name).write_text(render_lesson_page(lesson, lessons, index), encoding="utf-8")
    (OUTPUT_DIRECTORY / "video-tira-duvidas.html").write_text(render_support_page(), encoding="utf-8")


if __name__ == "__main__":
    build()
