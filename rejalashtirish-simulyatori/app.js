/*
 * app.js — sahifa (interfeys) mantig'i.
 * Hisob-kitobning o'zi engine.js da; bu yerda faqat kiritilgan ma'lumotni olib,
 * Engine.run() ga beramiz va natijani ekranga chizamiz.
 */
(function () {
  'use strict';

  var COLORS = ['#8fb4ff', '#ffbf8a', '#8fd9a0', '#f2d56b', '#c4a8f0', '#f19ab0', '#7fd6d6', '#c3c98d', '#e6a8d0', '#b5c0d0'];
  var PRESETS = {
    v23: [[0, 14], [5, 8], [4, 2], [3, 3], [1, 9]],
    v25: [[0, 13], [3, 7], [5, 3], [6, 2], [1, 9]]
  };
  var ALGO_NAMES = {
    'priority-p': 'Priority (preemptive)',
    'priority-np': 'Priority (non-preemptive)',
    'rr': 'Round Robin'
  };
  var MAX_PROCS = 10;

  var state = {
    procs: [],
    algo: 'priority-p',
    mode: 'remaining',
    orderNo: 23,
    tq: 4,
    step: 0,
    speed: 1,
    res: null,
    timer: null
  };

  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }
  function colorOf(pid) {
    var n = parseInt(String(pid).replace(/\D/g, ''), 10) || 1;
    return COLORS[(n - 1) % COLORS.length];
  }
  function num(x) {
    // 7.8 -> "7,8" (o'zbekcha yozuv)
    return String(Math.round(x * 100) / 100).replace('.', ',');
  }

  /* ---------- Saqlash (brauzer xotirasi, xato bo'lsa e'tibor bermaymiz) ---------- */
  function save() {
    try {
      localStorage.setItem('rejalashtirish', JSON.stringify({
        procs: state.procs, algo: state.algo, mode: state.mode, orderNo: state.orderNo, tq: state.tq
      }));
    } catch (e) { /* xotira yopiq bo'lishi mumkin */ }
  }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem('rejalashtirish'));
      if (s && Array.isArray(s.procs) && s.procs.length) {
        state.procs = s.procs; state.algo = s.algo; state.mode = s.mode;
        state.orderNo = s.orderNo; state.tq = s.tq;
        return true;
      }
    } catch (e) { /* hech narsa */ }
    return false;
  }

  /* ---------- Jadvalni to'ldirish ---------- */
  function setPreset(name) {
    var src;
    if (name === 'rand') {
      var n = 4 + Math.floor(Math.random() * 3);
      src = [];
      for (var i = 0; i < n; i++) src.push([Math.floor(Math.random() * 8), 1 + Math.floor(Math.random() * 12)]);
    } else {
      src = PRESETS[name];
    }
    state.procs = src.map(function (r, i) {
      return { pid: 'P' + (i + 1), at: r[0], bt: r[1], pr: r[1] };
    });
  }

  function renumber() {
    state.procs.forEach(function (p, i) { p.pid = 'P' + (i + 1); });
  }

  function isCustom() { return state.algo !== 'rr' && state.mode === 'custom'; }

  function renderInputs() {
    var custom = isCustom();
    $('prHead').hidden = !custom;
    var body = $('procBody');
    body.textContent = '';
    state.procs.forEach(function (p, i) {
      var tr = document.createElement('tr');
      var tdName = el('td', 'pid');
      var sw = el('span', 'swatch');
      sw.style.background = colorOf(p.pid);
      tdName.appendChild(sw);
      tdName.appendChild(document.createTextNode(p.pid));
      tr.appendChild(tdName);

      ['at', 'bt'].concat(custom ? ['pr'] : []).forEach(function (f) {
        var td = document.createElement('td');
        var inp = document.createElement('input');
        inp.type = 'number';
        inp.step = '1';
        inp.min = f === 'bt' ? '1' : (f === 'at' ? '0' : '');
        inp.value = p[f];
        inp.setAttribute('aria-label', p.pid + ' ' + f.toUpperCase());
        inp.addEventListener('input', function () { p[f] = inp.value; onDataChange(); });
        td.appendChild(inp);
        tr.appendChild(td);
      });

      var tdDel = document.createElement('td');
      var del = el('button', 'del', '✕');
      del.type = 'button';
      del.title = 'O\'chirish';
      del.disabled = state.procs.length <= 1;
      del.addEventListener('click', function () {
        state.procs.splice(i, 1);
        renumber();
        renderInputs();
        onDataChange();
      });
      tdDel.appendChild(del);
      tr.appendChild(tdDel);
      body.appendChild(tr);
    });
    $('addRow').disabled = state.procs.length >= MAX_PROCS;
  }

  function renderOptions() {
    $('algo').value = state.algo;
    $('pmode').value = state.mode;
    $('orderNo').value = state.orderNo;
    $('tq').value = state.tq;
    $('priorityOpts').hidden = state.algo === 'rr';
    $('rrOpts').hidden = state.algo !== 'rr';
    $('pmodeHint').textContent = state.mode === 'remaining'
      ? 'Jadvalda priority bo\'lmasa: qolgan vaqti eng kichik jarayon ustun turadi (SRTF). Non-preemptive variantda bu eng qisqa ishni birinchi bajarish (SJF) bo\'ladi.'
      : 'Priority ustuniga o\'zingiz son yozasiz: kichik son — yuqori ustuvorlik.';
  }

  /* ---------- Tekshiruv ---------- */
  function validate() {
    if (!state.procs.length) return 'Kamida bitta jarayon kerak.';
    var intRe = /^-?\d+$/;
    for (var i = 0; i < state.procs.length; i++) {
      var p = state.procs[i];
      if (!intRe.test(String(p.at)) || Number(p.at) < 0) return p.pid + ': AT butun va 0 dan kichik bo\'lmagan son bo\'lishi kerak.';
      if (!intRe.test(String(p.bt)) || Number(p.bt) < 1) return p.pid + ': BT butun va kamida 1 bo\'lishi kerak.';
      if (isCustom() && !intRe.test(String(p.pr))) return p.pid + ': priority butun son bo\'lishi kerak.';
    }
    if (state.algo === 'rr' && (!intRe.test(String(state.tq)) || Number(state.tq) < 1)) {
      return 'Vaqt kvanti (TQ) butun va kamida 1 bo\'lishi kerak.';
    }
    return null;
  }

  /* ---------- Hisoblash va chizish ---------- */
  function opts() { return { mode: state.mode, tq: Number(state.tq) }; }

  function onDataChange() {
    stop();
    save();
    var err = validate();
    var box = $('error');
    if (err) {
      box.textContent = err;
      box.hidden = false;
      $('simCard').hidden = true;
      $('cmpBody').textContent = '';
      state.res = null;
      return;
    }
    box.hidden = true;
    $('simCard').hidden = false;
    state.res = Engine.run(state.algo, state.procs, opts());
    state.step = 0;
    render();
    renderCompare();
  }

  function render() {
    var res = state.res;
    if (!res) return;
    var segs = res.segments;
    var s = state.step;
    var total = segs.length;

    $('stepNo').textContent = 'Qadam ' + s + ' / ' + total;
    $('bFirst').disabled = $('bPrev').disabled = s === 0;
    $('bNext').disabled = $('bLast').disabled = s === total;
    $('bPlay').textContent = state.timer ? '⏸ To\'xtatish' : '⏯ Avto';

    renderGantt(res, s);
    renderNow(res, s);
    renderState(res, s);
  }

  function renderGantt(res, s) {
    var g = $('gantt');
    g.textContent = '';
    g.style.setProperty('--units', res.total);
    res.segments.forEach(function (seg, i) {
      var d = el('div', 'seg');
      d.style.left = (seg.start / res.total * 100) + '%';
      d.style.width = ((seg.end - seg.start) / res.total * 100) + '%';
      if (seg.pid === null) {
        d.classList.add('idle');
        d.textContent = 'idle';
      } else {
        d.style.background = colorOf(seg.pid);
        d.textContent = seg.pid;
      }
      if (i >= s) d.classList.add('pending');
      if (i === s - 1) d.classList.add('current');
      d.title = (seg.pid || 'idle') + ': ' + seg.start + ' → ' + seg.end;
      g.appendChild(d);
    });

    var r = $('ruler');
    r.textContent = '';
    var marks = [0];
    for (var i = 0; i < s; i++) marks.push(res.segments[i].end);
    var lastPct = -100;
    // raqamlar orasida kamida ~26 piksel bo'lsin (telefonda ham o'qilsin)
    var minGap = 26 / (g.clientWidth || 600) * 100;
    marks.forEach(function (m, idx) {
      var pct = m / res.total * 100;
      var isLast = idx === marks.length - 1;
      if (idx > 0 && pct - lastPct < minGap && !isLast) return;
      if (idx > 0 && pct - lastPct < minGap && isLast) {
        // oxirgi belgi yaqin bo'lsa — oldingisini olib tashlaymiz
        if (r.lastChild) r.removeChild(r.lastChild);
      }
      var sp = el('span', null, String(m));
      sp.style.left = pct + '%';
      if (pct > 97) sp.style.transform = 'translateX(-100%)';
      r.appendChild(sp);
      lastPct = pct;
    });
  }

  function chip(pid, v, label) {
    var c = el('span', 'qchip');
    c.style.background = colorOf(pid);
    c.appendChild(document.createTextNode(pid));
    if (v !== undefined) c.appendChild(el('small', null, label + ' ' + v));
    return c;
  }

  function renderNow(res, s) {
    var q = $('queue');
    q.textContent = '';
    var ex = $('explain');
    ex.textContent = '';
    $('queueTitle').textContent = res.queueLabel;

    if (s === 0) {
      $('nowTime').textContent = 'Boshlanish: t = 0';
      q.appendChild(el('span', 'qempty', 'Simulyatsiya hali boshlanmadi.'));
      ex.appendChild(el('li', null, 'Boshlash uchun «Keyingi ▶» tugmasini bosing (yoki klaviaturada → ).'));
      ex.appendChild(el('li', null, 'Natijani darhol ko\'rish uchun «⏭ Oxiriga».'));
      return;
    }

    var seg = res.segments[s - 1];
    $('nowTime').textContent = 't = ' + seg.start + ' → ' + seg.end + (seg.pid ? '   ·   ishladi: ' + seg.pid : '   ·   protsessor bo\'sh');

    if (seg.queueAfter.length) {
      seg.queueAfter.forEach(function (it, i) {
        if (i > 0 && state.algo === 'rr') q.appendChild(el('span', 'qarrow', '→'));
        q.appendChild(chip(it.pid, it.v, state.algo === 'rr' ? 'qolgan' : (state.algo !== 'rr' && state.mode === 'custom' ? 'pr' : 'qolgan')));
      });
    } else {
      q.appendChild(el('span', 'qempty', 'Navbat bo\'sh.'));
    }

    seg.lines.forEach(function (line) {
      var li = el('li', null, line);
      if (/tugadi \(CT/.test(line)) li.className = 'fin';
      else if (/to'xtatildi/.test(line)) li.className = 'stop';
      ex.appendChild(li);
    });
  }

  function renderState(res, s) {
    var custom = isCustom();
    var seg = s > 0 ? res.segments[s - 1] : null;
    var t = seg ? seg.end : 0;

    var head = $('stateHead');
    head.textContent = '';
    var hr = document.createElement('tr');
    ['Jarayon', 'AT', 'BT'].concat(custom ? ['Priority'] : []).concat(['Qolgan', 'Holat', 'CT', 'TAT', 'WT']).forEach(function (h) {
      hr.appendChild(el('th', null, h));
    });
    head.appendChild(hr);

    var body = $('stateBody');
    body.textContent = '';
    var allDone = s === res.segments.length;

    res.rows.forEach(function (r) {
      var rem = seg ? seg.remAfter[r.pid] : r.bt;
      var done = rem === 0;
      var status, cls;
      if (done) { status = 'Tugadi'; cls = 'st-done'; }
      else if (seg && seg.pid === r.pid) { status = 'Hozir ishladi'; cls = 'st-ran'; }
      else if (r.at <= t) { status = 'Navbatda'; cls = 'st-wait'; }
      else { status = 'Hali kelmagan'; cls = 'st-future'; }

      var tr = document.createElement('tr');
      var tdName = el('td');
      var sw = el('span', 'swatch');
      sw.style.background = colorOf(r.pid);
      tdName.appendChild(sw);
      tdName.appendChild(document.createTextNode(r.pid));
      tr.appendChild(tdName);
      tr.appendChild(el('td', null, r.at));
      tr.appendChild(el('td', null, r.bt));
      if (custom) tr.appendChild(el('td', null, r.pr));
      tr.appendChild(el('td', null, rem));
      tr.appendChild(el('td', cls, status));
      tr.appendChild(el('td', null, done ? r.ct : '—'));
      tr.appendChild(el('td', null, done ? r.tat : '—'));
      tr.appendChild(el('td', null, done ? r.wt : '—'));
      body.appendChild(tr);
    });

    var foot = $('stateFoot');
    foot.textContent = '';
    if (allDone) {
      var fr = document.createElement('tr');
      var span = 4 + (custom ? 1 : 0) + 1; // nom + AT + BT (+PR) + Qolgan + Holat -> jami ustun
      fr.appendChild(el('td', null, 'Jami'));
      for (var i = 1; i < span + 0; i++) fr.appendChild(el('td', null, ''));
      fr.appendChild(el('td', null, ''));
      fr.appendChild(el('td', null, res.sumTAT));
      fr.appendChild(el('td', null, res.sumWT));
      foot.appendChild(fr);
    }

    var out = $('result');
    if (allDone) {
      out.hidden = false;
      out.textContent = '';
      var wts = res.rows.map(function (r) { return r.wt; }).join(' + ');
      var tats = res.rows.map(function (r) { return r.tat; }).join(' + ');
      var n = res.rows.length;
      out.appendChild(el('p', null, 'WT = TAT − BT, TAT = CT − AT formulalari bo\'yicha:'));
      out.appendChild(el('p', 'big', 'AWT = (' + wts + ') / ' + n + ' = ' + res.sumWT + ' / ' + n + ' = ' + num(res.awt)));
      out.appendChild(el('p', null, 'ATAT = (' + tats + ') / ' + n + ' = ' + res.sumTAT + ' / ' + n + ' = ' + num(res.atat)));
    } else {
      out.hidden = true;
    }
    $('exportBox').hidden = !allDone;
  }

  function renderCompare() {
    var body = $('cmpBody');
    body.textContent = '';
    var rows = ['priority-p', 'priority-np', 'rr'].map(function (a) {
      return { algo: a, res: Engine.run(a, state.procs, opts()) };
    });
    var best = Math.min.apply(null, rows.map(function (r) { return r.res.awt; }));
    rows.forEach(function (r) {
      var tr = document.createElement('tr');
      var label = ALGO_NAMES[r.algo];
      if (r.algo === 'rr') label += ' (TQ = ' + state.tq + ')';
      else label += state.mode === 'custom' ? ' — priority ustuni' : ' — qolgan vaqt';
      tr.appendChild(el('td', null, label));
      tr.appendChild(el('td', null, num(r.res.awt)));
      tr.appendChild(el('td', null, num(r.res.atat)));
      tr.appendChild(el('td', null, r.res.switches));
      tr.appendChild(el('td', null, r.res.total));
      if (r.res.awt === best) tr.className = 'best';
      body.appendChild(tr);
    });
  }

  /* ---------- Boshqaruv ---------- */
  function go(n) {
    if (!state.res) return;
    state.step = Math.max(0, Math.min(state.res.segments.length, n));
    render();
  }
  function stop() {
    if (state.timer) { clearInterval(state.timer); state.timer = null; }
  }
  function play() {
    if (!state.res) return;
    if (state.timer) { stop(); render(); return; }
    if (state.step >= state.res.segments.length) state.step = 0;
    state.timer = setInterval(function () {
      if (state.step >= state.res.segments.length) { stop(); render(); return; }
      state.step += 1;
      if (state.step >= state.res.segments.length) stop();
      render();
    }, 1400 / state.speed);
    render();
  }

  /* ---------- Excel'ga yuklash ---------- */
  function initExport() {
    var dlg = $('exportDlg');
    var boxes = function () { return Array.prototype.slice.call(dlg.querySelectorAll('input[name=algo]')); };
    $('bExport').addEventListener('click', function () {
      boxes().forEach(function (b) { b.checked = b.value === state.algo; });
      $('exportErr').hidden = true;
      $('rrOptNote').textContent = 'vaqt kvanti TQ = ' + state.tq;
      if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    });
    $('selAll').addEventListener('click', function () { boxes().forEach(function (b) { b.checked = true; }); $('exportErr').hidden = true; });
    $('exportCancel').addEventListener('click', function () { dlg.close(); });
    $('exportGo').addEventListener('click', function () {
      var chosen = boxes().filter(function (b) { return b.checked; }).map(function (b) { return b.value; });
      if (!chosen.length) { $('exportErr').hidden = false; return; }
      var btn = $('exportGo');
      btn.disabled = true;
      Exporter.download(chosen, { procs: state.procs, mode: state.mode, tq: state.tq, orderNo: state.orderNo })
        .then(function () { dlg.close(); })
        .catch(function (e) { $('exportErr').textContent = 'Xatolik: ' + e.message; $('exportErr').hidden = false; })
        .then(function () { btn.disabled = false; });
    });
  }

  function init() {
    if (!load()) setPreset('v23');
    renderOptions();
    renderInputs();

    $('algo').addEventListener('change', function () {
      state.algo = this.value;
      renderOptions();
      renderInputs();
      onDataChange();
    });
    $('pmode').addEventListener('change', function () {
      state.mode = this.value;
      renderOptions();
      renderInputs();
      onDataChange();
    });
    $('orderNo').addEventListener('input', function () {
      state.orderNo = this.value;
      var n = parseInt(this.value, 10);
      if (!isNaN(n)) {
        state.tq = (n % 3) + 2;
        $('tq').value = state.tq;
      }
      onDataChange();
    });
    $('tq').addEventListener('input', function () {
      state.tq = this.value;
      onDataChange();
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-preset]'), function (b) {
      b.addEventListener('click', function () {
        setPreset(b.getAttribute('data-preset'));
        renderInputs();
        onDataChange();
      });
    });
    $('addRow').addEventListener('click', function () {
      if (state.procs.length >= MAX_PROCS) return;
      state.procs.push({ pid: 'P' + (state.procs.length + 1), at: 0, bt: 5, pr: 5 });
      renderInputs();
      onDataChange();
    });

    $('bFirst').addEventListener('click', function () { stop(); go(0); });
    $('bPrev').addEventListener('click', function () { stop(); go(state.step - 1); });
    $('bNext').addEventListener('click', function () { stop(); go(state.step + 1); });
    $('bLast').addEventListener('click', function () { stop(); go(state.res ? state.res.segments.length : 0); });
    $('bPlay').addEventListener('click', play);
    $('speed').addEventListener('change', function () {
      state.speed = Number(this.value);
      if (state.timer) { stop(); play(); }
    });

    initExport();

    document.addEventListener('keydown', function (e) {
      var tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') { e.preventDefault(); stop(); go(state.step + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); stop(); go(state.step - 1); }
      else if (e.key === ' ') { e.preventDefault(); play(); }
    });

    onDataChange();
  }

  init();
})();
