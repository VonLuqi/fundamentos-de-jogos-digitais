#!/usr/bin/env python3
"""Gera PDF imprimível A4 da folha de planejamento da Fase 1 (Aula 08).

Frente: identificação, legenda e listas.
Verso: mapa em grade ocupando a folha toda.

Saída: assets/docs/aulas/aula08-perfil-quantic/folha-fase1.pdf
"""

from __future__ import annotations

from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "docs" / "aulas" / "aula08-perfil-quantic" / "folha-fase1.pdf"

# Paleta preto e branco (fundo branco)
INK = (0, 0, 0)
MUTED = (0.35, 0.35, 0.35)
RULE = (0.55, 0.55, 0.55)
GRID = (0.65, 0.65, 0.65)

TITLE_SIZE = 13
BODY_SIZE = 9.5
SMALL_SIZE = 8.5


def section_bar(c: canvas.Canvas, title: str, x: float, y: float, width: float) -> float:
    """Título de seção em P&B com linha."""
    c.setFillColorRGB(*INK)
    c.setFont("Helvetica-Bold", BODY_SIZE)
    c.drawString(x, y, title)
    c.setStrokeColorRGB(*INK)
    c.setLineWidth(1.0)
    c.line(x, y - 4, x + width, y - 4)
    return y - 18


def blank_line(c: canvas.Canvas, x: float, y: float, width: float, label: str = "") -> float:
    c.setFillColorRGB(*INK)
    c.setFont("Helvetica", BODY_SIZE)
    if label:
        c.drawString(x, y, label)
        text_w = c.stringWidth(label, "Helvetica", BODY_SIZE)
        line_x = x + text_w + 6
    else:
        line_x = x
    c.setStrokeColorRGB(*RULE)
    c.setLineWidth(0.7)
    c.line(line_x, y - 2, x + width, y - 2)
    return y - 18


def footer(c: canvas.Canvas, page_w: float, margin_x: float, margin_bottom: float, right: str) -> None:
    c.setFillColorRGB(*MUTED)
    c.setFont("Helvetica", 7.5)
    c.drawString(margin_x, margin_bottom - 2, "Fundamentos de Jogos Digitais  ·  Módulo 2  ·  Aula 08")
    c.drawRightString(page_w - margin_x, margin_bottom - 2, right)
    c.setStrokeColorRGB(*INK)
    c.setLineWidth(0.8)
    c.line(margin_x, margin_bottom + 8, page_w - margin_x, margin_bottom + 8)


def draw_front(c: canvas.Canvas, page_w: float, page_h: float) -> None:
    margin_x = 18 * mm
    margin_top = 16 * mm
    margin_bottom = 16 * mm
    x = margin_x
    y = page_h - margin_top
    usable = page_w - 2 * margin_x
    pad = 10

    # —— Cabeçalho ——
    c.setFillColorRGB(*INK)
    c.setFont("Helvetica-Bold", TITLE_SIZE)
    c.drawString(x, y, "Labirinto de Moedas — Planejamento da Fase 1")
    y -= 16
    c.setFillColorRGB(*MUTED)
    c.setFont("Helvetica", SMALL_SIZE)
    c.drawString(x, y, "Aula 08  ·  Design direcionado  ·  Quantic Foundry  ·  Uma folha por aluno")
    y -= 10
    c.setStrokeColorRGB(*INK)
    c.setLineWidth(1.5)
    c.line(x, y, x + usable, y)
    y -= 22

    # —— Identificação ——
    c.setFillColorRGB(*INK)
    c.setFont("Helvetica", BODY_SIZE)
    c.drawString(x, y, "Nome:")
    c.setStrokeColorRGB(*RULE)
    c.setLineWidth(0.7)
    c.line(x + 32, y - 2, x + usable * 0.62, y - 2)
    c.drawString(x + usable * 0.66, y, "Data:")
    c.line(x + usable * 0.66 + 28, y - 2, x + usable, y - 2)
    y -= 20
    c.setFillColorRGB(*INK)
    c.setFont("Helvetica", BODY_SIZE)
    c.drawString(x, y, "Modo:   [ ] Solo      [ ] Dupla   (parceiro: _______________________________)")
    y -= 20
    c.drawString(x, y, "Trilha (escolha UMA):   [ ] Conquista      [ ] Ação")
    y -= 20
    y = blank_line(c, x, y, usable, "Perfil / motivações QF:")
    y = blank_line(c, x, y, usable)
    y -= 14

    # —— Legenda ——
    y = section_bar(c, "Legenda (use no mapa do verso)", x, y, usable)
    y -= 4
    c.setFillColorRGB(*INK)
    c.setFont("Helvetica", SMALL_SIZE)
    legend_rows = [
        "P  = plataforma / chão / parede          M  = moeda comum (coleta Aula 07)",
        "*  = moeda brilhante / difícil           S  = área / caminho secreto",
        "V  = plataforma móvel (trilha Ação)     >  = início do Player     X  = meta (opcional)",
    ]
    for row in legend_rows:
        c.drawString(x + pad, y, row)
        y -= 14
    y -= 8

    c.setFillColorRGB(*MUTED)
    c.setFont("Helvetica-Oblique", SMALL_SIZE)
    c.drawString(x + pad, y, "Mapa em grade no verso desta folha — folha inteira para desenhar.")
    y -= 20

    # —— Lista rápida ——
    y = section_bar(c, "Lista rápida — o que vai no mapa", x, y, usable)
    y -= 4
    c.setFillColorRGB(*INK)
    c.setFont("Helvetica-Bold", SMALL_SIZE)
    c.drawString(x + pad, y, "Plataformas (mín. 3 trechos / alturas)")
    y -= 16
    for i in range(1, 4):
        y = blank_line(c, x + pad, y, usable - pad, f"{i})")
    y -= 6

    c.setFont("Helvetica-Bold", SMALL_SIZE)
    c.setFillColorRGB(*INK)
    c.drawString(x + pad, y, "Moedas (onde e por quê — fácil vs difícil)")
    y -= 16
    for i in range(1, 4):
        y = blank_line(c, x + pad, y, usable - pad, f"{i})")
    y -= 8

    c.setFont("Helvetica-Bold", SMALL_SIZE)
    c.drawString(x + pad, y, "Se CONQUISTA — segredo + *")
    y -= 16
    y = blank_line(c, x + pad, y, usable - pad, "Desvio / gap / altura:")
    y = blank_line(c, x + pad, y, usable - pad, "Por que é difícil?")
    y -= 8

    c.setFont("Helvetica-Bold", SMALL_SIZE)
    c.setFillColorRGB(*INK)
    c.drawString(x + pad, y, "Se AÇÃO — plataforma móvel V")
    y -= 16
    y = blank_line(c, x + pad, y, usable - pad, "Onde fica?")
    y = blank_line(c, x + pad, y, usable - pad, "Timing / desvio:")
    y -= 14

    # —— Fora do escopo ——
    y = section_bar(c, "Fora do escopo nesta fase (≥3)", x, y, usable)
    y -= 4
    for i in range(1, 4):
        y = blank_line(c, x + pad, y, usable - pad, f"{i})")

    footer(c, page_w, margin_x, margin_bottom, "Frente  ·  1 por aluno")


