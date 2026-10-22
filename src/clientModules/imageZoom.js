// Click any image in a guide or post to see it full-size, so authors don't need to wrap images in links.
// Resized WordPress copies ("name-1024x728.png") open as the original when it exists.
function fullSize(src) {
  return src.replace(/-\d+x\d+(\.\w+)$/, '$1');
}

function open(img) {
  const overlay = document.createElement('div');
  overlay.className = 'image-zoom';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', img.alt || 'Full-size image');
  const big = document.createElement('img');
  big.alt = img.alt;
  big.src = fullSize(img.currentSrc || img.src);
  big.onerror = () => {
    big.onerror = null;
    big.src = img.currentSrc || img.src;
  };
  overlay.appendChild(big);
  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => e.key === 'Escape' && close();
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  document.body.appendChild(overlay);
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const img = e.target.closest && e.target.closest('.markdown img');
    if (!img || img.closest('a')) return;
    e.preventDefault();
    open(img);
  });
}
