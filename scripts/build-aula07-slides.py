#!/usr/bin/env python3
"""Gera os slides da Aula 07 a partir do template visual da Aula 01.

Saídas:
  assets/docs/aulas/aula07_papeis_workflow_slides.pptx
  assets/docs/aulas/aula07_papeis_workflow_slides.pdf  (via PowerPoint COM, se disponível)
"""

from __future__ import annotations

import sys
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Emu, Inches, Pt
from pptx.oxml import parse_xml

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "docs" / "aulas" / "aula01_godot_slides.pptx"
OUT_PPTX = ROOT / "assets" / "docs" / "aulas" / "aula07_papeis_workflow_slides.pptx"
OUT_PDF = ROOT / "assets" / "docs" / "aulas" / "aula07_papeis_workflow_slides.pdf"

BG = RGBColor(0x0D, 0x0A, 0x10)
PANEL = RGBColor(0x18, 0x12, 0x1A)
GOLD = RGBColor(0xCF, 0xA7, 0x59)
GOLD_BRIGHT = RGBColor(0xF2, 0xD5, 0x9A)
GOLD_DARK = RGBColor(0x7A, 0x5C, 0x2E)
TEXT = RGBColor(0xEC, 0xE1, 0xD1)
TEXT_DIM = RGBColor(0xAB, 0x9C, 0x8A)
BLOOD = RGBColor(0x7A, 0x1F, 0x2B)

TITLE_FONT = "Cinzel"
BODY_FONT = "Georgia"
FOOTER = "AULA 07 | MÓDULO 2"


def _set_run(run, *, size_pt, bold=False, color=TEXT, font=BODY_FONT):
    run.font.size = Pt(size_pt)
    run.font.bold = bold
    run.font.color.rgb = color
    run.font.name = font
    rPr = run._r.get_or_add_rPr()
    for tag in ("latin", "cs", "ea"):
        el = rPr.find(qn(f"a:{tag}"))
        if el is None:
            el = parse_xml(
                f'<a:{tag} xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" typeface="{font}"/>'
            )
            rPr.append(el)
        else:
            el.set("typeface", font)


def _clear_paragraphs(tf):
    p = tf.paragraphs[0]
    p.clear()
    for extra in list(tf.paragraphs)[1:]:
        p_elem = extra._p
        p_elem.getparent().remove(p_elem)
    return tf.paragraphs[0]


def add_textbox(slide, left, top, width, height, *, word_wrap=True):
    box = slide.shapes.add_textbox(left, top, width, height)
    tf = box.text_frame
    tf.word_wrap = word_wrap
    return box, tf


def write_lines(tf, lines, *, size_pt=18, bold=False, color=TEXT, font=BODY_FONT, align=PP_ALIGN.LEFT, space_after=6):
    first = True
    for item in lines:
        if isinstance(item, tuple):
            text, opts = item[0], item[1]
        else:
            text, opts = item, {}
        p = _clear_paragraphs(tf) if first else tf.add_paragraph()
        first = False
        p.alignment = opts.get("align", align)
        p.space_after = Pt(opts.get("space_after", space_after))
        run = p.add_run()
        run.text = text
        _set_run(
            run,
            size_pt=opts.get("size", size_pt),
            bold=opts.get("bold", bold),
            color=opts.get("color", color),
            font=opts.get("font", font),
        )


def paint_background(slide, width, height):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Emu(0), Emu(0), width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = BG
    shape.line.fill.background()
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Emu(0), Emu(0), width, Inches(0.06))
    bar.fill.solid()
    bar.fill.fore_color.rgb = GOLD_DARK
    bar.line.fill.background()
    foot = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, Emu(0), height - Inches(0.08), width, Inches(0.08)
    )
    foot.fill.solid()
    foot.fill.fore_color.rgb = GOLD_DARK
    foot.line.fill.background()


def add_footer(slide, width, height, text=FOOTER):
    _, tf = add_textbox(
        slide,
        Inches(0.5),
        height - Inches(0.45),
        width - Inches(1.0),
        Inches(0.3),
    )
    write_lines(tf, [text], size_pt=10, color=TEXT_DIM, font=TITLE_FONT, align=PP_ALIGN.LEFT)


