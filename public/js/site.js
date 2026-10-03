(() => {
  // Photo thumbnails
  document.querySelectorAll('.product').forEach((product) => {
    const main = product.querySelector('.gallery-main img');
    product.querySelectorAll('.thumb').forEach((t) =>
      t.addEventListener('click', () => {
        if (main) main.src = t.dataset.src;
        product.querySelectorAll('.thumb').forEach((x) => x.classList.toggle('is-active', x === t));
      })
    );
  });

  // Mobile buy bar: show once the hero has scrolled away, hide again over the closing CTA
  const bar = document.getElementById('sticky-buy');
  const hero = document.querySelector('.hero');
  const closing = document.querySelector('.closing');
  if (bar && hero && 'IntersectionObserver' in window) {
    let pastHero = false;
    let atEnd = false;
    const update = () => (bar.hidden = !pastHero || atEnd);
    new IntersectionObserver(([e]) => ((pastHero = !e.isIntersecting && e.boundingClientRect.top < 0), update())).observe(hero);
    new IntersectionObserver(([e]) => ((atEnd = e.isIntersecting), update())).observe(closing);
  }

  // Gentle reveal on scroll
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }),
      { rootMargin: '0px 0px -10% 0px' }
    );
    document.querySelectorAll('.product, .steps li, .checks li').forEach((el) => {
      el.classList.add('reveal');
      io.observe(el);
    });
  }
})();
