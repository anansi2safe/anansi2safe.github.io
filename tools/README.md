# 博客文章管理器使用手册

`blog.py` 用于管理博客中的 Markdown 文章、文章年份和首页文章列表。

管理器会维护项目根目录下的 `articles.json`。主页和统一文章页面都会读取这个文件，因此新增文章和新增年份时，不需要手动修改 `index.html` 或 JavaScript。

## 1. 环境要求

- Python 3.9 或更高版本
- 在博客项目根目录执行命令
- 文章必须是 `.md` 文件

查看帮助：

```bash
python3 tools/blog.py --help
```

查看某个命令的帮助：

```bash
python3 tools/blog.py add --help
python3 tools/blog.py new --help
```

## 2. 导入已有 Markdown

最简单的用法：

```bash
python3 tools/blog.py add /path/to/article.md
```

该命令会自动：

1. 将 Markdown 复制到 `archive` 目录。
2. 从 Markdown 的一级标题或文件名识别文章标题。
3. 使用当前年份作为归档年份。
4. 根据文件名生成文章 ID。
5. 将文章登记到 `articles.json`。
6. 输出最终文章地址。

例如：

```bash
python3 tools/blog.py add ~/Documents/CVE-2027-1234漏洞分析.md
```

成功后会显示类似内容：

```text
已添加: CVE-2027-1234漏洞分析
文章地址: article.html?post=cve-2027-1234
```

### 指定标题、年份和 ID

```bash
python3 tools/blog.py add ~/Documents/article.md \
  --title "CVE-2027-1234漏洞分析" \
  --year 2027 \
  --id cve-2027-1234
```

参数说明：

- `--title`：主页和文章页显示的标题。
- `--year`：文章在主页中所属的年份；省略时使用当前年份。
- `--id`：文章地址中的唯一标识。
- `--force`：允许覆盖 `archive` 中已经存在的同名 Markdown 文件。

使用 `--force` 的示例：

```bash
python3 tools/blog.py add ~/Documents/article.md \
  --title "新文章" \
  --year 2027 \
  --id new-article \
  --force
```

`--force` 只用于覆盖同名文件，不能覆盖已经存在的文章 ID。

## 3. 创建新文章草稿

直接创建并登记一篇新文章：

```bash
python3 tools/blog.py new "文章标题"
```

指定年份和 ID：

```bash
python3 tools/blog.py new "CVE-2027-1234漏洞分析" \
  --year 2027 \
  --id cve-2027-1234
```

指定 Markdown 文件名：

```bash
python3 tools/blog.py new "CVE-2027-1234漏洞分析" \
  --year 2027 \
  --id cve-2027-1234 \
  --filename CVE-2027-1234.md
```

工具会在 `archive` 中生成一个基础模板：

```markdown
# 文章标题

[TOC]

## 第一节

在这里开始写文章。
```

创建后直接编辑生成的 Markdown 即可，不需要再次运行 `add`。

## 4. 新增年份

年份不需要单独创建。

添加文章时指定一个尚不存在的年份，主页会自动生成对应的年份卡片：

```bash
python3 tools/blog.py add article.md --year 2028 --id article-2028
```

年份会自动从新到旧排列。同一年内的文章按照 `articles.json` 中的顺序显示；管理器保存清单时会按标题排列。

## 5. 文章 ID 规则

文章 ID 是链接中的 `post` 参数：

```text
article.html?post=cve-2027-1234
```

ID 必须满足以下要求：

- 只能使用小写英文字母、数字和连字符。
- 不能包含空格、中文、下划线或其他符号。
- 每篇文章的 ID 必须唯一。
- 发布后尽量不要修改，否则旧链接会失效。

推荐格式：

```text
cve-2027-1234
android-binder-part-2
chrome-v8-research
```

如果没有传入 `--id`，工具会尝试根据文件名生成。纯中文文件名会生成带哈希值的 ID。为了让链接更容易识别，建议主动指定 `--id`。

## 6. Markdown 写作说明

文章支持常见的 GitHub Flavored Markdown：

- 多级标题
- 有序和无序列表
- 链接与图片
- 引用
- 表格
- 行内代码
- 围栏代码块

代码块示例：

````markdown
```cpp
int main() {
    return 0;
}
```
````

