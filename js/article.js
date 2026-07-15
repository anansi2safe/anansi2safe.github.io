(function () {
  "use strict";

  var titleElement = document.getElementById("article-title");
  var contentElement = document.getElementById("article-content");
  var key = new URLSearchParams(window.location.search).get("post");

  function showError(message) {
    titleElement.textContent = "文章加载失败";
    contentElement.innerHTML = "";
    var paragraph = document.createElement("p");
    paragraph.className = "article-error";
    paragraph.textContent = message;
    contentElement.appendChild(paragraph);
  }

  function createTableOfContents() {
    var toc = document.getElementById("article-toc");
    if (!toc) {
      return;
    }

    var headings = contentElement.querySelectorAll("h2, h3, h4");
    var list = document.createElement("ul");
    var usedIds = Object.create(null);

    Array.prototype.forEach.call(headings, function (heading, index) {
      var base = heading.textContent.trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w\u3400-\u9fff-]/g, "") || "section-" + (index + 1);
      var id = base;
      var suffix = 2;
      while (usedIds[id]) {
        id = base + "-" + suffix++;
      }
      usedIds[id] = true;
      heading.id = heading.id || id;

      var item = document.createElement("li");
      item.className = "toc-" + heading.tagName.toLowerCase();
      var link = document.createElement("a");
      link.href = "#" + heading.id;
      link.textContent = heading.textContent;
      item.appendChild(link);
      list.appendChild(item);
    });

    if (list.children.length) {
      var label = document.createElement("strong");
      label.textContent = "目录";
      toc.appendChild(label);
      toc.appendChild(list);
    } else {
      toc.remove();
    }
  }

  function loadArticle(article) {
    titleElement.textContent = article.title;
    document.title = article.title + " | Jafork's Blog";

    return fetch(encodeURI(article.file), { cache: "no-cache" })
    .then(function (response) {
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }
      return response.text();
    })
    .then(function (markdown) {
      markdown = markdown
        .replace(/^\uFEFF/, "")
        .replace(/^---\s*[\r\n]+[\s\S]*?[\r\n]+---\s*[\r\n]+/, "")
        .replace(/\{%\s*raw\s*%\}/g, "")
        .replace(/\{%\s*endraw\s*%\}/g, "")
        .replace(/^\[TOC\][ \t]*\r?$/m, '<nav class="article-toc" id="article-toc"></nav>\n\n');

      marked.setOptions({ gfm: true, breaks: false });
      contentElement.innerHTML = marked.parse(markdown);
      createTableOfContents();

      Array.prototype.forEach.call(contentElement.querySelectorAll("a[href]"), function (link) {
        if (/^https?:\/\//i.test(link.getAttribute("href"))) {
          link.target = "_blank";
          link.rel = "noopener noreferrer";
        }
      });
    })
    .catch(function (error) {
      var hint = window.location.protocol === "file:"
        ? "浏览器禁止从 file:// 页面读取 Markdown。请通过 GitHub Pages 或本地 HTTP 服务访问。"
        : "未能读取 Markdown 文件，请检查文件路径或稍后重试。";
      showError(hint + "（" + error.message + "）");
    });
  }

  if (!key) {
    showError("文章参数无效，请返回首页重新选择文章。");
    return;
  }

  fetch("articles.json", { cache: "no-cache" })
    .then(function (response) {
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }
      return response.json();
    })
    .then(function (articles) {
      var article = articles.find(function (item) {
        return item.id === key;
      });
      if (!article) {
        showError("没有找到这篇文章，请返回首页重新选择。");
        return;
      }
      return loadArticle(article);
    })
    .catch(function (error) {
      showError("文章清单加载失败，请稍后重试。（" + error.message + "）");
    });
}());
