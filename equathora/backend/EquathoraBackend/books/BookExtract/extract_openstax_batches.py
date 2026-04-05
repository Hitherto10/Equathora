#!/usr/bin/env python3
"""
Build copy-ready AI extraction batches from OpenStax PDF books.

This script does NOT call any external AI service. It only prepares bounded,
validated chunks that you can paste into ChatGPT/Claude/Copilot.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Sequence

try:
    from pypdf import PdfReader
except ImportError as import_error:  # pragma: no cover - runtime guard
    print("Missing dependency: pypdf")
    print("Install with: pip install pypdf")
    raise SystemExit(2) from import_error

DEFAULT_MAX_CHARS = 12000
DEFAULT_PAGES_PER_BATCH = 2

STRICT_EXTRACTION_PROMPT = """You are extracting math problems from a textbook.

TASK:
1. Identify all exercises/problems in the text.
2. Extract:
   - question
   - answer (if present)
   - topic (infer)
3. VERY IMPORTANT:
   - Reconstruct ALL math into valid LaTeX
   - Use \\frac{}{} for fractions
   - Use proper math notation (no plain text math)
   - Do NOT simplify expressions
   - Do NOT lose symbols like division, exponents, roots

OUTPUT FORMAT (JSON):
[
  {
    \"topic\": \"\",
    \"question_latex\": \"\",
    \"answer_latex\": \"\"
  }
]