def draw_back(c: canvas.Canvas, page_w: float, page_h: float) -> None:
    """Verso: mapa grande ocupando quase toda a folha."""
    margin_x = 12 * mm
    margin_top = 12 * mm
    margin_bottom = 14 * mm
    x = margin_x
    y = page_h - margin_top
    usable = page_w - 2 * margin_x
    pad = 8

    c.setFillColorRGB(*INK)
    c.setFont("Helvetica-Bold", TITLE_SIZE)
    c.drawString(x, y, "Mapa da Fase 1 — plataformas (P) e moedas (M / *)")
    y -= 14
    c.setFillColorRGB(*MUTED)
    c.setFont("Helvetica", SMALL_SIZE)
    c.drawString(
        x,
        y,
        "Vista de lado (plataforma 2D). Comece na esquerda.  P  M  *  S  O  >  X",
    )
    y -= 8
    c.setStrokeColorRGB(*INK)
    c.setLineWidth(1.2)
    c.line(x, y, x + usable, y)
    y -= 14

    # Grade maximizada (fundo branco)
    cols = 20
    rows = 14
    label_gutter = 16
    top_label = 12
    bottom_note = 22
    available_w = usable - label_gutter
    available_h = y - margin_bottom - bottom_note - top_label
    cell = min(available_w / cols, available_h / rows)
    grid_w = cols * cell
    grid_h = rows * cell
    ox = x + label_gutter + (available_w - grid_w) / 2
    header_y = y
    oy = header_y - top_label - grid_h

    c.setFillColorRGB(*MUTED)
    c.setFont("Courier", 8)
    for col in range(cols):
        c.drawCentredString(ox + col * cell + cell / 2, header_y - 2, str(col))

    c.setStrokeColorRGB(*GRID)
    c.setLineWidth(0.55)
    for row in range(rows + 1):
        yy = oy + row * cell
        c.line(ox, yy, ox + grid_w, yy)
    for col in range(cols + 1):
        xx = ox + col * cell
        c.line(xx, oy, xx, oy + grid_h)

    c.setStrokeColorRGB(*INK)
    c.setLineWidth(1.2)
    c.rect(ox, oy, grid_w, grid_h, stroke=1, fill=0)

    c.setFillColorRGB(*MUTED)
    c.setFont("Courier", 8)
    for row in range(rows):
        c.drawRightString(ox - 5, oy + (rows - 1 - row) * cell + cell * 0.32, str(rows - 1 - row))

    c.setFillColorRGB(*MUTED)
    c.setFont("Helvetica-Oblique", SMALL_SIZE)
    c.drawString(x + pad, oy - 16, "Cada célula ≈ um passo do Player. Desenhe à mão — use a legenda da frente.")

    footer(c, page_w, margin_x, margin_bottom, "Verso  ·  mapa")


def paint_white(c: canvas.Canvas, page_w: float, page_h: float) -> None:
    c.setFillColorRGB(1, 1, 1)
    c.rect(0, 0, page_w, page_h, stroke=0, fill=1)


def build() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT), pagesize=A4)
    page_w, page_h = A4

    paint_white(c, page_w, page_h)
    draw_front(c, page_w, page_h)
    c.showPage()
    paint_white(c, page_w, page_h)
    draw_back(c, page_w, page_h)
    c.save()
    print(f"PDF: {OUT}")


if __name__ == "__main__":
    build()
