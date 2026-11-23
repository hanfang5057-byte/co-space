document.querySelectorAll('.install-toggle').forEach((button) => {
  button.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') === 'true';
    const details = document.getElementById(button.getAttribute('aria-controls'));
    button.setAttribute('aria-expanded', String(!expanded));
    details.hidden = expanded;
    button.firstChild.textContent = expanded ? '查看安装步骤 ' : '收起安装步骤 ';
  });
});

const workbuddyPrompt = document.querySelector('#wb-prompt');
if (workbuddyPrompt && location.origin !== 'null') {
  const installerUrl = `${location.origin}/install.sh`;
  workbuddyPrompt.textContent = `请帮我安装 CoSpace WorkBuddy Connector。\ninstall.sh 下载地址：${installerUrl}\n请使用 Bash 下载并运行该脚本，执行 install 安装。完成后告诉我是否需要重启 WorkBuddy，以及如何打开 CoSpace 文档空间。\n安装命令：curl -fsSL ${installerUrl} | bash -s -- install`;
}

document.querySelector('.copy-prompt').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  const prompt = document.querySelector('#wb-prompt').textContent;
  try {
    await navigator.clipboard.writeText(prompt);
    button.textContent = '已复制提示词';
  } catch {
    button.textContent = '请手动选择并复制';
  }
  window.setTimeout(() => { button.textContent = '复制提示词'; }, 1800);
});
