#!/usr/bin/env python3
"""Manage Markdown posts and the articles.json catalog."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import re
import shutil
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / "archive"
CATALOG = ROOT / "articles.json"


def load_catalog() -> list[dict]:
    try:
        data = json.loads(CATALOG.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise SystemExit(f"无法读取 {CATALOG}: {exc}") from exc
    if not isinstance(data, list):
        raise SystemExit("articles.json 的顶层必须是数组")
    return data


def save_catalog(articles: list[dict]) -> None:
    articles.sort(key=lambda item: (-int(item["year"]), item["title"].casefold()))
    temporary = CATALOG.with_suffix(".json.tmp")
    temporary.write_text(
        json.dumps(articles, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    temporary.replace(CATALOG)


def infer_title(source: Path) -> str:
    text = source.read_text(encoding="utf-8-sig")
    match = re.search(r"^#\s+(.+?)\s*$", text, re.MULTILINE)
    return match.group(1).strip() if match else source.stem


def make_id(value: str, year: int) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    if slug:
        return slug
    digest = hashlib.sha1(value.encode("utf-8")).hexdigest()[:8]
    return f"post-{year}-{digest}"


def validate_entry(entry: dict) -> list[str]:
    errors = []
    for field in ("id", "title", "year", "file"):
        if field not in entry:
            errors.append(f"缺少字段 {field}")
    if errors:
        return errors
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", str(entry["id"])):
        errors.append("id 只能包含小写字母、数字和连字符")
    if not isinstance(entry["year"], int) or entry["year"] < 2000:
        errors.append("year 必须是有效整数年份")
    path = ROOT / str(entry["file"])
    try:
        path.resolve().relative_to(ARCHIVE.resolve())
    except ValueError:
        errors.append("file 必须位于 archive 目录")
    if not path.is_file():
        errors.append(f"Markdown 文件不存在: {entry['file']}")
    return errors


def command_add(args: argparse.Namespace) -> None:
    source = Path(args.source).expanduser().resolve()
    if not source.is_file() or source.suffix.lower() != ".md":
        raise SystemExit("source 必须是存在的 .md 文件")

    year = args.year or dt.date.today().year
    title = args.title or infer_title(source)
    article_id = args.id or make_id(source.stem, year)
    destination = ARCHIVE / source.name
    articles = load_catalog()

    if any(item.get("id") == article_id for item in articles):
        raise SystemExit(f"文章 ID 已存在: {article_id}")

    if source != destination.resolve():
        if destination.exists() and not args.force:
            raise SystemExit(f"目标文件已存在: {destination}（可使用 --force 覆盖）")
        ARCHIVE.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)

    entry = {
        "id": article_id,
        "title": title,
        "year": year,
        "file": destination.relative_to(ROOT).as_posix(),
    }
    errors = validate_entry(entry)
    if errors:
        raise SystemExit("; ".join(errors))

    articles.append(entry)
    save_catalog(articles)
    print(f"已添加: {title}")
    print(f"文章地址: article.html?post={article_id}")


def command_new(args: argparse.Namespace) -> None:
    year = args.year or dt.date.today().year
    article_id = args.id or make_id(args.title, year)
    filename = args.filename or f"{args.title}.md"
    if not filename.lower().endswith(".md"):
        filename += ".md"
    destination = ARCHIVE / Path(filename).name
    if destination.exists():
        raise SystemExit(f"文件已存在: {destination}")

    ARCHIVE.mkdir(parents=True, exist_ok=True)
    destination.write_text(
        f"# {args.title}\n\n[TOC]\n\n## 第一节\n\n在这里开始写文章。\n",
        encoding="utf-8",
    )
    add_args = argparse.Namespace(
        source=str(destination), title=args.title, year=year,
        id=article_id, force=False,
    )
    command_add(add_args)
    print(f"Markdown: {destination.relative_to(ROOT)}")


def command_list(_: argparse.Namespace) -> None:
    for item in load_catalog():
        print(f"{item['year']}  {item['id']:<24}  {item['title']}")


def command_check(_: argparse.Namespace) -> None:
    articles = load_catalog()
    ids = set()
    failed = False
    for index, entry in enumerate(articles, 1):
        errors = validate_entry(entry)
        if entry.get("id") in ids:
            errors.append("文章 ID 重复")
        ids.add(entry.get("id"))
        if errors:
            failed = True
            print(f"[{index}] {entry.get('title', '未知文章')}: {'; '.join(errors)}")
    if failed:
        raise SystemExit(1)
    print(f"检查通过：{len(articles)} 篇文章")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Jafork 博客文章管理器")
    commands = parser.add_subparsers(dest="command", required=True)

    add = commands.add_parser("add", help="导入已有 Markdown")
    add.add_argument("source", help="Markdown 文件路径")
    add.add_argument("--title", help="文章显示标题，默认读取一级标题或文件名")
    add.add_argument("--year", type=int, help="归档年份，默认为当前年份")
    add.add_argument("--id", help="文章 ID，默认根据文件名生成")
    add.add_argument("--force", action="store_true", help="覆盖 archive 中的同名文件")
    add.set_defaults(func=command_add)

    new = commands.add_parser("new", help="创建并登记新的 Markdown 草稿")
    new.add_argument("title", help="文章标题")
    new.add_argument("--year", type=int, help="归档年份，默认为当前年份")
    new.add_argument("--id", help="文章 ID")
    new.add_argument("--filename", help="Markdown 文件名")
    new.set_defaults(func=command_new)

    listing = commands.add_parser("list", help="列出全部文章")
    listing.set_defaults(func=command_list)

    check = commands.add_parser("check", help="检查文章清单和文件")
    check.set_defaults(func=command_check)
    return parser


def main() -> None:
    args = build_parser().parse_args()
    args.func(args)


if __name__ == "__main__":
    main()