If answers are not present, leave answer_latex empty.
"""

MATH_CONTEXT_RE = re.compile(r"[=+\-*/^√∫ΣπθΔ∞<>{}\[\]()]")
ANSWER_PAGE_HINT_RE = re.compile(
    r"answers to|answer key|odd-numbered exercises|solutions to|chapter answers",
    re.IGNORECASE,
)
TOO_MANY_DIGITS_LINE_RE = re.compile(r"^\d{1,3}$")


@dataclass
class Batch:
    batch_index: int
    page_start: int
    page_end: int
    char_count: int
    prompt_text: str


@dataclass
class ExtractionMetadata:
    generated_at_utc: str
    source_pdf: str
    total_pdf_pages: int
    requested_page_start: int
    requested_page_end: int
    pages_per_batch: int
    max_chars: int
    strict_math_guard: bool
    answer_mode: str
    skipped_answer_pages: List[int]


def normalize_whitespace(text: str) -> str:
    lines = [line.rstrip() for line in text.splitlines()]
    joined = "\n".join(lines)
    joined = re.sub(r"\n{3,}", "\n\n", joined)
    return joined.strip()


def is_likely_answer_page(text: str) -> bool:
    compact = " ".join(text.split())
    return bool(ANSWER_PAGE_HINT_RE.search(compact))


def find_broken_fraction_pairs(page_text: str) -> List[str]:
    """
    Detect suspicious OCR patterns where a fraction slash likely disappeared,
    e.g. a numerator and denominator extracted on separate lines as digits.
    """
    raw_lines = [line.strip() for line in page_text.splitlines()]
    suspicious: List[str] = []

    for idx in range(len(raw_lines) - 1):
        top = raw_lines[idx]
        bottom = raw_lines[idx + 1]
        if not (TOO_MANY_DIGITS_LINE_RE.match(top) and TOO_MANY_DIGITS_LINE_RE.match(bottom)):
            continue

        prev_line = raw_lines[idx - 1] if idx > 0 else ""
        next_line = raw_lines[idx + 2] if idx + 2 < len(raw_lines) else ""
        context = f"{prev_line} {next_line}".strip()

        if MATH_CONTEXT_RE.search(context):
            suspicious.append(f"{top} | {bottom}")

    return suspicious


def extract_pages(reader: PdfReader, start_page: int, end_page: int) -> List[tuple[int, str]]:
    pages: List[tuple[int, str]] = []
    for page_num in range(start_page, end_page + 1):
        text = reader.pages[page_num - 1].extract_text() or ""
        pages.append((page_num, normalize_whitespace(text)))
    return pages


def build_prompt_payload(chunk_text: str) -> str:
    return (
        f"{STRICT_EXTRACTION_PROMPT}\n"
        "TEXT TO PROCESS (verbatim):\n"
        "<<<TEXT_START>>>\n"
        f"{chunk_text}\n"
        "<<<TEXT_END>>>"
    )


def chunk_pages(
    pages: Sequence[tuple[int, str]],
    pages_per_batch: int,
    max_chars: int,
) -> List[Batch]:
    batches: List[Batch] = []
    buffer: List[tuple[int, str]] = []

    def flush() -> None:
        nonlocal buffer
        if not buffer:
            return

        page_start = buffer[0][0]
        page_end = buffer[-1][0]
        text_body = "\n\n".join(
            f"[Page {page_num}]\n{page_text}" for page_num, page_text in buffer
        ).strip()
        prompt_text = build_prompt_payload(text_body)

        if len(prompt_text) > max_chars:
            raise ValueError(
                "Chunk exceeds max_chars even before additional batching. "
                "Reduce pages_per_batch or increase max_chars."
            )

        batches.append(
            Batch(
                batch_index=len(batches) + 1,
                page_start=page_start,
                page_end=page_end,
                char_count=len(prompt_text),
                prompt_text=prompt_text,
            )
        )
        buffer = []

    for page_num, page_text in pages:
        candidate = [*buffer, (page_num, page_text)]
        candidate_text = "\n\n".join(
            f"[Page {num}]\n{text}" for num, text in candidate
        ).strip()
        candidate_prompt = build_prompt_payload(candidate_text)

        should_flush = (
            len(candidate) > pages_per_batch
            or len(candidate_prompt) > max_chars
        )

        if should_flush and buffer:
            flush()

        if should_flush and not buffer:
            # Single page still exceeds max_chars.
            solo_prompt = build_prompt_payload(f"[Page {page_num}]\n{page_text}".strip())
            if len(solo_prompt) > max_chars:
                raise ValueError(
                    f"Page {page_num} alone exceeds max_chars={max_chars}. "
                    "Increase max_chars or reduce source text."
                )
            batches.append(
                Batch(
                    batch_index=len(batches) + 1,
                    page_start=page_num,
                    page_end=page_num,
                    char_count=len(solo_prompt),
                    prompt_text=solo_prompt,
                )
            )
            continue

        if should_flush:
            buffer = [(page_num, page_text)]
        else:
            buffer = candidate

    flush()
    return batches


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Prepare OpenStax extraction batches.")
    parser.add_argument(
        "--openstax-dir",
        default=str(Path(__file__).resolve().parent.parent / "OpenStax"),
        help="Directory containing OpenStax PDF books",
    )
    parser.add_argument("--book", required=True, help="Book PDF filename in OpenStax directory")
    parser.add_argument("--start-page", type=int, default=1, help="1-based page start")
    parser.add_argument("--end-page", type=int, default=20, help="1-based page end")
    parser.add_argument(
        "--pages-per-batch",
        type=int,
        default=DEFAULT_PAGES_PER_BATCH,
        help="Max pages packed in each copy batch",
    )
    parser.add_argument(
        "--max-chars",
        type=int,
        default=DEFAULT_MAX_CHARS,
        help="Hard cap for prompt text per batch",
    )
    parser.add_argument(
        "--strict-math-guard",
        action="store_true",
        default=True,
        help="Fail fast when likely malformed fraction OCR is detected",
    )
    parser.add_argument(
        "--answer-mode",
        choices=["exclude", "include", "separate"],
        default="exclude",
        help="How to handle likely answer-key pages",
    )
    parser.add_argument(
        "--answer-pages-start",
        type=int,
        default=0,
        help="If >0, treat this page and later pages as answer pages",
    )
    parser.add_argument(
        "--output-dir",
        default=str(Path(__file__).resolve().parent / "output"),
        help="Where generated JSON/TXT files should be written",
    )
    return parser.parse_args()


def validate_args(args: argparse.Namespace) -> None:
    if args.start_page < 1:
        raise ValueError("start-page must be >= 1")
    if args.end_page < args.start_page:
        raise ValueError("end-page must be >= start-page")
    if args.pages_per_batch < 1:
        raise ValueError("pages-per-batch must be >= 1")
    if args.max_chars < 2000:
        raise ValueError("max-chars must be >= 2000")


def run() -> int:
    args = parse_args()

    try:
        validate_args(args)
    except ValueError as validation_error:
        print(f"Argument error: {validation_error}")
        return 2

    openstax_dir = Path(args.openstax_dir).resolve()
    source_pdf = (openstax_dir / args.book).resolve()
    output_dir = Path(args.output_dir).resolve()

    if not source_pdf.exists():
        print(f"Book not found: {source_pdf}")
        return 1

    reader = PdfReader(str(source_pdf))
    total_pages = len(reader.pages)

    if args.end_page > total_pages:
        print(f"end-page {args.end_page} exceeds total pages {total_pages}")
        return 2

    raw_pages = extract_pages(reader, args.start_page, args.end_page)

    question_pages: List[tuple[int, str]] = []
    answer_pages: List[tuple[int, str]] = []
    skipped_answer_pages: List[int] = []

    for page_num, text in raw_pages:
        marked_as_answer = (
            (args.answer_pages_start > 0 and page_num >= args.answer_pages_start)
            or is_likely_answer_page(text)
        )

        if marked_as_answer and args.answer_mode != "include":
            skipped_answer_pages.append(page_num)

        if marked_as_answer and args.answer_mode == "separate":
            answer_pages.append((page_num, text))
        elif marked_as_answer and args.answer_mode == "exclude":
            continue
        else:
            question_pages.append((page_num, text))

    if args.strict_math_guard:
        bad_pages = []
        for page_num, page_text in question_pages:
            suspicious_pairs = find_broken_fraction_pairs(page_text)
            if suspicious_pairs:
                bad_pages.append((page_num, suspicious_pairs[:5]))

        if bad_pages:
            print("STOPPED: Potential malformed math extraction detected.")
            for page_num, examples in bad_pages:
                print(f"  Page {page_num}: suspicious stacked numbers -> {examples}")
            print("Suggested fixes:")
            print("  1) Try a smaller page range around clean sections.")
            print("  2) Use a different PDF source or OCR quality.")
            print("  3) Temporarily run with --strict-math-guard disabled only after manual review.")
            return 3

    try:
        question_batches = chunk_pages(question_pages, args.pages_per_batch, args.max_chars)
        answer_batches = chunk_pages(answer_pages, args.pages_per_batch, args.max_chars) if answer_pages else []
    except ValueError as chunk_error:
        print(f"Chunking error: {chunk_error}")
        return 2

    output_dir.mkdir(parents=True, exist_ok=True)

    metadata = ExtractionMetadata(
        generated_at_utc=datetime.now(timezone.utc).isoformat(),
        source_pdf=str(source_pdf),
        total_pdf_pages=total_pages,
        requested_page_start=args.start_page,
        requested_page_end=args.end_page,
        pages_per_batch=args.pages_per_batch,
        max_chars=args.max_chars,
        strict_math_guard=bool(args.strict_math_guard),
        answer_mode=args.answer_mode,
        skipped_answer_pages=skipped_answer_pages,
    )

    stem = source_pdf.stem
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    base_name = f"{stem}_{args.start_page}-{args.end_page}_{run_id}"

    questions_payload = {
        "metadata": asdict(metadata),
        "kind": "questions",
        "batch_count": len(question_batches),
        "batches": [asdict(batch) for batch in question_batches],
    }

    questions_json_path = output_dir / f"{base_name}_questions.json"
    questions_json_path.write_text(json.dumps(questions_payload, ensure_ascii=False, indent=2), encoding="utf-8")

    quick_text_path = output_dir / f"{base_name}_questions_quickcopy.txt"
    quick_lines = []
    for batch in question_batches:
        quick_lines.append(
            f"===== BATCH {batch.batch_index} | pages {batch.page_start}-{batch.page_end} | chars {batch.char_count} ====="
        )
        quick_lines.append(batch.prompt_text)
        quick_lines.append("")
    quick_text_path.write_text("\n".join(quick_lines), encoding="utf-8")

    print(f"Questions JSON: {questions_json_path}")
    print(f"Questions quick copy: {quick_text_path}")
    print(f"Question batches: {len(question_batches)}")

    if answer_batches:
        answers_payload = {
            "metadata": asdict(metadata),
            "kind": "answers",
            "batch_count": len(answer_batches),
            "batches": [asdict(batch) for batch in answer_batches],
        }
        answers_json_path = output_dir / f"{base_name}_answers.json"
        answers_json_path.write_text(json.dumps(answers_payload, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Answers JSON: {answers_json_path}")
        print(f"Answer batches: {len(answer_batches)}")

    if skipped_answer_pages:
        print(f"Skipped answer-like pages: {sorted(set(skipped_answer_pages))}")

    return 0


if __name__ == "__main__":
    sys.exit(run())
