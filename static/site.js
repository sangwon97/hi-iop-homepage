// Client interactions for the server-rendered site.
(function () {
  "use strict";

  // ---- Homepage notice: suppress this image until the next local midnight ----
  function initNoticePopup() {
    var popup = document.getElementById("noticePopup");
    if (!popup || typeof popup.showModal !== "function" || popup.open) return;

    var storageKey = popup.dataset.storageKey;
    try {
      var hiddenUntil = Number(localStorage.getItem(storageKey));
      if (hiddenUntil > Date.now()) return;
      localStorage.removeItem(storageKey);
    } catch (e) {
      // Show the notice even when browser storage is unavailable.
    }

    popup.querySelector("[data-popup-close]").addEventListener("click", function () {
      popup.close();
    });
    popup.querySelector("[data-popup-hide-today]").addEventListener("click", function () {
      var midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      try {
        localStorage.setItem(storageKey, String(midnight.getTime()));
      } catch (e) {
        // Closing must still work if the browser blocks storage.
      }
      popup.close();
    });
    popup.addEventListener("close", function () {
      document.documentElement.classList.remove("notice-popup-open");
    });

    popup.showModal();
    document.documentElement.classList.add("notice-popup-open");
  }

  // ---- Progressive "View More" pagination (publications, patents) ----
  // Each `.js-paginate` shows `data-page-size` direct children at a time; the
  // sibling `.js-load-more` button reveals the next batch.
  function initPaginate() {
    document.querySelectorAll(".js-paginate").forEach(function (list) {
      var pageSize = parseInt(list.dataset.pageSize || "6", 10);
      var items = Array.prototype.filter.call(list.children, function (el) {
        return el.nodeType === 1;
      });
      var btn = null;
      var wrap = list.parentElement;
      if (wrap) btn = wrap.querySelector(".js-load-more");
      var shown = 0;

      function render() {
        items.forEach(function (el, i) {
          el.style.display = i < shown ? "" : "none";
        });
        if (btn) btn.classList.toggle("hidden", shown >= items.length);
      }

      function more() {
        shown = Math.min(shown + pageSize, items.length);
        render();
      }

      shown = Math.min(pageSize, items.length);
      render();
      if (btn) btn.addEventListener("click", more);
    });
  }

  // ---- Project card flip on click ----
  function initFlip() {
    document.querySelectorAll(".card-flip").forEach(function (card) {
      card.addEventListener("click", function () {
        this.classList.toggle("flipped");
      });
    });
  }

  // ---- Photo gallery: category filter/carousel + image modal ----
  function initGallery() {
    var container = document.getElementById("photoGallery");
    var dataEl = document.getElementById("photoData");
    if (!container || !dataEl) return;

    var photos = [];
    try {
      photos = JSON.parse(dataEl.textContent) || [];
    } catch (e) {
      photos = [];
    }

    var categoryButtons = container.querySelectorAll(".category-btn");
    var categoryContainer = container.querySelector(".category-container");
    var prevCategoryBtn = container.querySelector(".category-carousel .prev");
    var nextCategoryBtn = container.querySelector(".category-carousel .next");
    var modal = container.querySelector(".modal");
    if (!modal) return;
    var modalImage = modal.querySelector(".modal-image");
    var modalTitle = modal.querySelector(".modal-title");
    var modalDate = modal.querySelector(".modal-date");
    var modalText = modal.querySelector(".modal-text");
    var modalPrevBtn = modal.querySelector(".modal-nav-btn.prev");
    var modalNextBtn = modal.querySelector(".modal-nav-btn.next");
    var modalCloseBtn = modal.querySelector(".modal-close");

    var categories = ["all"];
    photos.forEach(function (p) {
      if (categories.indexOf(p.category) === -1) categories.push(p.category);
    });

    var currentCategoryIndex = 0;
    var currentModalPhoto = null;
    var currentImageIndex = 0;
    var visibleCount = 5;

    function toWeb(src) {
      if (!src) return "";
      if (/^https?:\/\//.test(src)) return src;
      if (src.indexOf("./") === 0) src = src.slice(1);
      if (src.charAt(0) !== "/") src = "/" + src;
      return src;
    }

    function filterPhotos(category) {
      container.querySelectorAll(".gallery-item").forEach(function (item) {
        var show = category === "all" || item.dataset.category === category;
        item.style.display = show ? "block" : "none";
      });
    }

    function updateCategoryVisibility() {
      categoryButtons.forEach(function (btn, index) {
        var inRange =
          index >= currentCategoryIndex &&
          index < currentCategoryIndex + visibleCount;
        btn.style.display = inRange ? "block" : "none";
      });
      if (prevCategoryBtn) {
        prevCategoryBtn.disabled = currentCategoryIndex === 0;
        prevCategoryBtn.style.opacity = currentCategoryIndex === 0 ? "0.5" : "1";
      }
      if (nextCategoryBtn) {
        var atEnd = currentCategoryIndex >= categories.length - visibleCount;
        nextCategoryBtn.disabled = atEnd;
        nextCategoryBtn.style.opacity = atEnd ? "0.5" : "1";
      }
    }

    function updateModalContent() {
      if (!currentModalPhoto) return;
      var allImages = [currentModalPhoto.url].concat(
        currentModalPhoto.relatedImages || []
      );
      modalImage.src = toWeb(allImages[currentImageIndex]);
      modalTitle.textContent = currentModalPhoto.title || "";
      modalDate.textContent = currentModalPhoto.date || "";
      modalText.textContent = currentModalPhoto.text || "";
    }

    categoryButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        categoryButtons.forEach(function (b) {
          b.classList.remove("active");
        });
        button.classList.add("active");
        filterPhotos(button.dataset.category);
      });
    });

    container.querySelectorAll(".gallery-item").forEach(function (item) {
      item.addEventListener("click", function () {
        var photoId = parseInt(item.dataset.id, 10);
        currentModalPhoto = photos.filter(function (p) {
          return p.id === photoId;
        })[0];
        currentImageIndex = 0;
        updateModalContent();
        modal.classList.add("active");
      });
    });

    function step(delta) {
      if (!currentModalPhoto) return;
      var allImages = [currentModalPhoto.url].concat(
        currentModalPhoto.relatedImages || []
      );
      currentImageIndex =
        (currentImageIndex + delta + allImages.length) % allImages.length;
      updateModalContent();
    }
    if (modalPrevBtn) modalPrevBtn.addEventListener("click", function () { step(-1); });
    if (modalNextBtn) modalNextBtn.addEventListener("click", function () { step(1); });
    if (modalCloseBtn)
      modalCloseBtn.addEventListener("click", function () {
        modal.classList.remove("active");
        currentModalPhoto = null;
      });

    if (prevCategoryBtn)
      prevCategoryBtn.addEventListener("click", function () {
        if (currentCategoryIndex > 0) {
          currentCategoryIndex--;
          updateCategoryVisibility();
        }
      });
    if (nextCategoryBtn)
      nextCategoryBtn.addEventListener("click", function () {
        if (currentCategoryIndex < categories.length - visibleCount) {
          currentCategoryIndex++;
          updateCategoryVisibility();
        }
      });

    updateCategoryVisibility();
  }

  document.addEventListener("DOMContentLoaded", function () {
    initNoticePopup();
    initPaginate();
    initFlip();
    initGallery();
  });
})();
