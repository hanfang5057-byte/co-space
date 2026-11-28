// Copy commands, and point the recommended desktop download at this platform.
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

function currentDownloadKind() {
  const platform = navigator.userAgentData?.platform ?? navigator.platform ?? '';
  const isMac = /mac/i.test(platform);
  const isLinux = /linux/i.test(platform) && !/android/i.test(platform);
  if (isMac) {
    const architecture = navigator.userAgentData?.architecture ?? '';
    return /arm/i.test(architecture) ? 'mac-arm' : null;
  }
  if (isLinux) return 'linux-appimage';
  return null;
}

const recommendation = currentDownloadKind();
if (recommendation) {
  const target = document.querySelector(`[data-os="${recommendation}"]`);
  target?.classList.add('is-current');
  if (target) target.title = '与当前系统匹配';
}

// A placeholder that survived the site build means the release manifest was
// unavailable; never leave a dead download link in place.
document.querySelectorAll('a[href*="{{"]').forEach((link) => {
  link.href = link.dataset.fallback ?? '#install';
  link.setAttribute('aria-disabled', 'true');
});
