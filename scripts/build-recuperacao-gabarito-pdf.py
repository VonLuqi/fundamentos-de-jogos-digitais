#!/usr/bin/env python3
"""Gera o PDF A4 do gabarito da Prova de Recuperação (FJD).

Fonte: backend/src/Services/Prova/Exams/RecuperacaoQuestions.php (dump JSON via php).
Saída: docs/recuperacao/gabarito-recuperacao.pdf

Requer reportlab (não instalado no sistema): use um venv local, ex.
  python3 -m venv .venv-pdf && .venv-pdf/bin/pip install reportlab
  .venv-pdf/bin/python scripts/build-recuperacao-gabarito-pdf.py
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "backend/src/Services/Prova/Exams/RecuperacaoQuestions.php"
OUT = ROOT / "docs/recuperacao/gabarito-recuperacao.pdf"
FONT_DIR = Path("/usr/share/fonts/truetype/dejavu")

PHP_DUMP = (
    'require $argv[1]; use App\\Services\\Prova\\Exams\\RecuperacaoQuestions as R;'
    'echo json_encode(["q"=>R::QUESTIONS,"key"=>R::MC_ANSWER_KEY,"just"=>R::MC_JUSTIFICATIONS,'
    '"rub"=>R::DISCURSIVE_RUBRICS], JSON_UNESCAPED_UNICODE);'
)


def load() -> dict:
    raw = subprocess.run(["php", "-r", PHP_DUMP, str(SRC)], check=True, capture_output=True, text=True).stdout
    return json.loads(raw)


def p(text: str) -> str:
    return escape(text).replace("\n", "<br/>")


def main() -> None:
    pdfmetrics.registerFont(TTFont("DV", str(FONT_DIR / "DejaVuSans.ttf")))
    pdfmetrics.registerFont(TTFont("DV-B", str(FONT_DIR / "DejaVuSans-Bold.ttf")))
    pdfmetrics.registerFontFamily("DV", normal="DV", bold="DV-B", italic="DV", boldItalic="DV-B")

    d = load()
    accent = "#5b2a86"
    base = ParagraphStyle("b", fontName="DV", fontSize=9.5, leading=13.5)
    small = ParagraphStyle("s", parent=base, fontSize=8.5, leading=12)
    h1 = ParagraphStyle("h1", parent=base, fontName="DV-B", fontSize=14, leading=18, textColor=accent, spaceAfter=4)
    h2 = ParagraphStyle("h2", parent=base, fontName="DV-B", fontSize=10.5, leading=14, spaceBefore=6)
    cover_t = ParagraphStyle("ct", parent=base, fontName="DV-B", fontSize=24, leading=30, alignment=TA_CENTER, textColor=accent)
    cover_s = ParagraphStyle("cs", parent=base, fontSize=12, leading=18, alignment=TA_CENTER)

    def footer(c, doc):
        c.saveState()
        c.setFont("DV", 8)
        c.drawString(18 * mm, 10 * mm, "Recuperação FJD — Gabarito (uso do professor; não distribuir aos alunos)")
        c.drawRightString(A4[0] - 18 * mm, 10 * mm, f"Pág. {doc.page}")
        c.restoreState()

    s = []
    s += [Spacer(1, 55 * mm), Paragraph("Prova de Recuperação", cover_t), Spacer(1, 6 * mm),
          Paragraph("Fundamentos de Jogos Digitais — Gabarito comentado", cover_s), Spacer(1, 10 * mm),
          Paragraph("30 questões sobre as Aulas 01–08<br/>20 de múltipla escolha (3 pts) + 10 discursivas (4 pts) = 100 pontos<br/>"
                    "Duração: 120 min · 1 tentativa", cover_s), Spacer(1, 14 * mm),
          Paragraph("Documento confidencial do professor. Nota final de quem passar na recuperação = mínimo entre a nota da prova e 60.", cover_s)]

    # Resumo do gabarito
    s += [PageBreak(), Paragraph("Resumo do gabarito (múltipla escolha)", h1)]
    keys = list(d["key"].items())
    rows = []
    for i in range(0, 20, 5):
        rows.append([f"{k[1:]}: {v}" for k, v in keys[i:i + 5]])
    t = Table(rows, colWidths=[34 * mm] * 5)
    t.setStyle(TableStyle([("FONT", (0, 0), (-1, -1), "DV-B", 11), ("GRID", (0, 0), (-1, -1), 0.5, "#999999"),
                           ("ALIGN", (0, 0), (-1, -1), "CENTER"), ("TOPPADDING", (0, 0), (-1, -1), 6),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
    s += [t, Spacer(1, 6 * mm),
          Paragraph("Questões 21–30 são discursivas (4 pontos cada), corrigidas por IA com a rubrica abaixo; o professor pode ajustar qualquer nota.", base)]

    s += [PageBreak(), Paragraph("Parte 1 — Múltipla escolha (3 pontos cada)", h1)]
    for q in d["q"]:
        if q["type"] != "mc":
            continue
        ans = d["key"][q["id"]]
        block = [Paragraph(f"<b>{p(q['title'])}</b> — 3 pts", h2), Paragraph(p(q["prompt"]), base), Spacer(1, 2 * mm)]
        for letter, txt in q["choices"].items():
            mark = " ✔" if letter == ans else ""
            style = ParagraphStyle("c", parent=base, leftIndent=8 * mm, firstLineIndent=-5 * mm,
                                   fontName="DV-B" if letter == ans else "DV")
            block.append(Paragraph(f"{letter}) {p(txt)}{mark}", style))
        block += [Spacer(1, 1.5 * mm),
                  Paragraph(f"<b>Gabarito: {ans}.</b> {p(d['just'][q['id']])}", small), Spacer(1, 3 * mm)]
        s.append(KeepTogether(block))

    s += [PageBreak(), Paragraph("Parte 2 — Discursivas (4 pontos cada)", h1)]
    for q in d["q"]:
        if q["type"] != "discursive":
            continue
        r = d["rub"][q["id"]]
        s.append(PageBreak() if q["id"] != "q21" else Spacer(1, 0))
        s += [Paragraph(f"<b>{p(q['title'])}</b> — {r['maxPoints']} pts", h2),
              Paragraph(f"<b>Papel:</b> {p(q['role'])}", base),
              Paragraph(f"<b>Cenário:</b> {p(q['scenario'])}", base),
              Paragraph(f"<b>Missão:</b> {p(q['mission'])}", base),
              Paragraph("Resposta esperada (pontos-chave)", h2)]
        for e in r["expected"]:
            s.append(Paragraph("• " + p(e), ParagraphStyle("e", parent=base, leftIndent=5 * mm, firstLineIndent=-3 * mm)))
        s += [Paragraph(f"<b>Síntese:</b> {p(r['synthesis'])}", small), Paragraph("Rubrica", h2),
              Paragraph(f"<b>Foco:</b> {p(r['focus'])}", small),
              Paragraph(f"<b>Excelente (4):</b> {p(r['excellent'])}", small),
              Paragraph(f"<b>Proficiente (2,5–3,5):</b> {p(r['proficient'])}", small),
              Paragraph(f"<b>Em desenvolvimento (0–2):</b> {p(r['developing'])}", small)]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    SimpleDocTemplate(str(OUT), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm,
                      bottomMargin=18 * mm, title="Gabarito — Prova de Recuperação FJD",
                      author="Fundamentos de Jogos Digitais").build(s, onFirstPage=footer, onLaterPages=footer)
    print(f"OK {OUT}")


if __name__ == "__main__":
    main()