def add_num_badge(slide, number: str):
    badge = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.45), Inches(0.28), Inches(0.7), Inches(0.42))
    badge.fill.solid()
    badge.fill.fore_color.rgb = BLOOD
    badge.line.color.rgb = GOLD
    badge.line.width = Pt(1)
    tf = badge.text_frame
    tf.word_wrap = False
    p = _clear_paragraphs(tf)
    p.alignment = PP_ALIGN.CENTER
    run = p.add_run()
    run.text = number
    _set_run(run, size_pt=14, bold=True, color=GOLD_BRIGHT, font=TITLE_FONT)


def add_title(slide, title: str, left=Inches(1.35), top=Inches(0.28), width=Inches(8.2)):
    _, tf = add_textbox(slide, left, top, width, Inches(0.55))
    write_lines(tf, [title], size_pt=22, bold=True, color=GOLD_BRIGHT, font=TITLE_FONT)


def add_panel(slide, left, top, width, height):
    panel = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    panel.fill.solid()
    panel.fill.fore_color.rgb = PANEL
    panel.line.color.rgb = GOLD_DARK
    panel.line.width = Pt(1.25)
    return panel


def delete_all_slides(prs: Presentation):
    sldIdLst = prs.slides._sldIdLst
    for sldId in list(sldIdLst):
        rId = sldId.get(qn("r:id"))
        prs.part.drop_rel(rId)
        sldIdLst.remove(sldId)


def new_slide(prs: Presentation):
    layout = prs.slide_layouts[0]
    slide = prs.slides.add_slide(layout)
    for shape in list(slide.shapes):
        sp = shape._element
        sp.getparent().remove(sp)
    paint_background(slide, prs.slide_width, prs.slide_height)
    return slide


