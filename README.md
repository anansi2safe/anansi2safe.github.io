# anansi.github.io

## 文章管理

导入已有 Markdown（年份默认使用当前年份）：

```bash
python3 tools/blog.py add /path/to/article.md
```

指定标题、年份或文章 ID：

```bash
python3 tools/blog.py add article.md --title "文章标题" --year 2027 --id article-id
```

创建一篇新草稿并自动登记：

```bash
python3 tools/blog.py new "文章标题" --year 2027 --id article-id
```

检查或列出文章：

```bash
python3 tools/blog.py check
python3 tools/blog.py list
```

主页会读取 `articles.json`，自动按年份从新到旧生成文章列表。新增年份不需要修改 HTML。