### 自动目录

需要目录时，在 Markdown 中单独写一行：

```markdown
[TOC]
```

文章页会根据二级、三级和四级标题自动生成目录。不需要目录时可以省略。

### 图片

远程图片：

```markdown
![图片说明](https://example.com/image.png)
```

如果以后保存本地图片，建议统一放到 `img/articles`，并使用从网站根目录开始的路径：

```markdown
![图片说明](/img/articles/example.png)
```

## 7. 查看和检查文章

列出所有已登记文章：

```bash
python3 tools/blog.py list
```

输出示例：

```text
2027  cve-2027-1234             CVE-2027-1234漏洞分析
2026  cve-2026-5281             CVE-2026-5281漏洞分析与POC编写
```

检查文章清单：

```bash
python3 tools/blog.py check
```

检查内容包括：

- `articles.json` 格式是否正确。
- 必需字段是否完整。
- 文章 ID 是否符合规则。
- 是否存在重复 ID。
- 年份是否有效。
- Markdown 文件是否存在。
- Markdown 是否位于 `archive` 目录。

发布前建议始终运行一次：

```bash
python3 tools/blog.py check
```

## 8. 修改已有文章

只修改正文时，直接编辑 `archive` 中对应的 Markdown：

```text
archive/文章文件.md
```

不需要重新运行管理器。

如果要修改文章显示标题或年份，编辑项目根目录的 `articles.json` 中对应记录：

```json
{
  "id": "cve-2027-1234",
  "title": "新的文章标题",
  "year": 2027,
  "file": "archive/CVE-2027-1234.md"
}
```

修改后运行：

```bash
python3 tools/blog.py check
```

## 9. 删除文章

当前管理器没有自动删除命令，避免误删文章。删除时需要手动完成两步：

1. 从 `articles.json` 删除对应的完整记录。
2. 删除 `archive` 中对应的 Markdown 文件。

完成后检查：

```bash
python3 tools/blog.py check
```

## 10. 本地预览

文章页面通过浏览器加载 Markdown，不能直接使用 `file://` 双击预览。

在项目根目录启动服务器：

```bash
python3 -m http.server 8000
```

浏览器访问：

```text
http://127.0.0.1:8000/
```

停止服务器时，在终端按 `Ctrl+C`。

## 11. 发布到 GitHub Pages

新增或修改文章后执行：

```bash
python3 tools/blog.py check
git status
git add archive articles.json
git commit -m "Add new blog post"
git push
```

如果同时修改了管理器、样式或页面文件，可以使用：

```bash
git add .
```

推送完成后等待 GitHub Pages 部署，再从主页打开文章确认效果。

## 12. `articles.json` 字段说明

每篇文章对应一条记录：

```json
{
  "id": "cve-2027-1234",
  "title": "CVE-2027-1234漏洞分析",
  "year": 2027,
  "file": "archive/CVE-2027-1234漏洞分析.md"
}
```

- `id`：唯一文章 ID，用于生成文章链接。
- `title`：主页和文章页面显示的标题。
- `year`：主页归档年份。
- `file`：相对于项目根目录的 Markdown 路径。

通常不需要手动编辑这个文件，使用 `add` 或 `new` 命令即可。

## 13. 常见问题

### 提示“文章 ID 已存在”

说明 `articles.json` 中已经有相同 ID。为新文章指定其他 ID：

```bash
python3 tools/blog.py add article.md --id another-id
```

### 提示“目标文件已存在”

`archive` 中存在同名文件。确认需要覆盖后使用 `--force`，或者修改源文件名。

### 主页没有显示新文章

依次检查：

```bash
python3 tools/blog.py check
```

然后确认：

- `articles.json` 已更新。
- 浏览器访问的是 HTTP 地址而不是 `file://`。
- 浏览器没有使用旧缓存，可以强制刷新页面。
- `articles.json` 已随 Git 提交并推送。

### 文章页面显示“文章加载失败”

检查 `articles.json` 中的 `file` 路径是否与实际 Markdown 文件名完全一致，尤其注意中文、空格和大小写。

### 文章没有生成目录

确认 Markdown 中存在独立的 `[TOC]` 行，并且正文中使用了 `##`、`###` 或 `####` 标题。

