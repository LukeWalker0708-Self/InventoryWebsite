const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((node) => node.classList.remove('is-active'));
    panels.forEach((node) => node.classList.remove('is-active'));

    tab.classList.add('is-active');
    const target = document.getElementById(tab.dataset.target);
    if (target) target.classList.add('is-active');
  });
});
