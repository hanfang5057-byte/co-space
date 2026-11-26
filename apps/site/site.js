document.querySelectorAll('.install-toggle').forEach((button) => {
  button.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') === 'true';
    const details = document.getElementById(button.getAttribute('aria-controls'));
    button.setAttribute('aria-expanded', String(!expanded));
    details.hidden = expanded;
    button.firstChild.textContent = expanded ? '查看安装步骤 ' : '收起安装步骤 ';
  });
});

document.querySelectorAll('[data-copy]').forEach((button) => {
  button.addEventListener('click', async () => {
    const original = button.textContent;
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.textContent = '已复制';
    } catch {
      button.textContent = '请手动复制';
    }
    setTimeout(() => { button.textContent = original; }, 1600);
  });
});

const setupPrompts = {
  'local-mcp': `请为当前 Agent 配置 CoSpace 本地 MCP。\n\n1. 确认你支持 stdio MCP，并且本机 Node.js 版本为 24 或更高。\n2. 按你当前产品支持的方式，查看或更新自己的 MCP 配置。保留其他所有配置，只添加或更新名为 cospace 的服务：command 为 npx，args 为 ["-y", "@hanfang5057/co-space@latest", "mcp"]。\n3. 不要把 CoSpace 文档、评论、密钥或其他本地文件复制到云端；不要修改其他 MCP 服务。\n4. 告诉我你使用的配置文件或设置入口、所做的更改，并说明是否需要我重启或重新连接 Agent。\n5. 重连后确认 CoSpace MCP 工具已出现。CoSpace 会在本机启动独立服务；即使你退出，用户仍可通过 MCP 返回的本地审阅链接或运行 npx -y @hanfang5057/co-space@latest service open 查看并决定是否接受建议。`
};

document.querySelectorAll('[data-copy-prompt]').forEach((button) => {
  button.addEventListener('click', async () => {
    const prompt = setupPrompts[button.dataset.copyPrompt];
    if (!prompt) return;
    const original = button.textContent;
    try {
      await navigator.clipboard.writeText(prompt);
      button.textContent = '已复制 Prompt';
    } catch {
      button.textContent = '复制失败，请手动配置';
    }
    setTimeout(() => { button.textContent = original; }, 1800);
  });
});