def build_deck() -> Presentation:
    if not SRC.exists():
        raise SystemExit(f"Template não encontrado: {SRC}")

    prs = Presentation(str(SRC))
    delete_all_slides(prs)
    W, H = prs.slide_width, prs.slide_height

    # 1 — Capa
    s = new_slide(prs)
    add_num_badge(s, "07")
    _, tf = add_textbox(s, Inches(0.7), Inches(1.25), Inches(8.6), Inches(2.1))
    write_lines(
        tf,
        [
            ("Aula 07: Papéis, Workflow e", {"size": 24, "bold": True, "color": GOLD_BRIGHT, "font": TITLE_FONT, "space_after": 6}),
            ("Versionamento Visual", {"size": 24, "bold": True, "color": GOLD_BRIGHT, "font": TITLE_FONT, "space_after": 16}),
            ("Equipes · Labirinto de Moedas 2D · pastas Godot e pasta compartilhada", {"size": 14, "color": TEXT_DIM, "font": BODY_FONT}),
        ],
    )
    add_panel(s, Inches(0.7), Inches(3.7), Inches(4.6), Inches(0.9))
    _, tf = add_textbox(s, Inches(0.9), Inches(3.85), Inches(4.2), Inches(0.7))
    write_lines(
        tf,
        [
            ("MÓDULO 2", {"size": 12, "bold": True, "color": GOLD, "font": TITLE_FONT, "space_after": 2}),
            ("INTRODUÇÃO AO GDSCRIPT “DO ZERO”", {"size": 11, "color": TEXT, "font": BODY_FONT}),
        ],
    )
    add_footer(s, W, H)

    # 2 — Onde estamos
    s = new_slide(prs)
    add_num_badge(s, "01")
    add_title(s, "Onde estamos na trilha")
    steps = [
        ("AULA 06", "Loja ética\n(GDScript UI)"),
        ("AULA 07", "Equipe + escopo\n+ pastas"),
        ("AULA 08+", "Construir o\nLabirinto"),
    ]
    for i, (k, v) in enumerate(steps):
        left = Inches(0.5 + i * 3.15)
        add_panel(s, left, Inches(1.4), Inches(3.0), Inches(2.5))
        _, tf = add_textbox(s, left + Inches(0.2), Inches(1.65), Inches(2.6), Inches(2.1))
        lines = [
            (k, {"size": 14, "bold": True, "color": GOLD_BRIGHT, "font": TITLE_FONT, "align": PP_ALIGN.CENTER, "space_after": 12}),
        ]
        for part in v.split("\n"):
            lines.append((part, {"size": 13, "color": TEXT, "align": PP_ALIGN.CENTER, "space_after": 2}))
        write_lines(tf, lines)
        if i < 2:
            _, tf = add_textbox(s, left + Inches(2.7), Inches(2.4), Inches(0.6), Inches(0.4))
            write_lines(tf, [("→", {"size": 20, "bold": True, "color": GOLD, "font": TITLE_FONT, "align": PP_ALIGN.CENTER})])
    add_footer(s, W, H)

    # 3 — Ementa
    s = new_slide(prs)
    add_num_badge(s, "02")
    add_title(s, "Tópico da ementa")
    add_panel(s, Inches(0.55), Inches(1.4), Inches(8.9), Inches(2.8))
    _, tf = add_textbox(s, Inches(0.9), Inches(1.9), Inches(8.2), Inches(2.0))
    write_lines(
        tf,
        [
            ("Papéis no desenvolvimento de jogos", {"size": 20, "bold": True, "color": GOLD_BRIGHT, "font": TITLE_FONT, "align": PP_ALIGN.CENTER, "space_after": 8}),
            ("e Workflow de desenvolvimento", {"size": 20, "bold": True, "color": GOLD_BRIGHT, "font": TITLE_FONT, "align": PP_ALIGN.CENTER, "space_after": 14}),
            ("Scope Creep · quadro de equipe · versionamento visual na Godot.", {"size": 14, "color": TEXT_DIM, "align": PP_ALIGN.CENTER}),
        ],
    )
    add_footer(s, W, H)

    # 4 — Cinco ofícios
    s = new_slide(prs)
    add_num_badge(s, "03")
    add_title(s, "Cinco ofícios do estúdio")
    cards = [
        ("GAME DESIGN", "O que é divertido?\nRegras · GDD · loops"),
        ("PROGRAMAÇÃO", "Como funciona?\nScripts · cenas · bugs"),
        ("ARTE", "O que se vê?\nSprites · tiles · UI"),
        ("ÁUDIO", "O que se ouve?\nSFX · música · feedback"),
        ("PRODUÇÃO", "Quando e até onde?\nCronograma · escopo"),
    ]
    for i, (k, v) in enumerate(cards):
        left = Inches(0.35 + i * 1.95)
        add_panel(s, left, Inches(1.2), Inches(1.85), Inches(3.2))
        _, tf = add_textbox(s, left + Inches(0.1), Inches(1.4), Inches(1.65), Inches(2.9))
        lines = [
            (k, {"size": 11, "bold": True, "color": GOLD_BRIGHT, "font": TITLE_FONT, "align": PP_ALIGN.CENTER, "space_after": 10}),
        ]
        for part in v.split("\n"):
            lines.append((part, {"size": 11, "color": TEXT, "align": PP_ALIGN.CENTER, "space_after": 2}))
        write_lines(tf, lines)
    add_footer(s, W, H)

    # 5 — Indie = muitos chapéus
    s = new_slide(prs)
    add_num_badge(s, "04")
    add_title(s, "Indie = muitos chapéus")
    add_panel(s, Inches(0.55), Inches(1.25), Inches(8.9), Inches(3.15))
    _, tf = add_textbox(s, Inches(0.9), Inches(1.55), Inches(8.2), Inches(2.7))
    write_lines(
        tf,
        [
            ("A mesma pessoa veste vários ofícios.", {"size": 18, "bold": True, "color": GOLD_BRIGHT, "font": TITLE_FONT, "align": PP_ALIGN.CENTER, "space_after": 14}),
            ("Mesmo assim: nomeie a dona(o) de cada entrega.", {"size": 15, "color": TEXT, "align": PP_ALIGN.CENTER, "space_after": 10}),
            ("Sem dono no quadro, ninguém é responsável.", {"size": 13, "color": TEXT_DIM, "align": PP_ALIGN.CENTER}),
        ],
    )
    add_footer(s, W, H)

    # 6 — Workflow em etapas
    s = new_slide(prs)
    add_num_badge(s, "05")
    add_title(s, "Workflow em etapas")
    steps = [
        ("IDEIA", "Sonho\ninicial"),
        ("MVP", "Escopo\nfechado"),
        ("PRODUÇÃO", "Por\npapel"),
        ("INTEGRAÇÃO", "Juntar\ncedo"),
        ("PLAYTEST", "Cortar\nou seguir"),
    ]
    for i, (k, v) in enumerate(steps):
        left = Inches(0.35 + i * 1.95)
        add_panel(s, left, Inches(1.4), Inches(1.85), Inches(2.6))
        _, tf = add_textbox(s, left + Inches(0.1), Inches(1.65), Inches(1.65), Inches(2.2))
        lines = [
            (k, {"size": 12, "bold": True, "color": GOLD_BRIGHT, "font": TITLE_FONT, "align": PP_ALIGN.CENTER, "space_after": 10}),
        ]
        for part in v.split("\n"):
            lines.append((part, {"size": 12, "color": TEXT, "align": PP_ALIGN.CENTER, "space_after": 2}))
        write_lines(tf, lines)
    add_footer(s, W, H)

    # 7 — Scope Creep
    s = new_slide(prs)
    add_num_badge(s, "06")
    add_title(s, "Scope Creep — o monstro amigável")
    cards = [
        ("O QUE É", "O projeto cresce em ideias sem cortar tempo, pessoas ou features."),
        ("SINTOMAS", "“Só mais um inimigo” · “e se tiver loja?” · “e se for online?”"),
        ("ANTÍDOTO", "Lista do que está fora · produção guarda o cercado · dizer não."),
    ]
    for i, (k, v) in enumerate(cards):
        left = Inches(0.5 + i * 3.15)
        add_panel(s, left, Inches(1.3), Inches(3.0), Inches(2.8))
        _, tf = add_textbox(s, left + Inches(0.2), Inches(1.55), Inches(2.6), Inches(2.4))
        write_lines(
            tf,
            [
                (k, {"size": 13, "bold": True, "color": GOLD_BRIGHT, "font": TITLE_FONT, "align": PP_ALIGN.CENTER, "space_after": 12}),
                (v, {"size": 12, "color": TEXT, "align": PP_ALIGN.CENTER}),
            ],
        )
    add_footer(s, W, H)

    # 8 — Cercado do Labirinto
    s = new_slide(prs)
    add_num_badge(s, "07")
    add_title(s, "Cercado do Labirinto")
    add_panel(s, Inches(0.55), Inches(1.2), Inches(4.3), Inches(3.1))
    _, tf = add_textbox(s, Inches(0.8), Inches(1.4), Inches(3.8), Inches(2.8))
    write_lines(
        tf,
        [
            ("ENTRA", {"size": 16, "bold": True, "color": GOLD, "font": TITLE_FONT, "align": PP_ALIGN.CENTER, "space_after": 10}),
            ("Hoje: papéis + pastas + stubs", {"size": 12, "color": TEXT, "align": PP_ALIGN.CENTER, "space_after": 6}),
            ("08+: player 4 dirs · moedas · 1 fase", {"size": 12, "color": TEXT, "align": PP_ALIGN.CENTER}),
        ],
    )
    add_panel(s, Inches(5.15), Inches(1.2), Inches(4.3), Inches(3.1))
    _, tf = add_textbox(s, Inches(5.4), Inches(1.4), Inches(3.8), Inches(2.8))
    write_lines(
        tf,
        [
            ("FICA FORA", {"size": 16, "bold": True, "color": BLOOD, "font": TITLE_FONT, "align": PP_ALIGN.CENTER, "space_after": 10}),
            ("Loja Aula 06 · combate · NPCs", {"size": 12, "color": TEXT, "align": PP_ALIGN.CENTER, "space_after": 6}),
            ("Multiplayer · bosses · shaders", {"size": 12, "color": TEXT, "align": PP_ALIGN.CENTER}),
        ],
    )
    add_footer(s, W, H)

    # 9 — Ponte prática
    s = new_slide(prs)
    add_num_badge(s, "08")
    add_title(s, "Ponte prática")
    add_panel(s, Inches(0.55), Inches(1.25), Inches(8.9), Inches(3.15))
    _, tf = add_textbox(s, Inches(0.9), Inches(1.7), Inches(8.2), Inches(2.5))
    write_lines(
        tf,
        [
            ("Minha Equipe, Meu Escopo", {"size": 20, "bold": True, "color": GOLD_BRIGHT, "font": TITLE_FONT, "align": PP_ALIGN.CENTER, "space_after": 16}),
            ("Equipes de 3 · quadro · projeto LabirintoDeMoedas", {"size": 15, "color": TEXT, "align": PP_ALIGN.CENTER, "space_after": 10}),
            ("Sem labirinto jogável completo hoje — só organização.", {"size": 14, "color": TEXT_DIM, "align": PP_ALIGN.CENTER}),
        ],
    )
    add_footer(s, W, H)

    # 10 — Trio de sala
    s = new_slide(prs)
    add_num_badge(s, "09")
    add_title(s, "Trio de sala")
    cards = [
        ("CENÁRIO", "Arte\ncenas/cenario.tscn\nNode2D"),
        ("MOEDAS", "Game Design\ncenas/moeda.tscn\nArea2D"),
        ("PLAYER", "Programação\ncenas/player.tscn\nCharacterBody2D"),
    ]
    for i, (k, v) in enumerate(cards):
        left = Inches(0.5 + i * 3.15)
        add_panel(s, left, Inches(1.3), Inches(3.0), Inches(2.8))
        _, tf = add_textbox(s, left + Inches(0.2), Inches(1.5), Inches(2.6), Inches(2.5))
        lines = [
            (k, {"size": 14, "bold": True, "color": GOLD_BRIGHT, "font": TITLE_FONT, "align": PP_ALIGN.CENTER, "space_after": 10}),
        ]
        for part in v.split("\n"):
            lines.append((part, {"size": 12, "color": TEXT, "align": PP_ALIGN.CENTER, "space_after": 2}))
        write_lines(tf, lines)
    add_footer(s, W, H)

    # 11 — Quadro + cronograma
    s = new_slide(prs)
    add_num_badge(s, "10")
    add_title(s, "Quadro + cronograma")
    points = [
        "Equipe nomeada + produtor do dia.",
        "Três entregas com responsável (cenário · moedas · player).",
        "≥3 itens FORA DO ESCOPO (cercado).",
        "≥3 tarefas no cronograma com dono e alvo (07 / 08+).",
    ]
    for i, text in enumerate(points):
        top = Inches(1.15 + i * 0.7)
        add_panel(s, Inches(0.55), top, Inches(8.9), Inches(0.58))
        _, tf = add_textbox(s, Inches(0.85), top + Inches(0.1), Inches(8.4), Inches(0.4))
        write_lines(tf, [(f"◆  {text}", {"size": 15, "color": TEXT})])
    add_footer(s, W, H)

    # 12 — Pastas Godot
    s = new_slide(prs)
    add_num_badge(s, "11")
    add_title(s, "Pastas Godot (contrato)")
    add_panel(s, Inches(0.55), Inches(1.15), Inches(8.9), Inches(3.25))
    _, tf = add_textbox(s, Inches(0.9), Inches(1.35), Inches(8.2), Inches(2.9))
    write_lines(
        tf,
        [
            ("LabirintoDeMoedas/", {"size": 14, "bold": True, "color": GOLD_BRIGHT, "font": TITLE_FONT, "space_after": 6}),
            ("cenas/  player.tscn · moeda.tscn · cenario.tscn", {"size": 13, "color": TEXT, "space_after": 4}),
            ("sprites/ · audio/ · scripts/ · ui/", {"size": 13, "color": TEXT, "space_after": 10}),
            ("Projeto NOVO · stubs só · sem movimento/coleta hoje.", {"size": 12, "color": TEXT_DIM}),
        ],
    )
    add_footer(s, W, H)

    # 13 — Pasta compartilhada
    s = new_slide(prs)
    add_num_badge(s, "12")
    add_title(s, "Pasta compartilhada")
    checks = [
        "Uma pasta: LabirintoDeMoedas_<NomeEquipe>.",
        "Avisar no grupo antes de editar uma .tscn.",
        "Um dono por cena nesta fase.",
        "ZIP datado no fim: backup_AAAA-MM-DD_HHMM.zip.",
        "Não sync obsessivo de .godot/ (cache local).",
        "Git existe — só teaser; não é obrigatório hoje.",
    ]
    for i, text in enumerate(checks):
        top = Inches(1.05 + i * 0.52)
        add_panel(s, Inches(0.55), top, Inches(8.9), Inches(0.45))
        _, tf = add_textbox(s, Inches(0.8), top + Inches(0.05), Inches(8.4), Inches(0.35))
        write_lines(tf, [(f"◆  {text}", {"size": 12, "color": TEXT})])
    add_footer(s, W, H)

    # 14 — Checklist
    s = new_slide(prs)
    add_num_badge(s, "13")
    add_title(s, "Checklist do artefato")
    checks = [
        "Equipe de 3 + produtor do dia.",
        "Quadro: cenário · moedas · player com responsáveis.",
        "≥3 itens fora do escopo + ≥3 tarefas no cronograma.",
        "Projeto LabirintoDeMoedas + três cenas-esqueleto.",
        "Pasta compartilhada ou ZIP de backup.",
        "Anotações + síntese enviadas na página aula7.",
    ]
    for i, text in enumerate(checks):
        top = Inches(1.05 + i * 0.52)
        add_panel(s, Inches(0.55), top, Inches(8.9), Inches(0.45))
        _, tf = add_textbox(s, Inches(0.8), top + Inches(0.05), Inches(8.4), Inches(0.35))
        write_lines(tf, [(f"□  {text}", {"size": 12, "color": TEXT})])
    add_footer(s, W, H)

    # 15 — Fechamento
    s = new_slide(prs)
    add_num_badge(s, "14")
    add_title(s, "Fechamento e Altar")
    add_panel(s, Inches(0.55), Inches(1.25), Inches(8.9), Inches(3.15))
    _, tf = add_textbox(s, Inches(0.9), Inches(1.55), Inches(8.2), Inches(2.7))
    write_lines(
        tf,
        [
            ("FIM DA AULA 07: CARTÓGRAFO DA EQUIPE", {"size": 15, "bold": True, "color": GOLD_BRIGHT, "font": TITLE_FONT, "align": PP_ALIGN.CENTER, "space_after": 12}),
            ("Um labirinto pequeno e terminado ensina mais que um mundo aberto abandonado.", {"size": 13, "color": TEXT, "align": PP_ALIGN.CENTER, "space_after": 10}),
            ("Envie as anotações. Leve o código ao Altar quando o Mestre liberar.", {"size": 13, "color": TEXT_DIM, "align": PP_ALIGN.CENTER, "space_after": 12}),
            ("Próxima trilha: construir o Labirinto (Aula 08+).", {"size": 13, "color": TEXT_DIM, "align": PP_ALIGN.CENTER}),
        ],
    )
    add_footer(s, W, H)

    return prs


