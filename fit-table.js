(function () {
  const MIN_SCALE = 0.6;

  function fitTable(wrapper) {
    const table = wrapper.querySelector('table');
    if (!table) return;

    table.style.transform = '';
    table.style.transformOrigin = 'top left';

    const availableWidth = wrapper.clientWidth;
    const tableWidth = table.scrollWidth;
    if (!availableWidth || !tableWidth) return;

    if (tableWidth <= availableWidth) {
      wrapper.classList.remove('fit-to-screen');
      table.style.transform = '';
      return;
    }

    const scale = Math.max(MIN_SCALE, availableWidth / tableWidth);
    wrapper.classList.add('fit-to-screen');
    table.style.transform = `scale(${scale})`;
  }

  function fitAllTables() {
    document.querySelectorAll('.table-wrap').forEach((wrapper) => fitTable(wrapper));
  }

  window.addEventListener('resize', () => {
    window.requestAnimationFrame(fitAllTables);
  });

  const observer = new MutationObserver(() => {
    window.requestAnimationFrame(fitAllTables);
  });

  window.addEventListener('DOMContentLoaded', () => {
    fitAllTables();
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
})();
