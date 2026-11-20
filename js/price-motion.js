/* =========================================================================
   price-motion.js — 料金ページ（price.html）だけの「スクロールで現れる」動き（2026-11-20）
   - 参考: bizsalesnavi.contentsx.jp の「スクロールで浮き上がる」（20px・0.7秒・同じ親の中では 0.09秒ずつ遅らせる）
   - 見出し・カード・注記・ボタンが画面に入ったとき、下から 20px 浮き上がりながら現れる
   - 何度でも動く: 上へ戻って画面より下に出たものは、また隠しておく（見えない所で隠すので、消える瞬間は見えない）。
     もう一度下へスクロールすると、また現れる。上へ戻るときに上から入ってくるものは、見せたまま（動かさない）
   - 隠すのは「画面より下にあるもの」だけ。読み込んだ時点で画面の中・上にあるものは見せたまま
     （読み込み直後に一瞬消えてまた出る、を起こさない）
   - このスクリプトが動かないとき・IntersectionObserver が無いとき・「視差効果を減らす」設定のときは何も隠さない
   - 現れ終わったらクラスを外し、ボタンなどの元のホバーの動きに戻す
   - 見た目（.rx-reveal / .is-inview）は css/price.css の「動き」。ヒーローの登場は CSS だけで行う（1回だけ）
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
  var timers = new Map();

  function delayOf(el) {
    return parseInt(el.style.getPropertyValue('--rx-reveal-delay'), 10) || 0;
  }

  // 隠す（画面より下にあるとき）
  function hide(el) {
    window.clearTimeout(timers.get(el));
    timers.delete(el);
    el.classList.remove('is-inview');
    el.classList.add('rx-reveal');
  }

  // 現れる（画面に入ったとき）。現れ終わったらクラスを外して元の状態に戻す
  function reveal(el) {
    if (!el.classList.contains('rx-reveal') || el.classList.contains('is-inview')) return;
    el.classList.add('is-inview');
    window.clearTimeout(timers.get(el));
    timers.set(el, window.setTimeout(function () { show(el); }, DURATION + delayOf(el) + 150));
  }

  // 動かさずにそのまま見せる
  function show(el) {
    window.clearTimeout(timers.get(el));
    timers.delete(el);
    el.classList.remove('rx-reveal', 'is-inview');
  }

  // 画面に入ったら現れる（下 8% は外して、少し入ってから動かす）
  var revealIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) reveal(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

  // 画面の外へ完全に出たとき: 下へ出たものは隠し直す（次に下へスクロールしたとき、また現れる）
  var resetIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting || !entry.rootBounds) return;
      if (entry.boundingClientRect.top >= entry.rootBounds.bottom) hide(entry.target);
    });
  }, { threshold: 0 });

  // 画面に入らないまま上へ過ぎたもの（ページ内リンクの飛び先へのスクロール・途中での読み込み直し）は、動かさずに見せる
  function showAbove() {
    var els = document.querySelectorAll('.rx-reveal:not(.is-inview)');
    Array.prototype.forEach.call(els, function (el) {
      if (el.getBoundingClientRect().bottom <= 0) show(el);
    });
  }

  function init() {
    var viewH = window.innerHeight || document.documentElement.clientHeight;
    var counts = new Map();
    var targets = document.querySelectorAll(SELECTORS);
    Array.prototype.forEach.call(targets, function (el) {
      // 同じ親の中で上から何番目か（遅らせる時間）
      var n = counts.get(el.parentElement) || 0;
      counts.set(el.parentElement, n + 1);
      el.style.setProperty('--rx-reveal-delay', Math.min(n, MAX_STEPS) * STEP + 'ms');
      if (el.getBoundingClientRect().top >= viewH) el.classList.add('rx-reveal');   // 画面より下にあるものだけ隠す
      revealIO.observe(el);
      resetIO.observe(el);
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
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      ticking = false;
      showAbove();
    });
  }, { passive: true });
})();
