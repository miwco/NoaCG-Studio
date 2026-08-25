// The docs page's one enhancement: highlight the section-nav link for the section on
// screen. The page is complete without this module — plain anchors already work — so
// everything here is progressive and silently stands down when it has nothing to do.

const nav = document.querySelector('.doc-nav');
if (nav) {
  const links = Array.from(nav.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'));
  const byId = new Map(links.map((link) => [link.hash.slice(1), link]));
  const sections = Array.from(document.querySelectorAll<HTMLElement>('.doc-body section[id]')).filter((s) =>
    byId.has(s.id),
  );

  let active: HTMLAnchorElement | null = null;
  const activate = (id: string) => {
    const link = byId.get(id);
    if (!link || link === active) return;
    active?.classList.remove('is-active');
    link.classList.add('is-active');
    active = link;
  };

  // The section being read is the last one whose top has crossed the upper third of the
  // viewport. A plain scroll listener (rAF-coalesced) over nine rect reads is cheap, works
  // for keyboard, anchor and drag scrolling alike, and needs no observer bookkeeping.
  let queued = false;
  const update = () => {
    queued = false;
    const line = window.innerHeight * 0.34;
    let current = sections[0];
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= line) current = section;
    }
    if (current) activate(current.id);
  };
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };
  document.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  update();
}

export {};