def export_pdf_with_powerpoint(pptx_path: Path, pdf_path: Path) -> bool:
    """Exporta PDF via Microsoft PowerPoint (Windows COM)."""
    try:
        import win32com.client  # type: ignore
    except ImportError:
        ps = f"""
$ppt = New-Object -ComObject PowerPoint.Application
$ppt.Visible = [Microsoft.Office.Core.MsoTriState]::msoTrue
$pres = $ppt.Presentations.Open('{pptx_path}', $true, $false, $false)
$pres.SaveAs('{pdf_path}', 32)
$pres.Close()
$ppt.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($pres) | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($ppt) | Out-Null
"""
        import subprocess

        result = subprocess.run(
            ["powershell", "-NoProfile", "-Command", ps],
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            print(result.stdout)
            print(result.stderr, file=sys.stderr)
            return False
        return pdf_path.exists()

    powerpoint = win32com.client.Dispatch("PowerPoint.Application")
    powerpoint.Visible = 1
    presentation = powerpoint.Presentations.Open(str(pptx_path), WithWindow=False)
    presentation.SaveAs(str(pdf_path), 32)
    presentation.Close()
    powerpoint.Quit()
    return pdf_path.exists()


def main():
    prs = build_deck()
    OUT_PPTX.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(OUT_PPTX))
    print(f"PPTX: {OUT_PPTX} ({OUT_PPTX.stat().st_size} bytes)")

    if OUT_PDF.exists():
        OUT_PDF.unlink()
    ok = export_pdf_with_powerpoint(OUT_PPTX.resolve(), OUT_PDF.resolve())
    if ok:
        print(f"PDF:  {OUT_PDF} ({OUT_PDF.stat().st_size} bytes)")
    else:
        print("PDF:  não gerado (PowerPoint COM indisponível). PPTX ok.", file=sys.stderr)
        sys.exit(0)


if __name__ == "__main__":
    main()
