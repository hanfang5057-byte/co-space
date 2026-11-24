document.querySelectorAll('.install-toggle').forEach((button) => {
  button.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') === 'true';
    const details = document.getElementById(button.getAttribute('aria-controls'));
    button.setAttribute('aria-expanded', String(!expanded));
    details.hidden = expanded;
    button.firstChild.textContent = expanded ? '查看安装步骤 ' : '收起安装步骤 ';
  });
});
