"""Extract slide text and speaker notes from .pptx decks into one .txt per deck.

Usage: python -I scripts/deck-text.py <deck.pptx>... --out <dir>

Standard library only. Slides come in presentation order, each under a "## Slide <n>" heading,
with its speaker notes after a "Notes:" line. The output is reference material for fact checks
and the overlap check: it is never copied into bundled items and never committed.
"""

import posixpath
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

NS = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
}
NOTES_TYPE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide"


def rels(z: zipfile.ZipFile, part: str) -> dict:
    """Relationship id -> (type, target part path) for one part."""
    folder, name = posixpath.split(part)
    rel_path = posixpath.join(folder, "_rels", name + ".rels")
    if rel_path not in z.namelist():
        return {}
    out = {}
    for r in ET.fromstring(z.read(rel_path)).findall("rel:Relationship", NS):
        target = posixpath.normpath(posixpath.join(folder, r.get("Target")))
        out[r.get("Id")] = (r.get("Type"), target)
    return out


def paragraphs(xml: bytes, skip_placeholders=()) -> list:
    """Text of each paragraph in a slide or notes part, skipping shapes whose placeholder type is listed."""
    root = ET.fromstring(xml)
    out = []
    for sp in root.iter("{%s}sp" % NS["p"]):
        ph = sp.find(".//p:nvPr/p:ph", NS)
        if ph is not None and ph.get("type") in skip_placeholders:
            continue
        for para in sp.iter("{%s}p" % NS["a"]):
            text = "".join(t.text or "" for t in para.iter("{%s}t" % NS["a"])).strip()
            if text:
                out.append(text)
    # Tables and grouped shapes outside p:sp still carry a:t runs.
    for frame in root.iter("{%s}graphicFrame" % NS["p"]):
        for para in frame.iter("{%s}p" % NS["a"]):
            text = "".join(t.text or "" for t in para.iter("{%s}t" % NS["a"])).strip()
            if text:
                out.append(text)
    return out


def deck_text(path: Path) -> str:
    with zipfile.ZipFile(path) as z:
        pres = "ppt/presentation.xml"
        pres_rels = rels(z, pres)
        ids = ET.fromstring(z.read(pres)).findall("p:sldIdLst/p:sldId", NS)
        lines = [f"# {path.stem}", ""]
        for n, sld in enumerate(ids, start=1):
            slide = pres_rels[sld.get("{%s}id" % NS["r"])][1]
            lines.append(f"## Slide {n}")
            lines.extend(paragraphs(z.read(slide)))
            notes = [t for t, (kind, _) in rels(z, slide).items() if kind == NOTES_TYPE]
            if notes:
                note_part = rels(z, slide)[notes[0]][1]
                text = paragraphs(z.read(note_part), skip_placeholders=("sldImg", "sldNum", "hdr", "ftr", "dt"))
                if text:
                    lines.append("Notes:")
                    lines.extend(text)
            lines.append("")
        return "\n".join(lines)


def main(argv: list) -> int:
    if "--out" not in argv or argv.index("--out") + 1 >= len(argv):
        print(__doc__.strip().splitlines()[2], file=sys.stderr)
        return 2
    i = argv.index("--out")
    out = Path(argv[i + 1])
    decks = [Path(a) for a in argv[:i] + argv[i + 2 :]]
    if not decks:
        print("no decks given", file=sys.stderr)
        return 2
    out.mkdir(parents=True, exist_ok=True)
    for deck in decks:
        text = deck_text(deck)
        target = out / (deck.stem + ".txt")
        target.write_text(text, encoding="utf-8")
        print(f"{target}: {text.count('## Slide ')} slides, {len(text)} chars")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
