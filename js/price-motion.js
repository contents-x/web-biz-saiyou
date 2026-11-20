/* =========================================================================
   price-motion.js — 料金ページ（price.html）だけの「スクロールで現れる」動き（2026-11-20）
   - 参考: bizsalesnavi.contentsx.jp の「スクロールで浮き上がる」（20px・0.7秒・同じ親の中では 0.09秒ずつ遅らせる）
   - 見出し・カード・注記・ボタンが画面に入ったとき、下から 20px 浮き上がりながら現れる
   - 隠すのは「読み込んだ時点で画面より下にあるもの」だけ。画面の中・上にあるものは最初から見せたまま
     （読み込み直後に一瞬消えてまた出る、を起こさない）
   - このスクリプトが動かないとき・IntersectionObserver が無いとき・「視差効果を減らす」設定のときは何も隠さない
   - 現れ終わったらクラスを外し、ボタンなどの元のホバーの動きに戻す
   - 見た目（.rx-reveal / .is-inview）は css/price.css の「動き」。ヒーローの登場は CSS だけで行う
   ========================================================================= */
(function () {
  'use strict';

  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // 現れるもの（セクションの見出し・カード・注記・ボタン）。⚠️ 入れ子にしない（親子の両方を動かすと動きが重なる）
  var SELECTORS = [
    // 01 料金の仕組み
    '.rx-price-guide__head > *', '.rx-price-guide__stages > *', '.rx-price-guide__foot',
    // 02 つくる・03 届ける（見出しは共通）
    '.rx-price-detail__head > *',
    '.rx-price-create__compare', '.rx-price-create__cards > li', '.rx-price-create__single-title',
    '.rx-price-create__single-list > li', '.rx-price-detail__notes',
    '.rx-price-deliver__cards > li', '.rx-price-deliver__note', '.rx-price-deliver__cta',
    // 04 制作・公開までの流れ
    '.rx-price-flow__head > *', '.rx-price-flow__steps > li', '.rx-price-flow__note',
    // 05 お問い合わせ・お見積もり
    '.rx-price-contact__head > *', '.rx-price-contact__badge', '.rx-price-contact__cards > li',
    '.rx-price-contact__actions', '.rx-price-contact__assure'
  ].join(',');

  var DURATION = 700;   // ms（css/price.css の transition と同じ）
  var STEP = 90;        // 同じ親の中で、上から順に遅らせる間隔
  var MAX_STEPS = 5;    // 遅らせるのは最大 0.45秒まで

  function finish(el) {
    el.classList.remove('rx-reveal', 'is-inview');
    el.style.removeProperty('--rx-reveal-delay');
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      io.unobserve(el);
      el.classList.add('is-inview');
      var delay = parseInt(el.style.getPropertyValue('--rx-reveal-delay'), 10) || 0;
      window.setTimeout(function () { finish(el); }, DURATION + delay + 150);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

  function init() {
    var viewH = window.innerHeight || document.documentElement.clientHeight;
    var counts = new Map();
    var targets = document.querySelectorAll(SELECTORS);
    Array.prototype.forEach.call(targets, function (el) {
      if (el.getBoundingClientRect().top < viewH) return;   // 画面の中・上にあるものは隠さない
      var n = counts.get(el.parentElement) || 0;
      counts.set(el.parentElement, n + 1);
      el.style.setProperty('--rx-reveal-delay', Math.min(n, MAX_STEPS) * STEP + 'ms');
      el.classList.add('rx-reveal');
      io.observe(el);
    });
  }

  // 読み込み直し・ページ内リンク（例: price.html#deliver）では、読み込みのあとにブラウザが途中までスクロールする。
  // そのとき画面より上に来たものは、動かさずにそのまま見せる（上へ戻ったときに改めて現れる、を起こさない）
  function showAbove() {
    var els = document.querySelectorAll('.rx-reveal:not(.is-inview)');
    Array.prototype.forEach.call(els, function (el) {
      if (el.getBoundingClientRect().bottom > 0) return;
      io.unobserve(el);
      finish(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  window.addEventListener('load', function () { window.setTimeout(showAbove, 0); });
  window.addEventListener('pageshow', function (e) { if (e.persisted) showAbove(); });
  // ページ内リンクの飛び先へのスクロールは load のあとにも続くことがあるので、スクロールのたびにも確かめる
  // （画面に入らないまま上へ過ぎたものだけが対象。普通に下へ読み進めたものは画面に入った時点で現れている）
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      ticking = false;
      showAbove();
      if (!document.querySelector('.rx-reveal:not(.is-inview)')) window.removeEventListener('scroll', onScroll);
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
})();
