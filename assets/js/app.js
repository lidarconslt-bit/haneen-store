/* =========================================================
   حنين — منطق الواجهة
   يقرأ config.json ويبني الصفحة. لا يعتمد على أي مكتبة خارجية.
   ========================================================= */
(function () {
  'use strict';

  var CFG = null;
  var STATUS = { ordersOpen: true, remaining: null };
  var state = {
    step: 1, product: null, size: null, level: null,
    styles: [], otherStyle: false, audiences: [], extras: {}
  };
  var DRAFT_KEY = 'haneen_draft';

  /* ---------- أدوات ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function txt(sel, v) { var e = $(sel); if (e) e.textContent = v == null ? '' : v; }
  function icon(name) { return '<svg aria-hidden="true"><use href="#i-' + name + '"/></svg>'; }
  function on(sorted) { return (sorted || []).filter(function (x) { return x.enabled !== false; })
      .sort(function (a, b) { return (a.order || 0) - (b.order || 0); }); }
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }

  /* ---------- التحميل ---------- */
  fetch('config.json?v=' + Date.now())
    .then(function (r) { if (!r.ok) throw new Error('config ' + r.status); return r.json(); })
    .then(function (cfg) { CFG = cfg; build(); return fetchStatus(); })
    .catch(function (e) {
      console.error('[حنين] تعذّر تحميل config.json:', e);
      document.body.insertAdjacentHTML('afterbegin',
        '<div style="padding:16px;background:#F8E9E5;color:#A8452F;text-align:center">' +
        'تعذّر تحميل بيانات الموقع. تأكدي من تشغيل الموقع عبر خادم محلي وليس بفتح الملف مباشرة.</div>');
    });

  /* ---------- بناء الصفحة ---------- */
  function build() {
    renderLogos();
    renderAnnounce();
    renderHero();
    renderTrustbar();
    renderStory();
    renderIdea();
    renderProducts();
    renderStyles();
    renderGallery();
    renderPlans();
    renderSteps();
    renderDelivery();
    renderForm();
    renderFaq();
    renderFooter();
    wireWhatsAppLinks();
    initWaFab();
    initLegalModal();
    initLightbox();
    initReveal();
    initCtaBar();
    initServiceWorker();
    restoreDraft();
    document.title = CFG.store.name + ' — ' + CFG.store.tagline;
    txt('#logo-tag', CFG.store.tagline);
  }

  /* الشعار: النسخة الداكنة على الخلفيات الفاتحة، والفاتحة على الداكنة.
     يكفي وسم العنصر بـ data-logo="on-light" أو "on-dark". */
  var LOGOS = { 'on-light': 'assets/img/logo-dark.svg', 'on-dark': 'assets/img/logo-light.svg' };
  function renderLogos() {
    $$('[data-logo]').forEach(function (el) {
      var src = LOGOS[el.dataset.logo];
      if (src) el.src = src;
    });
  }

  function renderAnnounce() {
    var a = CFG.announcement || {};
    if (!a.enabled || !a.text) return;
    $('#announce-slot').innerHTML = '<div class="announce">' + esc(a.text) + '</div>';
  }

  function renderHero() {
    var h = CFG.hero || {};
    txt('#hero-title', h.title);
    txt('#hero-sub', h.subtitle);
    txt('#hero-cta', h.cta);
    txt('#hero-cta2', h.ctaSecondary);

    var ops = CFG.operations || {};
    $('#hero-trust').innerHTML = [
      { i: 'clock', t: 'التسليم خلال ' + ops.deliveryTime },
      { i: 'edit', t: 'تعديل مجاني' },
      { i: 'print', t: 'ملف طباعة + رقمي' }
    ].map(function (x) { return '<li>' + icon(x.i) + '<span>' + esc(x.t) + '</span></li>'; }).join('');

    txt('#hero-for', h.audienceLine);
    if (!h.audienceLine) $('#hero-for').hidden = true;

    $('#hero-media').innerHTML = on(CFG.gallery).slice(0, 3).map(function (g) {
      return '<img src="' + esc(g.image) + '" alt="' + esc(g.title) + '" loading="eager" width="300" height="400">';
    }).join('');
  }

  function renderTrustbar() {
    var ops = CFG.operations || {};
    $('#trustbar').innerHTML = [
      { i: 'clock', t: 'التسليم خلال ' + ops.deliveryTime },
      { i: 'edit', t: revisions(ops.freeRevisions) + ' خلال ' + ops.revisionWindow },
      { i: 'print', t: 'PDF للطباعة + PNG للاستخدام الرقمي' },
      { i: 'size', t: 'بالمقاس الذي تختاره' }
    ].map(function (x) { return '<li>' + icon(x.i) + '<span>' + esc(x.t) + '</span></li>'; }).join('');
  }

  function renderIdea() {
    var d = CFG.idea || {};
    $('#idea-list').innerHTML = (d.points || []).map(function (p, i) {
      return '<div class="idea__item" data-reveal style="--d:' + (i * 90) + 'ms">' +
        '<div class="idea__num">' + icon(p.icon) + '</div>' +
        '<div><h3>' + esc(p.title) + '</h3><p>' + esc(p.text) + '</p></div></div>';
    }).join('');
  }

  function renderProducts() {
    $('#products-grid').innerHTML = on(CFG.products).map(function (p, i) {
      var soon = !!p.badge;
      return '<button type="button" class="card product' + (soon ? ' is-soon' : '') + '"' +
        (soon ? ' disabled' : ' data-product="' + esc(p.id) + '"') +
        ' data-reveal="card" style="--d:' + (i * 55) + 'ms">' +
        (soon ? '<span class="badge product__badge">' + esc(p.badge) + '</span>' : '') +
        '<span class="product__icon">' + icon(p.icon) + '</span>' +
        '<span class="product__name">' + esc(p.name) + '</span>' +
        '<span class="product__desc">' + esc(p.desc) + '</span>' +
        '<span class="product__foot">' +
          '<span class="product__price"><span class="num">' + p.price + '</span> ريال <small>يبدأ من</small></span>' +
          (soon ? '' : '<span class="product__pick">اختيار ←</span>') +
        '</span></button>';
    }).join('');

    $$('#products-grid [data-product]').forEach(function (b) {
      b.addEventListener('click', function () { pickProductAndGo(b.dataset.product); });
    });
  }

  function pickProductAndGo(productId) {
    var el = $('#opt-product input[value="' + productId + '"]');
    if (el) { el.checked = true; state.product = productId; }
    calcTotal();
    saveDraft();
    gotoStep(1);
    goToOrder();
  }

  function goToOrder() {
    var el = $('#order');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderStyles() {
    $('#styles-grid').innerHTML = on(CFG.styles).map(function (s, i) {
      return '<button type="button" class="card style" data-style="' + esc(s.id) + '" data-reveal style="--d:' + (i * 60) + 'ms">' +
        '<img src="' + esc(s.image) + '" alt="نموذج أسلوب ' + esc(s.name) + '" loading="lazy" width="320" height="240">' +
        '<div class="style__body"><div class="style__name">' + esc(s.name) + '</div>' +
        '<div class="style__desc">' + esc(s.desc) + '</div></div></button>';
    }).join('');
    $$('#styles-grid .style').forEach(function (b) {
      b.addEventListener('click', function () { pickStyleAndGo(b.dataset.style); });
    });
  }

  function renderGallery() {
    var styles = on(CFG.styles);
    $('#gallery-filters').innerHTML =
      '<button type="button" class="chip is-active" data-f="all">الكل</button>' +
      styles.map(function (s) { return '<button type="button" class="chip" data-f="' + esc(s.id) + '">' + esc(s.name) + '</button>'; }).join('');

    drawWorks('all');

    $$('#gallery-filters .chip').forEach(function (c) {
      c.addEventListener('click', function () {
        $$('#gallery-filters .chip').forEach(function (x) { x.classList.remove('is-active'); });
        c.classList.add('is-active');
        drawWorks(c.dataset.f);
      });
    });
  }

  function drawWorks(filter) {
    var styles = on(CFG.styles), products = CFG.products || [];
    var items = on(CFG.gallery).filter(function (g) { return filter === 'all' || g.style === filter; });
    if (!items.length) {
      $('#gallery-grid').innerHTML = '<p style="color:var(--color-text-muted);grid-column:1/-1">لا توجد نماذج بهذا الأسلوب بعد.</p>';
      return;
    }
    shown = items;
    $('#gallery-grid').innerHTML = items.map(function (g, i) {
      return '<button type="button" class="card work" data-i="' + i + '"' +
        ' data-reveal="card" style="--d:' + (Math.min(i, 7) * 50) + 'ms"' +
        ' aria-label="عرض العمل: ' + esc(g.title) + '">' +
        '<span class="work__img">' +
          '<img src="' + esc(g.image) + '" alt="' + esc(g.title) + '" loading="lazy" width="300" height="400">' +
          '<span class="work__veil"><span class="work__zoom">' + icon('zoom') + 'عرض العمل</span></span>' +
        '</span>' +
        '<span class="work__body">' +
          '<span class="work__title">' + esc(g.title) + '</span>' +
          '<span class="work__meta">' + metaOf(g) + '</span>' +
        '</span></button>';
    }).join('');

    $$('#gallery-grid .work').forEach(function (b) {
      b.addEventListener('click', function () { openLightbox(+b.dataset.i); });
    });
    revealScan();
  }

  function metaOf(g) {
    var st = byId(on(CFG.styles), g.style), pr = byId(CFG.products || [], g.product);
    return [g.age, st ? st.name : '', pr ? pr.name : ''].filter(Boolean)
      .map(function (m) { return '<span>' + esc(m) + '</span>'; })
      .join('<span aria-hidden="true">·</span>');
  }

  /* ---------- صندوق عرض العمل ---------- */
  var shown = [], lbIndex = 0;

  function openLightbox(i) {
    var dlg = $('#lightbox');
    if (!dlg || !dlg.showModal) { pickStyleAndGo(shown[i].style, shown[i].product); return; }
    drawLightbox(i);
    if (!dlg.open) dlg.showModal();
  }

  function drawLightbox(i) {
    lbIndex = (i + shown.length) % shown.length;
    var g = shown[lbIndex];
    txt('#lb-title', g.title);
    var img = $('#lb-img');
    img.src = g.image; img.alt = g.title;
    $('#lb-meta').innerHTML = metaChips(g);
    txt('#lb-count', (lbIndex + 1) + ' / ' + shown.length);
    var multi = shown.length > 1;
    $('#lb-prev').hidden = !multi;
    $('#lb-next').hidden = !multi;
  }

  function metaChips(g) {
    var st = byId(on(CFG.styles), g.style), pr = byId(CFG.products || [], g.product);
    return [['المستوى', g.age], ['الأسلوب', st ? st.name : ''], ['النوع', pr ? pr.name : '']]
      .filter(function (r) { return r[1]; })
      .map(function (r) { return '<span class="badge badge--soft">' + esc(r[0]) + ': ' + esc(r[1]) + '</span>'; })
      .join('');
  }

  function initLightbox() {
    var dlg = $('#lightbox');
    if (!dlg || !dlg.showModal) return;
    $('#lb-close').addEventListener('click', function () { dlg.close(); });
    $('#lb-prev').addEventListener('click', function () { drawLightbox(lbIndex - 1); });
    $('#lb-next').addEventListener('click', function () { drawLightbox(lbIndex + 1); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('keydown', function (e) {
      /* في RTL: السهم الأيمن يعود للسابق */
      if (e.key === 'ArrowRight') drawLightbox(lbIndex - 1);
      if (e.key === 'ArrowLeft') drawLightbox(lbIndex + 1);
    });
    $('#lb-cta').addEventListener('click', function () {
      var g = shown[lbIndex];
      dlg.close();
      pickStyleAndGo(g.style, g.product);
    });
  }

  function pickStyleAndGo(styleId, productId) {
    var s = $('#opt-style input[value="' + styleId + '"]');
    if (s && !s.checked) { s.checked = true; state.styles = checkedValues('style'); }
    if (productId) {
      var p = $('#opt-product input[value="' + productId + '"]');
      if (p) { p.checked = true; state.product = productId; }
    }
    calcTotal();
    saveDraft();
    gotoStep(1);
    goToOrder();
  }

  function renderPlans() {
    $('#plans-grid').innerHTML = on(CFG.packages).map(function (p, i) {
      return '<article class="card plan' + (p.featured ? ' is-featured' : '') + '" data-reveal style="--d:' + (i * 90) + 'ms">' +
        (p.featured ? '<span class="plan__flag">الأكثر طلبًا</span>' : '') +
        '<div class="plan__head"><div class="plan__name">' + esc(p.name) + '</div>' +
        '<div class="plan__note">' + esc(p.note || '') + '</div></div>' +
        '<ul class="plan__items">' + (p.items || []).map(function (it) {
          return '<li>' + icon('check') + '<span>' + esc(it) + '</span></li>';
        }).join('') + '</ul>' +
        '<div class="plan__sep"></div>' +
        '<div class="plan__price"><span class="num">' + p.price + '</span><span>ريال</span></div>' +
        '<a href="' + esc(waLink(packageMessage(p))) + '" class="btn btn--primary"' +
        ' target="_blank" rel="noopener">اطلبها الآن</a>' +
        '<span class="plan__dest">يفتح محادثة واتساب</span></article>';
    }).join('');

    var ops = CFG.operations || {};
    txt('#pricing-note', 'الباقات تُطلب عبر واتساب مباشرة. الأسعار تشمل ' + revisions(ops.freeRevisions) +
      '، والتعديل الإضافي بـ' + ar(ops.extraRevisionPrice) + ' ريالًا. الدفع بالتحويل البنكي.');
  }

  /* رسالة واتساب جاهزة للإرسال — تحمل اسم الباقة وسعرها */
  function packageMessage(p) {
    var L = [];
    L.push('السلام عليكم، أرغب في طلب «' + p.name + '» من ' + CFG.store.name + '.');
    L.push('السعر: ' + p.price + ' ريال');
    L.push('');
    L.push('أرجو إفادتي بالخطوة التالية.');
    return L.join('\n');
  }

  function renderSteps() {
    $('#steps-grid').innerHTML = (CFG.steps || []).map(function (s, i) {
      return '<div class="step" data-reveal style="--d:' + (i * 80) + 'ms">' +
        '<div class="step__n"><span class="num">' + s.n + '</span></div>' +
        '<div><h3>' + esc(s.title) + '</h3><p>' + esc(s.text) + '</p></div></div>';
    }).join('');
  }

  function renderDelivery() {
    var d = CFG.delivery || {};
    txt('#delivery-title', d.title);
    $('#delivery-list').innerHTML = (d.items || []).map(function (t, i) {
      return '<li data-reveal="soft" style="--d:' + (i * 70) + 'ms">' + icon('check') + '<span>' + esc(t) + '</span></li>';
    }).join('');
  }

  /* ---------- النموذج ---------- */
  function renderForm() {
    var products = on(CFG.products);

    $('#opt-product').innerHTML = products.map(function (p) {
      return optHtml('product', p.id, p.name, p.price + ' ريال');
    }).join('');

    $('#opt-style').innerHTML = on(CFG.styles).map(function (s) {
      return optHtml('style', s.id, s.name, '', 'checkbox');
    }).join('');

    $('#opt-size').innerHTML = (CFG.sizes || []).map(function (s) {
      return optHtml('size', s.id, s.name, s.hint);
    }).join('');

    $('#opt-audience').innerHTML = on(CFG.audiences).map(function (a) {
      return optHtml('audience', a.id, a.name, '', 'checkbox');
    }).join('');

    $('#opt-level').innerHTML = on(CFG.levels).map(function (l) {
      return optHtml('level', l.id, l.name, l.hint);
    }).join('');

    var msgs = CFG.messages || {};
    txt('#styles-hint', msgs.stylesHint);
    txt('#form-time', msgs.formTime);
    txt('#draft-text', msgs.draftRestored);

    $('#f-other-style').addEventListener('change', function () {
      state.otherStyle = this.checked;
      $('#other-style-wrap').hidden = !this.checked;
      if (this.checked) $('#f-other-style-text').focus();
      clearError($('#opt-style').closest('.field'));
      calcTotal();
    });

    $('#f-subject').innerHTML = '<option value="">اختر المجال</option>' +
      (CFG.subjects || []).map(function (s) { return '<option>' + esc(s) + '</option>'; }).join('');

    var ad = CFG.addons || {}, adHtml = '';
    ['extraSize', 'rush'].forEach(function (k) {
      var a = ad[k];
      if (!a || a.enabled === false) return;
      adHtml += '<label class="addon"><input type="checkbox" data-addon="' + k + '" value="' + a.price + '">' +
        '<span class="addon__txt">' + esc(a.label) + '</span>' +
        '<span class="addon__price">+<span class="num">' + a.price + '</span> ريال</span></label>';
    });
    if (adHtml) $('#addons-list').innerHTML = adHtml; else $('#addons-field').style.display = 'none';

    txt('#privacy-note', (CFG.messages || {}).privacyNote);
    txt('#content-disclaimer', (CFG.messages || {}).contentDisclaimer);
    txt('#success-title', (CFG.messages || {}).successTitle);
    txt('#success-body', (CFG.messages || {}).successBody);

    var pay = CFG.payment || {};
    txt('#pay-bank', pay.bankName);
    txt('#pay-beneficiary', pay.beneficiary);
    txt('#pay-iban', pay.iban);
    txt('#pay-instructions', pay.instructions);

    $('#order-form').addEventListener('change', function (e) {
      var t = e.target;
      if (t.name === 'style') state.styles = checkedValues('style');
      else if (t.name === 'audience') state.audiences = checkedValues('audience');
      else if (t.name && state.hasOwnProperty(t.name)) state[t.name] = t.value;
      if (t.dataset.addon) state.extras[t.dataset.addon] = t.checked;
      clearError(t.closest('.field'));
      calcTotal();
      saveDraft();
    });
    $('#order-form').addEventListener('input', function (e) {
      clearError(e.target.closest('.field'));
      saveDraft();
    });

    $('#btn-next').addEventListener('click', function () { if (validateStep(state.step)) gotoStep(state.step + 1); });
    $('#btn-prev').addEventListener('click', function () { gotoStep(state.step - 1); });
    $('#btn-edit-summary').addEventListener('click', function () { gotoStep(1); });
    $('#btn-draft-clear').addEventListener('click', function () { clearDraft(); resetForm(); });
    $('#order-form').addEventListener('submit', submitOrder);
    $('#btn-copy').addEventListener('click', copyIban);
    $('#btn-new').addEventListener('click', function () { clearDraft(); resetForm(); });

    calcTotal();
  }

  function optHtml(name, val, label, hint, type) {
    return '<label class="opt"><input type="' + (type || 'radio') + '" name="' + name + '" value="' + esc(val) + '">' +
      '<span>' + esc(label) + (hint ? '<small>' + esc(hint) + '</small>' : '') + '</span></label>';
  }

  function checkedValues(name) {
    return $$('#order-form input[name="' + name + '"]:checked').map(function (i) { return i.value; });
  }

  function gotoStep(n) {
    n = Math.max(1, Math.min(3, n));
    state.step = n;
    $$('.fstep').forEach(function (s) { s.classList.toggle('is-active', +s.dataset.step === n); });
    $$('.progress__item').forEach(function (p) {
      var i = +p.dataset.p;
      p.classList.toggle('is-active', i === n);
      p.classList.toggle('is-done', i < n);
    });
    $('#btn-prev').style.display = n > 1 ? '' : 'none';
    $('#btn-next').style.display = n < 3 ? '' : 'none';
    $('#btn-submit').style.display = n === 3 ? '' : 'none';
    if (n === 3) renderSummary();
    var head = $('#order .section__head');
    if (head && n > 1) head.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function setError(field) { if (field) field.classList.add('has-error'); }
  function clearError(field) { if (field) field.classList.remove('has-error'); }

  function validateStep(n) {
    var ok = true, first = null;
    function bad(el) { var f = el.closest('.field'); setError(f); if (!first) first = f; ok = false; }

    if (n === 1) {
      ['product', 'size', 'level'].forEach(function (g) {
        if (!$('#opt-' + g + ' input:checked')) bad($('#opt-' + g));
      });
      /* الأسلوب: إما اختيار واحد على الأقل، أو وصف أسلوب آخر */
      var hasStyle = state.styles.length > 0;
      var hasOther = state.otherStyle && $('#f-other-style-text').value.trim().length >= 3;
      if (!hasStyle && !hasOther) bad($('#opt-style'));
      if (!state.audiences.length) bad($('#opt-audience'));
    }
    if (n === 2) {
      if (!$('#f-topic').value.trim()) bad($('#f-topic'));
    }
    if (n === 3) {
      if ($('#f-name').value.trim().length < 2) bad($('#f-name'));
      if (!normalizePhone($('#f-phone').value)) bad($('#f-phone'));
    }
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return ok;
  }

  function normalizePhone(v) {
    var d = String(v || '').replace(/[^\d]/g, '');
    if (/^9665\d{8}$/.test(d)) return d;
    if (/^05\d{8}$/.test(d)) return '966' + d.slice(1);
    if (/^5\d{8}$/.test(d)) return '966' + d;
    if (/^009665\d{8}$/.test(d)) return d.slice(2);
    return null;
  }

  function calcTotal() {
    var p = byId(CFG.products || [], state.product);
    var pr = CFG.pricing || {};
    var free = pr.freeStyles == null ? 2 : pr.freeStyles;
    var unit = pr.extraStylePrice == null ? 15 : pr.extraStylePrice;

    var total = p ? p.price : 0, parts = [];
    if (p) parts.push(p.name + ' ' + p.price);

    /* «أسلوب آخر» لا يُحتسب ضمن الأساليب المدفوعة */
    var paidExtra = Math.max(0, state.styles.length - free);
    var stylesCost = paidExtra * unit;
    if (stylesCost) parts.push('أساليب إضافية +' + stylesCost);

    var ad = CFG.addons || {};
    Object.keys(state.extras).forEach(function (k) {
      if (state.extras[k] && ad[k]) { total += ad[k].price; parts.push('+' + ad[k].price); }
    });
    total += stylesCost;

    bump(total);
    txt('#total-breakdown', p ? parts.join(' · ') : 'اختر نوع التصميم للبدء');
    state.total = total;
    updateStyleNote(free, unit, paidExtra);
    return total;
  }

  var lastTotal = null;
  function bump(total) {
    var el = $('#total-value');
    if (lastTotal !== null && lastTotal !== total) {
      var p = el.parentNode;
      p.classList.remove('is-bumped');
      void p.offsetWidth;
      p.classList.add('is-bumped');
    }
    lastTotal = total;
    el.textContent = total;
  }

  /* رسالة إيجابية عن الأساليب — لا تُشعر العميلة بأنها أخطأت */
  function updateStyleNote(free, unit, paidExtra) {
    var note = $('#style-note'), n = state.styles.length;
    if (!note) return;
    if (n === 0) { note.hidden = true; return; }
    note.hidden = false;
    if (n <= free) {
      note.className = 'stylenote stylenote--ok';
      note.textContent = n === 1
        ? 'يمكنك إضافة أسلوب ثانٍ ضمن نفس السعر.'
        : 'أسلوبان ضمن السعر الأساسي — نختار الأنسب لمحتواك.';
    } else {
      note.className = 'stylenote';
      note.textContent = ar(n) + ' أساليب: أول ' + ar(free) + ' ضمن السعر، و' +
        ar(paidExtra) + ' إضافي بـ' + ar(paidExtra * unit) + ' ريالًا.';
    }
  }

  /* ---------- رقم الطلب ---------- */
  function makeOrderNo() {
    var d = new Date();
    var key = String(d.getFullYear()).slice(2) +
      ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2);
    var seq = 1;
    try {
      var raw = JSON.parse(localStorage.getItem('haneen_seq') || '{}');
      seq = (raw.date === key ? raw.n : 0) + 1;
      localStorage.setItem('haneen_seq', JSON.stringify({ date: key, n: seq }));
    } catch (e) { seq = Math.floor(Math.random() * 900) + 1; }
    return 'HN-' + key + '-' + ('00' + seq).slice(-3);
  }

  /* ---------- الإرسال ---------- */
  function submitOrder(e) {
    e.preventDefault();
    if (!validateStep(3)) return;
    if ($('#f-website').value) return; /* مصيدة السبام */

    var btn = $('#btn-submit');
    btn.disabled = true;
    btn.textContent = 'جارٍ الإرسال…';
    $('#submit-error').innerHTML = '';

    var payload = collect();
    saveLocal(payload);

    var url = (CFG.integrations || {}).ordersEndpoint;
    if (!url) { finish(payload); return; }

    var ctrl = new AbortController();
    var to = setTimeout(function () { ctrl.abort(); }, 8000);

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
      redirect: 'follow'
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        clearTimeout(to);
        if (res && res.orderNo) payload.orderNo = res.orderNo;
        finish(payload);
      })
      .catch(function (err) {
        clearTimeout(to);
        console.warn('[حنين] تعذّر تسجيل الطلب في الجدول:', err);
        finish(payload);
      });
  }

  function namesOf(list, ids) {
    return (ids || []).map(function (id) { var o = byId(list || [], id); return o ? o.name : id; });
  }

  function collect() {
    var p = byId(CFG.products || [], state.product);
    var sz = byId(CFG.sizes || [], state.size);
    var lv = byId(CFG.levels || [], state.level);
    var ad = CFG.addons || {}, extras = [];
    Object.keys(state.extras).forEach(function (k) { if (state.extras[k] && ad[k]) extras.push(ad[k].label); });

    return {
      key: (CFG.integrations || {}).sharedKey || '',
      orderNo: makeOrderNo(),
      name: $('#f-name').value.trim(),
      phone: normalizePhone($('#f-phone').value),
      product: p ? p.name : '',
      styles: namesOf(CFG.styles, state.styles).join('، '),
      otherStyle: state.otherStyle ? $('#f-other-style-text').value.trim() : '',
      size: sz ? sz.name : '',
      audience: namesOf(CFG.audiences, state.audiences).join('، '),
      level: lv ? lv.name : '',
      subject: $('#f-subject').value,
      topic: $('#f-topic').value.trim(),
      content: $('#f-content').value.trim(),
      reference: $('#f-reference').value.trim(),
      notes: $('#f-notes').value.trim(),
      extras: extras.join('، '),
      amount: calcTotal(),
      status: 'جديد'
    };
  }

  /* ---------- ملخص الطلب قبل الإرسال ---------- */
  function renderSummary() {
    var d = collectLight();
    var rows = [
      ['نوع التصميم', d.product],
      ['الأسلوب', d.styles + (d.otherStyle ? (d.styles ? ' + ' : '') + 'أسلوب مخصص' : '')],
      ['المقاس', d.size],
      ['موجّه إلى', d.audience],
      ['المستوى', d.level],
      ['الموضوع', [d.topic, d.subject].filter(Boolean).join(' — ')],
      ['إضافات', d.extras],
      ['الإجمالي', d.amount + ' ريال']
    ].filter(function (r) { return r[1]; });

    $('#summary-list').innerHTML = rows.map(function (r) {
      return '<div class="summary__row"><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>';
    }).join('');
  }

  function collectLight() {
    var p = byId(CFG.products || [], state.product);
    var sz = byId(CFG.sizes || [], state.size);
    var lv = byId(CFG.levels || [], state.level);
    var ad = CFG.addons || {}, extras = [];
    Object.keys(state.extras).forEach(function (k) { if (state.extras[k] && ad[k]) extras.push(ad[k].label); });
    return {
      product: p ? p.name : '', size: sz ? sz.name : '', level: lv ? lv.name : '',
      styles: namesOf(CFG.styles, state.styles).join('، '),
      otherStyle: state.otherStyle ? $('#f-other-style-text').value.trim() : '',
      audience: namesOf(CFG.audiences, state.audiences).join('، '),
      subject: $('#f-subject').value, topic: $('#f-topic').value.trim(),
      extras: extras.join('، '), amount: state.total || 0
    };
  }

  function saveLocal(p) {
    try {
      var arr = JSON.parse(localStorage.getItem('haneen_orders') || '[]');
      arr.push({ at: new Date().toISOString(), order: p });
      localStorage.setItem('haneen_orders', JSON.stringify(arr.slice(-50)));
    } catch (e) { /* تجاهل */ }
  }

  function finish(p) {
    clearDraft();
    txt('#order-number', p.orderNo);
    txt('#pay-amount', p.amount);
    $('#btn-wa').href = waLink(orderMessage(p));
    $('#order-form').style.display = 'none';
    $('#success').classList.add('is-shown');
    $('#success').scrollIntoView({ behavior: 'smooth', block: 'start' });
    var b = $('#btn-submit'); b.disabled = false; b.textContent = 'إرسال الطلب';
  }

  function orderMessage(p) {
    var L = [];
    L.push('طلب تصميم من موقع ' + CFG.store.name);
    L.push('رقم الطلب: ' + p.orderNo);
    L.push('');
    L.push('الاسم: ' + p.name);
    L.push('نوع التصميم: ' + p.product);
    if (p.styles) L.push('الأسلوب: ' + p.styles);
    if (p.otherStyle) L.push('أسلوب مخصص: ' + p.otherStyle);
    L.push('المقاس: ' + p.size);
    L.push('موجّه إلى: ' + p.audience);
    L.push('المستوى: ' + p.level);
    L.push('الموضوع: ' + p.topic);
    if (p.subject) L.push('المجال: ' + p.subject);
    if (p.extras) L.push('إضافات: ' + p.extras);
    L.push('المبلغ: ' + p.amount + ' ريال');
    if (p.content) L.push('', 'المحتوى:', p.content);
    if (p.reference) L.push('', 'رابط مرجعي: ' + p.reference);
    if (p.notes) L.push('', 'ملاحظات: ' + p.notes);
    L.push('', 'سأرسل إيصال التحويل بعد قليل.');
    return L.join('\n');
  }

  function waLink(text) {
    var n = String((CFG.contact || {}).whatsapp || '').replace(/[^\d]/g, '');
    return 'https://wa.me/' + n + (text ? '?text=' + encodeURIComponent(text) : '');
  }

  function wireWhatsAppLinks() {
    var c = CFG.contact || {};
    var generic = c.greeting || ('السلام عليكم، لدي استفسار عن تصاميم ' + CFG.store.name);
    ['#footer-wa', '#closed-wa', '#wa-fab'].forEach(function (s) {
      var e = $(s); if (e) e.href = waLink(generic);
    });
    txt('#footer-wa-label', c.whatsappLabel);
  }

  function copyIban() {
    var v = ($('#pay-iban').textContent || '').trim();
    var btn = $('#btn-copy');
    function done() { btn.textContent = 'تم النسخ'; setTimeout(function () { btn.textContent = 'نسخ الآيبان'; }, 2000); }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(v).then(done).catch(fallback);
    } else fallback();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = v; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { btn.textContent = 'انسخيه يدويًا'; }
      document.body.removeChild(ta);
    }
  }

  function resetForm() {
    $('#order-form').reset();
    state.product = state.size = state.level = null;
    state.styles = []; state.audiences = []; state.otherStyle = false;
    state.extras = {};
    lastTotal = null;
    $('#other-style-wrap').hidden = true;
    $('#style-note').hidden = true;
    $('#success').classList.remove('is-shown');
    $('#order-form').style.display = '';
    calcTotal();
    gotoStep(1);
    $('#order').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- حالة المتجر والسعة ---------- */
  function fetchStatus() {
    var ops = CFG.operations || {};
    var url = (CFG.integrations || {}).ordersEndpoint;
    if (!url) { applyStatus({ ordersOpen: ops.ordersOpen !== false, remaining: null }); return; }
    var q = url + (url.indexOf('?') > -1 ? '&' : '?') + 'action=status&key=' +
      encodeURIComponent((CFG.integrations || {}).sharedKey || '');
    fetch(q, { redirect: 'follow' })
      .then(function (r) { return r.json(); })
      .then(function (s) {
        applyStatus({
          ordersOpen: ops.ordersOpen !== false && s.ordersOpen !== false,
          remaining: typeof s.remaining === 'number' ? s.remaining : null
        });
      })
      .catch(function () { applyStatus({ ordersOpen: ops.ordersOpen !== false, remaining: null }); });
  }

  function applyStatus(s) {
    STATUS = s;
    var ops = CFG.operations || {};
    var closed = !s.ordersOpen;
    var full = s.remaining !== null && s.remaining <= 0;

    if (closed || full) {
      $('#order-form').style.display = 'none';
      $('#store-closed').style.display = '';
      txt('#closed-text', closed ? ops.closedMessage : ops.capacityMessage);
      txt('#order-capacity', '');
      return;
    }
    /* «المتبقي» يُعرض فقط حين نعرفه فعلًا من الجدول — لا نعد بما لا نقيسه */
    txt('#order-capacity', s.remaining !== null
      ? 'نستقبل ' + ops.dailyCapacity + ' طلبات يوميًا — المتبقي اليوم: ' + s.remaining + '.'
      : 'نستقبل ' + ops.dailyCapacity + ' طلبات يوميًا.');
  }

  /* صياغة عربية سليمة لعدد التعديلات */
  function revisions(n) {
    n = Number(n) || 0;
    if (n === 1) return 'تعديلًا مجانيًا واحدًا';
    if (n === 2) return 'تعديلين مجانيين';
    return ar(n) + ' تعديلات مجانية';
  }

  /* الأرقام لاتينية في كل الموقع — الخلط بين النظامين يبدو غير متقن */
  function ar(n) { return String(n == null ? '' : n); }

  /* ---------- الحركة ---------- */
  var io = null;
  function initReveal() {
    document.documentElement.classList.add('reveal-ready');
    if (!('IntersectionObserver' in window) ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      $$('[data-reveal]').forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    revealScan();

    /* شبكة أمان: إن لم يعمل المراقب لأي سبب، لا تبقَ العناصر مخفية */
    setTimeout(function () {
      if ($$('[data-reveal].is-in').length) return;
      io = null;
      $$('[data-reveal]').forEach(function (el) { el.classList.add('is-in'); });
    }, 1500);
  }
  function revealScan() {
    if (!io) { $$('[data-reveal]:not(.is-in)').forEach(function (e) { e.classList.add('is-in'); }); return; }
    $$('[data-reveal]:not(.is-in)').forEach(function (el) { io.observe(el); });
  }

  /* ---------- شريط الإجراء ---------- */
  function initCtaBar() {
    var bar = $('#cta-bar'), hero = $('.hero'), order = $('#order');
    if (!bar || !hero || !order) return;
    var ticking = false;

    var header = $('.header');
    function sync() {
      ticking = false;
      if (header) header.classList.toggle('is-stuck', window.scrollY > 8);
      var past = hero.getBoundingClientRect().bottom < 0;
      var o = order.getBoundingClientRect();
      var inOrder = o.top < window.innerHeight * 0.85 && o.bottom > 0;
      var show = past && !inOrder;
      bar.classList.toggle('is-shown', show);
      document.body.classList.toggle('cta-visible', show);
    }
    /* خانق زمني بدل requestAnimationFrame — يعمل حتى في التبويبات الخلفية */
    function onScroll() {
      if (ticking) return;
      ticking = true;
      setTimeout(sync, 80);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    sync();
  }

  /* ---------- FAQ ---------- */
  function renderFaq() {
    $('#faq-list').innerHTML = on(CFG.faq).map(function (f, i) {
      return '<div class="faq__item" data-reveal="soft" style="--d:' + (i * 45) + 'ms">' +
        '<button type="button" class="faq__q" aria-expanded="false" aria-controls="a-' + i + '">' +
        '<span>' + esc(f.q) + '</span>' + icon('plus') + '</button>' +
        '<div class="faq__a" id="a-' + i + '"><p>' + esc(f.a) + '</p></div></div>';
    }).join('');

    $$('.faq__q').forEach(function (b) {
      b.addEventListener('click', function () {
        var item = b.closest('.faq__item'), panel = b.nextElementSibling;
        var open = item.classList.toggle('is-open');
        b.setAttribute('aria-expanded', open ? 'true' : 'false');
        panel.style.maxHeight = open ? panel.scrollHeight + 'px' : '0';
      });
    });
  }

  /* ---------- حكاية حنين ---------- */
  function renderStory() {
    var st = CFG.story || {};
    if (!st.enabled || !(st.lines || []).length) { $('#story').hidden = true; return; }
    $('#story').hidden = false;
    txt('#story-label', st.label);
    $('#story-lines').innerHTML = st.lines.map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('');
    txt('#story-closing', st.closing);
    if (!st.closing) $('#story-closing').hidden = true;
  }

  /* ---------- الفوتر ---------- */
  function renderFooter() {
    txt('#footer-desc', CFG.store.description);
    txt('#footer-response', (CFG.contact || {}).responseTime);

    $('#footer-links').innerHTML = ((CFG.footer || {}).links || []).map(function (l) {
      return '<a href="' + esc(l.href) + '">' + esc(l.label) + '</a>';
    }).join('');

    /* قنوات التواصل: واتساب دائمًا، وبقية القنوات عند التفعيل ووجود قيمة */
    var soc = CFG.social || {}, rows = [];
    var wa = String((CFG.contact || {}).whatsapp || '').replace(/\D/g, '');
    if (wa) {
      rows.push('<a href="' + esc(waLink((CFG.contact || {}).greeting || '')) + '" target="_blank" rel="noopener">' +
        '<svg aria-hidden="true"><use href="#i-wa"/></svg>واتساب</a>');
    }
    var map = {
      phone: { href: function (v) { return 'tel:' + v.replace(/[^\d+]/g, ''); } },
      email: { href: function (v) { return 'mailto:' + v; } },
      instagram: { href: link }, tiktok: { href: link }, x: { href: link }
    };
    function link(v) { return /^https?:/i.test(v) ? v : 'https://' + v.replace(/^\/+/, ''); }

    Object.keys(map).forEach(function (k) {
      var c = soc[k];
      if (!c || !c.enabled || !String(c.value || '').trim()) return;
      rows.push('<a href="' + esc(map[k].href(String(c.value).trim())) + '"' +
        (k === 'phone' || k === 'email' ? '' : ' target="_blank" rel="noopener"') + '>' +
        esc(c.label || k) + '</a>');
    });
    if (rows.length) {
      $('#footer-contact').innerHTML = rows.join('');
      $('#footer-contact-col').hidden = false;
    }

    var lg = CFG.legal || {};
    txt('#lnk-privacy', (lg.privacy || {}).title || 'سياسة الخصوصية');
    txt('#lnk-terms', (lg.terms || {}).title || 'الشروط والأحكام');

    renderTrust();

    txt('#footer-privacy', (CFG.messages || {}).privacyNote);
    txt('#footer-rights', '© ' + new Date().getFullYear() + ' ' + CFG.store.name + ' — ' + ((CFG.footer || {}).rights || ''));
  }

  /* بيانات النشاط — تُعرض فقط عند وجود قيمة فعلية، بلا إيحاء باعتماد غير قائم */
  function renderTrust() {
    var t = CFG.trust || {};
    if (!t.enabled) return;
    var rows = [
      ['رقم وثيقة العمل الحر', t.freelanceDoc],
      ['السجل التجاري', t.crNumber],
      ['الرقم الضريبي', t.vatNumber]
    ].filter(function (r) { return String(r[1] || '').trim(); });

    var badges = (t.items || []).filter(function (i) { return i && i.label; });
    if (!rows.length && !badges.length) return;

    $('#footer-trust').hidden = false;
    txt('#trust-title', t.title || 'بيانات النشاط');
    var html = rows.length
      ? '<dl>' + rows.map(function (r) {
          return '<div class="trow"><dt>' + esc(r[0]) + ':</dt><dd class="num">' + esc(r[1]) + '</dd></div>';
        }).join('') + '</dl>' : '';
    if (badges.length) {
      html += '<div class="footer__badges">' + badges.map(function (b) {
        var inner = b.image
          ? '<img src="' + esc(b.image) + '" alt="' + esc(b.label) + '" loading="lazy">'
          : '<span class="trow">' + esc(b.label) + '</span>';
        return b.url ? '<a href="' + esc(b.url) + '" target="_blank" rel="noopener">' + inner + '</a>' : inner;
      }).join('') + '</div>';
    }
    $('#trust-body').innerHTML = html;
  }

  /* ---------- النافذة النظامية ---------- */
  function initLegalModal() {
    var dlg = $('#legal-modal');
    if (!dlg || !dlg.showModal) { $$('.linkish').forEach(function (b) { b.hidden = true; }); return; }
    $$('[data-legal]').forEach(function (b) {
      b.addEventListener('click', function () {
        var d = (CFG.legal || {})[b.dataset.legal] || {};
        txt('#modal-title', d.title);
        $('#modal-body').innerHTML = String(d.body || '').split(/\n{2,}/)
          .map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
        dlg.showModal();
      });
    });
    $('#modal-close').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  }

  /* ---------- زر واتساب العائم ---------- */
  function initWaFab() {
    var c = CFG.contact || {}, fab = $('#wa-fab');
    if (!fab || c.floatingEnabled === false) return;
    fab.hidden = false;
    txt('#wa-fab-label', c.floatingLabel || 'تواصل معنا');

    /* لا ينافس زر واتساب الخاص بالطلب */
    var success = $('#success');
    new MutationObserver(function () {
      fab.classList.toggle('is-hidden', success.classList.contains('is-shown'));
    }).observe(success, { attributes: true, attributeFilter: ['class'] });

    /* لا يظهر من خلف طبقة النوافذ */
    function syncDialogs() {
      var open = $$('dialog').some(function (d) { return d.open; });
      fab.classList.toggle('is-behind', open);
    }
    $$('dialog').forEach(function (d) {
      new MutationObserver(syncDialogs).observe(d, { attributes: true, attributeFilter: ['open'] });
    });

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var nudged = false;
    window.addEventListener('scroll', function () {
      if (nudged || window.scrollY < 600) return;
      nudged = true;
      fab.classList.add('is-nudging');
      setTimeout(function () { fab.classList.remove('is-nudging'); }, 25000);
    }, { passive: true });
  }

  /* ---------- مسودة الطلب ---------- */
  var TEXT_FIELDS = ['f-subject', 'f-topic', 'f-content', 'f-reference', 'f-notes',
                     'f-name', 'f-phone', 'f-other-style-text'];
  var draftTimer = null;

  function saveDraft() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(function () {
      try {
        var d = { at: Date.now(), state: {
          product: state.product, size: state.size, level: state.level,
          styles: state.styles, otherStyle: state.otherStyle,
          audiences: state.audiences, extras: state.extras
        }, text: {} };
        TEXT_FIELDS.forEach(function (id) { var e = $('#' + id); if (e) d.text[id] = e.value; });
        var any = d.state.product || d.state.styles.length || Object.keys(d.text)
          .some(function (k) { return d.text[k]; });
        if (any) localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
      } catch (e) { /* تجاهل */ }
    }, 400);
  }

  function restoreDraft() {
    var raw;
    try { raw = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch (e) { return; }
    if (!raw || !raw.state) return;
    if (Date.now() - (raw.at || 0) > 7 * 24 * 3600 * 1000) { clearDraft(); return; }

    var s = raw.state;
    state.product = s.product; state.size = s.size; state.level = s.level;
    state.styles = s.styles || []; state.otherStyle = !!s.otherStyle;
    state.audiences = s.audiences || []; state.extras = s.extras || {};

    check('product', s.product); check('size', s.size); check('level', s.level);
    (state.styles).forEach(function (v) { check('style', v); });
    (state.audiences).forEach(function (v) { check('audience', v); });
    Object.keys(state.extras).forEach(function (k) {
      var e = $('#addons-list input[data-addon="' + k + '"]');
      if (e) e.checked = !!state.extras[k];
    });
    TEXT_FIELDS.forEach(function (id) {
      var e = $('#' + id); if (e && raw.text && raw.text[id] != null) e.value = raw.text[id];
    });
    if (state.otherStyle) {
      $('#f-other-style').checked = true;
      $('#other-style-wrap').hidden = false;
    }
    $('#draft-note').hidden = false;
    calcTotal();

    function check(name, val) {
      if (!val) return;
      var e = $('#order-form input[name="' + name + '"][value="' + val + '"]');
      if (e) e.checked = true;
    }
  }

  function clearDraft() {
    /* إلغاء أي حفظ مؤجَّل، وإلا أعاد كتابة المسودة بعد الإرسال */
    clearTimeout(draftTimer);
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
    $('#draft-note').hidden = true;
  }

  /* ---------- PWA ---------- */
  function initServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol === 'file:') return;
    function reg() {
      navigator.serviceWorker.register('sw.js').catch(function (e) {
        console.warn('[حنين] لم يُسجَّل service worker:', e);
      });
    }
    /* build() يعمل بعد جلب config، وقد يكون حدث load انتهى قبله */
    if (document.readyState === 'complete') reg();
    else window.addEventListener('load', reg);
  }
})();
