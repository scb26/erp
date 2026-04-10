from __future__ import annotations

import html
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import ListFlowable, ListItem, Paragraph, Preformatted, SimpleDocTemplate, Spacer


ROOT = Path(__file__).resolve().parents[1]
INPUT_PATH = ROOT / "API-DOCUMENTATION.md"
OUTPUT_PATH = ROOT / "API-DOCUMENTATION.pdf"


def build_styles():
    styles = getSampleStyleSheet()

    return {
        "title": ParagraphStyle(
            "UnidexTitle",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=28,
            textColor=colors.HexColor("#0f5b92"),
            alignment=TA_CENTER,
            spaceAfter=10,
        ),
        "h1": ParagraphStyle(
            "UnidexH1",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=20,
            textColor=colors.HexColor("#0f5b92"),
            spaceBefore=8,
            spaceAfter=6,
        ),
        "h2": ParagraphStyle(
            "UnidexH2",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=17,
            textColor=colors.HexColor("#184f7e"),
            spaceBefore=7,
            spaceAfter=5,
        ),
        "body": ParagraphStyle(
            "UnidexBody",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#1d3345"),
            spaceAfter=4,
        ),
        "list": ParagraphStyle(
            "UnidexList",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            leftIndent=2,
            textColor=colors.HexColor("#1d3345"),
        ),
        "code": ParagraphStyle(
            "UnidexCode",
            parent=styles["Code"],
            fontName="Courier",
            fontSize=8.5,
            leading=11,
            leftIndent=8,
            rightIndent=8,
            backColor=colors.HexColor("#eef7ff"),
            borderColor=colors.HexColor("#bdd9f2"),
            borderWidth=0.5,
            borderPadding=6,
            borderRadius=4,
            spaceBefore=4,
            spaceAfter=8,
        ),
    }


def normalize_inline(text: str) -> str:
    text = text.strip()
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1 (\2)", text)
    text = text.replace("`", "")
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    return html.escape(text)


def flush_paragraph(story, styles, paragraph_lines):
    if not paragraph_lines:
      return

    paragraph = " ".join(line.strip() for line in paragraph_lines if line.strip())

    if paragraph:
        story.append(Paragraph(normalize_inline(paragraph), styles["body"]))

    paragraph_lines.clear()


def flush_code(story, styles, code_lines):
    if not code_lines:
        return

    story.append(Preformatted("\n".join(code_lines), styles["code"]))
    code_lines.clear()


def flush_list(story, styles, list_items, ordered=False):
    if not list_items:
        return

    bullet_type = "1" if ordered else "bullet"
    story.append(
        ListFlowable(
            [ListItem(Paragraph(normalize_inline(item), styles["list"])) for item in list_items],
            bulletType=bullet_type,
            leftIndent=16,
        )
    )
    story.append(Spacer(1, 4))
    list_items.clear()


def parse_markdown_to_story(markdown_text: str, styles):
    story = []
    paragraph_lines = []
    bullet_items = []
    ordered_items = []
    code_lines = []
    in_code_block = False

    lines = markdown_text.splitlines()

    for raw_line in lines:
        line = raw_line.rstrip("\n")
        stripped = line.strip()

        if stripped.startswith("```"):
            flush_paragraph(story, styles, paragraph_lines)
            flush_list(story, styles, bullet_items, ordered=False)
            flush_list(story, styles, ordered_items, ordered=True)

            if in_code_block:
                flush_code(story, styles, code_lines)
            in_code_block = not in_code_block
            continue

        if in_code_block:
            code_lines.append(line)
            continue

        if not stripped:
            flush_paragraph(story, styles, paragraph_lines)
            flush_list(story, styles, bullet_items, ordered=False)
            flush_list(story, styles, ordered_items, ordered=True)
            continue

        if stripped.startswith("# "):
            flush_paragraph(story, styles, paragraph_lines)
            flush_list(story, styles, bullet_items, ordered=False)
            flush_list(story, styles, ordered_items, ordered=True)
            story.append(Paragraph(normalize_inline(stripped[2:]), styles["title"]))
            story.append(Spacer(1, 6))
            continue

        if stripped.startswith("## "):
            flush_paragraph(story, styles, paragraph_lines)
            flush_list(story, styles, bullet_items, ordered=False)
            flush_list(story, styles, ordered_items, ordered=True)
            story.append(Paragraph(normalize_inline(stripped[3:]), styles["h1"]))
            continue

        if stripped.startswith("### "):
            flush_paragraph(story, styles, paragraph_lines)
            flush_list(story, styles, bullet_items, ordered=False)
            flush_list(story, styles, ordered_items, ordered=True)
            story.append(Paragraph(normalize_inline(stripped[4:]), styles["h2"]))
            continue

        if stripped.startswith("- "):
            flush_paragraph(story, styles, paragraph_lines)
            flush_list(story, styles, ordered_items, ordered=True)
            bullet_items.append(stripped[2:])
            continue

        ordered_match = re.match(r"^\d+\.\s+(.*)", stripped)
        if ordered_match:
            flush_paragraph(story, styles, paragraph_lines)
            flush_list(story, styles, bullet_items, ordered=False)
            ordered_items.append(ordered_match.group(1))
            continue

        paragraph_lines.append(stripped)

    flush_paragraph(story, styles, paragraph_lines)
    flush_list(story, styles, bullet_items, ordered=False)
    flush_list(story, styles, ordered_items, ordered=True)
    flush_code(story, styles, code_lines)

    return story


def add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#6d89a0"))
    canvas.drawRightString(doc.pagesize[0] - 18 * mm, 10 * mm, f"Page {doc.page}")
    canvas.restoreState()


def main():
    if not INPUT_PATH.exists():
        raise FileNotFoundError(f"Input file not found: {INPUT_PATH}")

    styles = build_styles()
    story = parse_markdown_to_story(INPUT_PATH.read_text(encoding="utf-8"), styles)

    doc = SimpleDocTemplate(
        str(OUTPUT_PATH),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=16 * mm,
        title="Unidex Customer API Documentation",
        author="OpenAI Codex",
    )

    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    print(f"Created PDF: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
