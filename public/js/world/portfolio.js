// public/js/world/portfolio.js — the EXIT/ archive, shown below the surface.
//
// Each piece fills the whole screen, like walking up close to a wall in a
// gallery. Scroll down to move from one piece to the next. Videos play on
// their own (muted) while they're on screen and pause when they leave.

// Depths in the world (vh from the top), down in the dark water
const PIECES = [
  { y: 270, src: '/media/archive/intrusive-thoughts.mp4', title: 'Intrusive Thoughts', kind: 'Art installation · 001' },
];

export function placePortfolio() {
  const box = document.querySelector('#capsules');

  const watcher = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      const video = target.querySelector('video');
      if (isIntersecting) video.play().catch(() => {});
      else video.pause();
    }
  }, { threshold: 0.4 });

  for (const piece of PIECES) {
    const section = document.createElement('section');
    section.className = 'exhibit';
    section.style.top = `calc(var(--vh) * ${piece.y})`;
    section.setAttribute('aria-label', piece.title);

    const video = document.createElement('video');
    Object.assign(video, { src: piece.src, muted: true, loop: true, playsInline: true, preload: 'metadata' });

    const caption = document.createElement('div');
    caption.className = 'exhibit-caption';
    const kind = document.createElement('span');
    kind.className = 'exhibit-kind';
    kind.textContent = piece.kind;
    const title = document.createElement('strong');
    title.textContent = piece.title;
    caption.append(kind, title);

    const sound = document.createElement('button');
    sound.type = 'button';
    sound.className = 'exhibit-sound';
    sound.textContent = 'Sound off';
    sound.addEventListener('click', () => {
      video.muted = !video.muted;
      sound.textContent = video.muted ? 'Sound off' : 'Sound on';
    });

    section.append(video, caption, sound);
    box.append(section);
    watcher.observe(section);
  }
}
