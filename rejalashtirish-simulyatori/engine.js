/*
 * engine.js — rejalashtirish algoritmlari yadrosi.
 * Bu faylda DOM (sahifa) bilan hech qanday ish yo'q: faqat hisob-kitob.
 * Natija — "segmentlar" ro'yxati. Har bir segment = Gantt diagrammasidagi bitta katak
 * va simulyatordagi bitta qadam.
 *
 * Segment maydonlari:
 *   pid        — jarayon nomi (null bo'lsa protsessor bo'sh = idle)
 *   start, end — boshlanish va tugash vaqti
 *   finished   — shu segmentda tugagan jarayon nomi (yoki null)
 *   lines      — shu qadamni tushuntiruvchi gaplar (o'zbekcha)
 *   remAfter   — segmentdan keyin har bir jarayonning qolgan vaqti
 *   queueAfter — segmentdan keyingi tayyor jarayonlar [{pid, v}]
 */
(function (root) {
  'use strict';

  function prep(procs) {
    return procs.map(function (p, i) {
      return { idx: i, pid: p.pid, at: Number(p.at), bt: Number(p.bt), pr: Number(p.pr) };
    });
  }

  function names(list) {
    return list.map(function (p) { return p.pid; }).join(', ');
  }

  /* ---------- 1) Priority Scheduling (preemptive va non-preemptive) ---------- */
  function simPriority(procs, opts) {
    var P = prep(procs);
    var n = P.length;
    var rem = P.map(function (p) { return p.bt; });
    var byPid = {};
    P.forEach(function (p) { byPid[p.pid] = p; });

    var useRemaining = opts.mode !== 'custom';
    var keyOf = function (p) { return useRemaining ? rem[p.idx] : p.pr; };
    var keyName = useRemaining ? 'qolgan vaqt' : 'priority';

    var segs = [];
    var t = 0;
    var done = 0;
    var cur = null; // non-preemptive: hozir ishlayotgan jarayon indeksi

    while (done < n) {
      var ready = P.filter(function (p) { return p.at <= t && rem[p.idx] > 0; });

      if (!ready.length) {
        // Hech kim kelmagan: protsessor bo'sh, keyingi kelishga sakraymiz
        var nextAt = Math.min.apply(null, P.filter(function (p) { return rem[p.idx] > 0; })
          .map(function (p) { return p.at; }));
        segs.push({
          pid: null, start: t, end: nextAt, finished: null,
          lines: ['t = ' + t + ' da tayyor jarayon yo\'q — protsessor bo\'sh (idle). Keyingi jarayon t = ' + nextAt + ' da keladi.']
        });
        t = nextAt;
        cur = null;
        continue;
      }

      var chosen;
      var tied = [];
      if (!opts.preemptive && cur !== null && rem[cur] > 0) {
        chosen = P[cur]; // non-preemptive: boshlagan jarayon tugamaguncha ishlaydi
      } else {
        var sorted = ready.slice().sort(function (a, b) {
          return keyOf(a) - keyOf(b) || a.at - b.at || a.idx - b.idx;
        });
        chosen = sorted[0];
        tied = sorted.filter(function (p) { return keyOf(p) === keyOf(chosen); });
      }

      var last = segs[segs.length - 1];
      if (last && last.pid === chosen.pid && last.end === t) {
        // Shu jarayon davom etyapti. Shu lahzada kelganlar bo'lsa — nega to'xtatmasligini yozamiz.
        P.filter(function (p) { return p.at === t; }).forEach(function (p) {
          if (p.pid === chosen.pid) return;
          if (!opts.preemptive) {
            last.lines.push('t = ' + t + ' da ' + p.pid + ' keldi, lekin non-preemptive usulda ' +
              chosen.pid + ' tugamaguncha kutadi.');
          } else if (keyOf(p) === keyOf(chosen)) {
            last.lines.push('t = ' + t + ' da ' + p.pid + ' keldi (' + keyName + ' ' + keyOf(p) + '). ' +
              chosen.pid + ' bilan teng, lekin ' + chosen.pid + ' oldin kelgan — ' + chosen.pid + ' davom etadi.');
          } else {
            last.lines.push('t = ' + t + ' da ' + p.pid + ' keldi (' + keyName + ' ' + keyOf(p) + '), lekin ' +
              chosen.pid + ' ning ' + keyName + 'i (' + keyOf(chosen) + ') dan kichik emas — to\'xtata olmaydi, ' +
              chosen.pid + ' davom etadi.');
          }
        });
        last.end = t + 1;
      } else {
        var lines = [];
        var arrivedNow = P.filter(function (p) { return p.at === t; });
        if (arrivedNow.length) lines.push('t = ' + t + ' da ' + names(arrivedNow) + ' keldi.');
        lines.push('Tayyor jarayonlar (' + keyName + '): ' +
          ready.map(function (p) { return p.pid + '(' + keyOf(p) + ')'; }).join(', ') + '.');
        if (ready.length === 1) {
          lines.push(chosen.pid + ' yagona tayyor jarayon — protsessor unga beriladi.');
        } else if (tied.length > 1) {
          lines.push(tied.map(function (p) { return p.pid; }).join(' va ') + ' ning ' + keyName +
            'i teng (' + keyOf(chosen) + '). Teng bo\'lsa, oldin kelgani tanlanadi: ' +
            chosen.pid + ' (AT = ' + chosen.at + ').');
        } else {
          lines.push('Eng kichik ' + keyName + ': ' + chosen.pid + ' (' + keyOf(chosen) + ') — tanlandi.');
        }
        if (last && last.pid !== null && last.end === t && last.pid !== chosen.pid && last.finished === null) {
          lines.push(last.pid + ' to\'xtatildi (preemption): unga ' + rem[byPid[last.pid].idx] +
            ' birlik qoldi, tayyor navbatga qaytadi.');
        }
        segs.push({ pid: chosen.pid, start: t, end: t + 1, finished: null, lines: lines });
      }

      var seg = segs[segs.length - 1];
      rem[chosen.idx] -= 1;
      t += 1;
      if (rem[chosen.idx] === 0) {
        seg.finished = chosen.pid;
        seg.lines.push(chosen.pid + ' tugadi (CT = ' + t + ').');
        done += 1;
        cur = null;
      } else {
        cur = chosen.idx;
      }
    }

    // Har bir segmentdan keyingi holatni tiklaymiz
    var rr = P.map(function (p) { return p.bt; });
    segs.forEach(function (s) {
      if (s.pid !== null) rr[byPid[s.pid].idx] -= (s.end - s.start);
      s.remAfter = {};
      P.forEach(function (p) { s.remAfter[p.pid] = rr[p.idx]; });
      var key = function (p) { return useRemaining ? rr[p.idx] : p.pr; };
      s.queueAfter = P.filter(function (p) { return p.at <= s.end && rr[p.idx] > 0; })
        .sort(function (a, b) { return key(a) - key(b) || a.at - b.at || a.idx - b.idx; })
        .map(function (p) { return { pid: p.pid, v: key(p) }; });
    });

    return { segments: segs, queueLabel: 'Tayyor jarayonlar (' + keyName + ' bo\'yicha tartiblangan)', valueLabel: keyName };
  }

  /* ---------- 2) Round Robin ---------- */
  function simRR(procs, tq) {
    var P = prep(procs);
    var n = P.length;
    var rem = P.map(function (p) { return p.bt; });
    var order = P.slice().sort(function (a, b) { return a.at - b.at || a.idx - b.idx; });
    var k = 0;
    var t = 0;
    var done = 0;
    var q = [];
    var segs = [];

    function arriveUpTo(tm) {
      var got = [];
      while (k < n && order[k].at <= tm) {
        q.push(order[k].idx);
        got.push(order[k].pid);
        k += 1;
      }
      return got;
    }
    function snapshotRem() {
      var o = {};
      P.forEach(function (p) { o[p.pid] = rem[p.idx]; });
      return o;
    }
    function qView() {
      return q.map(function (i) { return { pid: P[i].pid, v: rem[i] }; });
    }

    var initial = arriveUpTo(0);

    while (done < n) {
      if (!q.length) {
        var nt = order[k].at;
        segs.push({
          pid: null, start: t, end: nt, finished: null,
          lines: ['t = ' + t + ' da navbat bo\'sh — protsessor bo\'sh (idle). Keyingi jarayon t = ' + nt + ' da keladi.'],
          remAfter: snapshotRem(), queueAfter: []
        });
        t = nt;
        initial = arriveUpTo(t);
        continue;
      }

      var before = q.map(function (i) { return P[i].pid; });
      var i = q.shift();
      var run = Math.min(tq, rem[i]);
      var start = t;
      var remBefore = rem[i];
      t += run;
      rem[i] -= run;
      var got = arriveUpTo(t); // [start, t] ichida kelganlar — to'xtatilgan jarayondan OLDIN navbatga turadi

      var lines = [];
      if (initial.length) {
        lines.push('t = ' + start + ' da ' + initial.join(', ') + ' keldi va navbatga turdi.');
      }
      initial = [];
      lines.push('Navbat: ' + before.join(' → ') + '. Boshidagi ' + P[i].pid + ' olindi (qolgan vaqt ' + remBefore + ').');
      if (run < tq) {
        lines.push('Kvant = ' + tq + ', lekin ' + P[i].pid + ' ga ' + run + ' birlik yetadi — kvant to\'lmasdan tugaydi.');
      } else {
        lines.push('Kvant = ' + tq + ': ' + P[i].pid + ' ' + run + ' birlik ishladi (t = ' + start + ' → ' + t + ').');
      }
      if (got.length) {
        lines.push('Shu kvant davomida ' + got.join(', ') + ' keldi → navbatga ' +
          (rem[i] > 0 ? P[i].pid + ' dan OLDIN ' : '') + 'qo\'shildi.');
      }
      var fin = null;
      if (rem[i] > 0) {
        q.push(i);
        lines.push(P[i].pid + ' tugamadi (qolgan ' + rem[i] + ') → navbat oxiriga o\'tdi.');
      } else {
        fin = P[i].pid;
        done += 1;
        lines.push(P[i].pid + ' tugadi (CT = ' + t + ').');
      }
      lines.push('Yangi navbat: ' + (q.length ? q.map(function (j) { return P[j].pid; }).join(' → ') : 'bo\'sh') + '.');

      segs.push({
        pid: P[i].pid, start: start, end: t, finished: fin, lines: lines,
        remAfter: snapshotRem(), queueAfter: qView()
      });
    }

    return { segments: segs, queueLabel: 'Navbat (chapdan o\'ngga: boshi → oxiri)', valueLabel: 'qolgan vaqt' };
  }

  /* ---------- Natijalarni hisoblash ---------- */
  function summarize(procs, sim) {
    var ct = {};
    sim.segments.forEach(function (s) { if (s.finished) ct[s.finished] = s.end; });
    var rows = procs.map(function (p) {
      var at = Number(p.at), bt = Number(p.bt);
      var c = ct[p.pid];
      var tat = c - at;
      return { pid: p.pid, at: at, bt: bt, pr: Number(p.pr), ct: c, tat: tat, wt: tat - bt };
    });
    var n = rows.length;
    var sum = function (key) { return rows.reduce(function (a, r) { return a + r[key]; }, 0); };

    var switches = 0;
    var prev = null;
    sim.segments.forEach(function (s) {
      if (s.pid === null) { prev = null; return; }
      if (prev !== null && prev !== s.pid) switches += 1;
      prev = s.pid;
    });

    var segs = sim.segments;
    return {
      segments: segs,
      total: segs.length ? segs[segs.length - 1].end : 0,
      rows: rows,
      sumWT: sum('wt'), sumTAT: sum('tat'),
      awt: sum('wt') / n, atat: sum('tat') / n,
      switches: switches,
      queueLabel: sim.queueLabel, valueLabel: sim.valueLabel
    };
  }

  /*
   * algo: 'priority-p' | 'priority-np' | 'rr'
   * opts: { mode: 'remaining' | 'custom', tq: son }
   */
  function run(algo, procs, opts) {
    opts = opts || {};
    var sim;
    if (algo === 'rr') sim = simRR(procs, Number(opts.tq));
    else sim = simPriority(procs, { mode: opts.mode, preemptive: algo === 'priority-p' });
    return summarize(procs, sim);
  }

  var api = { run: run };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Engine = api;
})(typeof window !== 'undefined' ? window : this);
