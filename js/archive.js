(function () {
  "use strict";

  var container = document.getElementById("archive-years");
  if (!container) {
    return;
  }

  function showError() {
    container.innerHTML = "";
    var item = document.createElement("li");
    item.className = "archive-message";
    item.textContent = "文章列表加载失败，请稍后刷新页面。";
    container.appendChild(item);
  }

  fetch("articles.json", { cache: "no-cache" })
    .then(function (response) {
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }
      return response.json();
    })
    .then(function (articles) {
      var years = Object.create(null);

      articles.forEach(function (article) {
        var year = String(article.year);
        if (!years[year]) {
          years[year] = [];
        }
        years[year].push(article);
      });

      container.innerHTML = "";
      Object.keys(years).sort(function (a, b) {
        return Number(b) - Number(a);
      }).forEach(function (year) {
        var yearItem = document.createElement("li");
        var wrapper = document.createElement("div");
        var heading = document.createElement("h3");
        heading.textContent = year;
        wrapper.appendChild(heading);

        years[year].forEach(function (article) {
          var list = document.createElement("ul");
          list.className = "list-arch";
          var item = document.createElement("li");
          var link = document.createElement("a");
          link.href = "article.html?post=" + encodeURIComponent(article.id);
          link.textContent = article.title;
          item.appendChild(link);
          list.appendChild(item);
          wrapper.appendChild(list);
        });

        yearItem.appendChild(wrapper);
        container.appendChild(yearItem);
      });
    })
    .catch(showError);
}());

