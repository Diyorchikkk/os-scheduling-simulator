/*
 * export.js — natijani Excel (.xlsx) fayliga yuklash.
 * ExcelJS kutubxonasi lib/exceljs.min.js da (internet kerak emas).
 *
 * Har bir tanlangan algoritm uchun alohida varaq (sheet) yaratiladi:
 *   1) boshlang'ich ma'lumot va natija jadvali (TAT va WT — Excel formulalari bilan)
 *   2) Gantt diagrammasi (rangli kataklar)
 *   3) qadamma-qadam tushuntirish
 * Ikki yoki undan ko'p algoritm tanlansa, "Taqqoslash" varag'i ham qo'shiladi.
 */
(function (root) {
  'use strict';

  var NAMES = {
    'priority-p': 'Priority (Preemptive)',
    'priority-np': 'Priority (Non-preemptive)',
    'rr': 'Round Robin'
  };
  var SHEET = {
    'priority-p': 'Priority Preemptive',
    'priority-np': 'Priority Non-preemptive',
    'rr': 'Round Robin'
  };
  var PALETTE = ['8FB4FF', 'FFBF8A', '8FD9A0', 'F2D56B', 'C4A8F0', 'F19ab0', '7FD6D6', 'C3C98D', 'E6A8D0', 'B5C0D0'];

  var NAVY = '1F3A5F';
  var LIGHT = 'E8EEF7';
  var GREY = 'F2F2F2';
  var GREEN = 'DDF3E4';
  var LINE = 'B8C2D0';
  var FONT = 'Calibri';

  function colorOf(pid) {
    var n = parseInt(String(pid).replace(/\D/g, ''), 10) || 1;
    return PALETTE[(n - 1) % PALETTE.length].toUpperCase();
  }
  function fill(hex) { return { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + hex } }; }
  var thin = { style: 'thin', color: { argb: 'FF' + LINE } };
  var BORDER = { top: thin, bottom: thin, left: thin, right: thin };

  function paramText(algo, o) {
    if (algo === 'rr') {
      var s = 'Vaqt kvanti: TQ = ' + o.tq;
      var n = parseInt(o.orderNo, 10);
      if (!isNaN(n) && n % 3 + 2 === Number(o.tq)) s += '  (tartib raqam ' + n + ':  ' + n + ' % 3 + 2 = ' + o.tq + ')';
      return s + '. Navbat boshidagi jarayon ko\'pi bilan TQ birlik ishlaydi, tugamasa navbat oxiriga o\'tadi.';
    }
    var base = algo === 'priority-p'
      ? 'To\'xtatuvchi usul: ustuvorroq jarayon kelsa, joriy jarayon to\'xtatiladi. '
      : 'To\'xtatmaydigan usul: jarayon boshlagach tugamaguncha ishlaydi. ';
    var pr = o.mode === 'custom'
      ? 'Priority ustunidagi kichik son — yuqori ustuvorlik. '
      : 'Jadvalda priority berilmagani uchun priority sifatida qolgan vaqt olindi (kichigi ustun). ';
    return base + pr + 'Teng bo\'lsa — oldin kelgani.';
  }

  /* Bir algoritm uchun varaq yaratadi */
  function buildSheet(wb, algo, res, o) {
    var custom = algo !== 'rr' && o.mode === 'custom';
    var total = res.total;
    var N = Math.max(total + 1, 29);          // fizik ustunlar soni (A — chekka, keyin vaqt birliklari)
    var ws = wb.addWorksheet(SHEET[algo], {
      views: [{ showGridLines: false }],
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 }
    });
    ws.getColumn(1).width = 2;
    for (var c = 2; c <= N + 1; c++) ws.getColumn(c).width = 4.3;
    var lastCol = N + 1;
    var r = 1;

    function merge(row, c1, c2) { if (c2 > c1) ws.mergeCells(row, c1, row, c2); }
    function put(row, c1, c2, value, style) {
      merge(row, c1, c2);
      var cell = ws.getCell(row, c1);
      cell.value = value;
      style = style || {};
      cell.font = Object.assign({ name: FONT, size: 11 }, style.font || {});
      cell.alignment = Object.assign({ vertical: 'middle', horizontal: 'center', wrapText: true }, style.align || {});
      for (var k = c1; k <= c2; k++) {
        var cc = ws.getCell(row, k);
        if (style.fill) cc.fill = fill(style.fill);
        if (style.border !== false) cc.border = BORDER;
      }
      return cell;
    }
    function section(text) {
      r += 1;
      put(r, 2, lastCol, text, {
        font: { bold: true, size: 12, color: { argb: 'FF' + NAVY } },
        align: { horizontal: 'left' }, fill: LIGHT, border: false
      });
      ws.getRow(r).height = 22;
      r += 1;
    }

    /* --- Sarlavha --- */
    put(r, 2, lastCol, NAMES[algo] + ' — natijalar', {
      font: { bold: true, size: 18, color: { argb: 'FFFFFFFF' } },
      align: { horizontal: 'left', indent: 1 }, fill: NAVY, border: false
    });
    ws.getRow(r).height = 34;
    r += 1;
    var pt = paramText(algo, o);
    put(r, 2, lastCol, pt, { font: { italic: true, size: 10, color: { argb: 'FF4A5568' } }, align: { horizontal: 'left', vertical: 'top' }, border: false });
    ws.getRow(r).height = Math.max(18, Math.ceil(pt.length / (lastCol * 1.05)) * 15);
    r += 1;

    /* --- 1. Natija jadvali --- */
    section('1. Boshlang\'ich ma\'lumotlar va natija');
    var spans = custom ? [4, 3, 3, 3, 3, 5, 5] : [4, 3, 3, 3, 5, 5];
    var heads = custom ? ['Jarayon', 'AT', 'BT', 'Priority', 'CT', 'TAT = CT − AT', 'WT = TAT − BT']
                       : ['Jarayon', 'AT', 'BT', 'CT', 'TAT = CT − AT', 'WT = TAT − BT'];
    var starts = [];
    var cur = 2;
    spans.forEach(function (s) { starts.push(cur); cur += s; });
    var tableEnd = cur - 1;

    heads.forEach(function (h, i) {
      put(r, starts[i], starts[i] + spans[i] - 1, h, {
        font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: NAVY
      });
    });
    ws.getRow(r).height = 30;
    r += 1;

    var first = r;
    var iCT = custom ? 4 : 3, iTAT = iCT + 1, iWT = iCT + 2;
    res.rows.forEach(function (row) {
      var vals = custom ? [row.pid, row.at, row.bt, row.pr, row.ct] : [row.pid, row.at, row.bt, row.ct];
      vals.forEach(function (v, i) {
        put(r, starts[i], starts[i] + spans[i] - 1, v, {
          font: i === 0 ? { bold: true } : {}, fill: i === 0 ? colorOf(row.pid) : null
        });
      });
      var atA = ws.getCell(r, starts[1]).address, btA = ws.getCell(r, starts[2]).address;
      var ctA = ws.getCell(r, starts[iCT]).address, tatA = ws.getCell(r, starts[iTAT]).address;
      put(r, starts[iTAT], starts[iTAT] + spans[iTAT] - 1, { formula: ctA + '-' + atA, result: row.tat });
      put(r, starts[iWT], starts[iWT] + spans[iWT] - 1, { formula: tatA + '-' + btA, result: row.wt });
      ws.getRow(r).height = 20;
      r += 1;
    });
    var lastRow = r - 1;

    // Jami qatori
    var rngTAT = ws.getCell(first, starts[iTAT]).address + ':' + ws.getCell(lastRow, starts[iTAT]).address;
    var rngWT = ws.getCell(first, starts[iWT]).address + ':' + ws.getCell(lastRow, starts[iWT]).address;
    put(r, starts[0], starts[iCT] + spans[iCT] - 1, 'Jami', { font: { bold: true }, fill: GREY, align: { horizontal: 'right' } });
    put(r, starts[iTAT], starts[iTAT] + spans[iTAT] - 1, { formula: 'SUM(' + rngTAT + ')', result: res.sumTAT }, { font: { bold: true }, fill: GREY });
    put(r, starts[iWT], starts[iWT] + spans[iWT] - 1, { formula: 'SUM(' + rngWT + ')', result: res.sumWT }, { font: { bold: true }, fill: GREY });
    ws.getRow(r).height = 20;
    r += 2;

    // Asosiy natija — AWT va ATAT
    put(r, 2, 15, 'O\'rtacha kutish vaqti (AWT)', { font: { bold: true, size: 12 }, fill: GREEN, align: { horizontal: 'left', indent: 1 } });
    var cAWT = put(r, 16, 20, { formula: 'AVERAGE(' + rngWT + ')', result: res.awt }, { font: { bold: true, size: 14, color: { argb: 'FF1E6B3A' } }, fill: GREEN });
    cAWT.numFmt = '0.00';
    put(r, 21, lastCol, '= WT yig\'indisi / jarayonlar soni = ' + res.sumWT + ' / ' + res.rows.length,
      { font: { italic: true, size: 10, color: { argb: 'FF4A5568' } }, align: { horizontal: 'left' }, border: false });
    ws.getRow(r).height = 26;
    r += 1;
    put(r, 2, 15, 'O\'rtacha aylanish vaqti (ATAT)', { font: { bold: true }, fill: GREY, align: { horizontal: 'left', indent: 1 } });
    var cATAT = put(r, 16, 20, { formula: 'AVERAGE(' + rngTAT + ')', result: res.atat }, { font: { bold: true }, fill: GREY });
    cATAT.numFmt = '0.00';
    put(r, 21, lastCol, '= TAT yig\'indisi / jarayonlar soni = ' + res.sumTAT + ' / ' + res.rows.length,
      { font: { italic: true, size: 10, color: { argb: 'FF4A5568' } }, align: { horizontal: 'left' }, border: false });
    ws.getRow(r).height = 22;
    r += 1;
    put(r, 2, 15, 'Jarayonlar almashinuvi soni', { fill: GREY, align: { horizontal: 'left', indent: 1 } });
    put(r, 16, 20, res.switches, { fill: GREY });
    r += 1;

    // Formulalar eslatmasi
    r += 1;
    put(r, 2, lastCol, 'AT — kelish vaqti,  BT — bajarilish vaqti,  CT — tugash vaqti (Gantt diagrammasidan olinadi).   TAT = CT − AT,   WT = TAT − BT.',
      { font: { italic: true, size: 10, color: { argb: 'FF4A5568' } }, align: { horizontal: 'left' }, border: false });
    r += 1;

    /* --- 2. Gantt diagrammasi --- */
    section('2. Gantt diagrammasi');
    // vaqt raqamlari: har bir katak = 1 birlik, raqam — shu birlik boshlanadigan vaqt
    for (var t = 0; t < total; t++) {
      var tc = ws.getCell(r, 2 + t);
      tc.value = t;
      tc.font = { name: FONT, size: 9, color: { argb: 'FF4A5568' } };
      tc.alignment = { horizontal: 'center', vertical: 'middle' };
    }
    var endCell = ws.getCell(r, 2 + total);
    endCell.value = total;
    endCell.font = { name: FONT, size: 9, bold: true, color: { argb: 'FF4A5568' } };
    endCell.alignment = { horizontal: 'center', vertical: 'middle' };
    r += 1;
    res.segments.forEach(function (s) {
      var c1 = 2 + s.start, c2 = 2 + s.end - 1;
      var cell = put(r, c1, c2, s.pid === null ? 'idle' : s.pid, {
        font: { bold: true, size: 11, color: { argb: s.pid === null ? 'FF6B7280' : 'FF1C2430' } },
        fill: s.pid === null ? 'D9DDE3' : colorOf(s.pid),
        border: undefined
      });
      for (var k = c1; k <= c2; k++) {
        ws.getCell(r, k).border = { top: { style: 'medium', color: { argb: 'FF' + NAVY } }, bottom: { style: 'medium', color: { argb: 'FF' + NAVY } },
          left: k === c1 ? { style: 'medium', color: { argb: 'FF' + NAVY } } : undefined,
          right: k === c2 ? { style: 'medium', color: { argb: 'FF' + NAVY } } : undefined };
      }
    });
    ws.getRow(r).height = 34;
    r += 1;
    put(r, 2, lastCol, 'Har bir katak — 1 vaqt birligi. Katak ustidagi raqam shu birlik boshlanadigan vaqtni bildiradi; oxirgi raqam — hamma jarayon tugagan vaqt.',
      { font: { italic: true, size: 10, color: { argb: 'FF4A5568' } }, align: { horizontal: 'left' }, border: false });
    r += 1;

    // Bo'laklar jadvali
    r += 1;
    var gs = [3, 4, 4, 4, 4];
    var gh = ['№', 'Jarayon', 'Boshlanish', 'Tugash', 'Davomiyligi'];
    var gst = [], gc = 2;
    gs.forEach(function (s) { gst.push(gc); gc += s; });
    gh.forEach(function (h, i) {
      put(r, gst[i], gst[i] + gs[i] - 1, h, { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: NAVY });
    });
    ws.getRow(r).height = 22;
    r += 1;
    res.segments.forEach(function (s, i) {
      var vals = [i + 1, s.pid === null ? 'idle' : s.pid, s.start, s.end];
      vals.forEach(function (v, k) {
        put(r, gst[k], gst[k] + gs[k] - 1, v, { fill: k === 1 && s.pid ? colorOf(s.pid) : null, font: k === 1 ? { bold: true } : {} });
      });
      var a = ws.getCell(r, gst[2]).address, b = ws.getCell(r, gst[3]).address;
      put(r, gst[4], gst[4] + gs[4] - 1, { formula: b + '-' + a, result: s.end - s.start });
      r += 1;
    });

    /* --- 3. Qadamma-qadam tushuntirish --- */
    section('3. Qadamma-qadam tushuntirish');
    var cs = [3, 5, 4];          // №, Vaqt, Jarayon
    var cst = [2, 5, 10];
    var textStart = 14;
    ['№', 'Vaqt', 'Jarayon'].forEach(function (h, i) {
      put(r, cst[i], cst[i] + cs[i] - 1, h, { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: NAVY });
    });
    put(r, textStart, lastCol, 'Nima bo\'ldi va nega?', { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: NAVY });
    ws.getRow(r).height = 22;
    r += 1;
    var charsPerLine = Math.max(30, (lastCol - textStart + 1) * 4.3 * 0.95);
    res.segments.forEach(function (s, i) {
      var text = s.lines.join('\n');
      var lines = 0;
      s.lines.forEach(function (ln) { lines += Math.max(1, Math.ceil(ln.length / charsPerLine)); });
      put(r, cst[0], cst[0] + cs[0] - 1, i + 1, { align: { vertical: 'top' } });
      put(r, cst[1], cst[1] + cs[1] - 1, s.start + ' → ' + s.end, { align: { vertical: 'top' } });
      put(r, cst[2], cst[2] + cs[2] - 1, s.pid === null ? 'idle' : s.pid, { font: { bold: true }, fill: s.pid ? colorOf(s.pid) : 'D9DDE3', align: { vertical: 'top' } });
      put(r, textStart, lastCol, text, { align: { horizontal: 'left', vertical: 'top' } });
      ws.getRow(r).height = Math.max(20, lines * 15 + 6);
      r += 1;
    });

    return ws;
  }

  /* "Taqqoslash" varag'i — 2 va undan ko'p algoritm tanlanganda */
  function buildSummary(wb, algos, results, o) {
    var ws = wb.addWorksheet('Taqqoslash', { views: [{ showGridLines: false }], pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 } });
    var widths = [2, 34, 14, 14, 20, 16];
    widths.forEach(function (w, i) { ws.getColumn(i + 1).width = w; });
    var r = 1;
    ws.mergeCells(r, 2, r, 6);
    var t = ws.getCell(r, 2);
    t.value = 'Algoritmlarni taqqoslash';
    t.font = { name: FONT, size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
    t.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    for (var k = 2; k <= 6; k++) ws.getCell(r, k).fill = fill(NAVY);
    ws.getRow(r).height = 34;
    r += 2;

    ws.mergeCells(r, 2, r, 6);
    var h1 = ws.getCell(r, 2);
    h1.value = 'Boshlang\'ich jadval';
    h1.font = { name: FONT, size: 12, bold: true, color: { argb: 'FF' + NAVY } };
    h1.fill = fill(LIGHT);
    ws.getRow(r).height = 22;
    r += 1;
    ['Jarayon', 'AT', 'BT'].forEach(function (h, i) {
      var c = ws.getCell(r, 2 + i);
      c.value = h;
      c.font = { name: FONT, bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = fill(NAVY); c.border = BORDER;
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    r += 1;
    var base = results[algos[0]];
    base.rows.forEach(function (row) {
      [row.pid, row.at, row.bt].forEach(function (v, i) {
        var c = ws.getCell(r, 2 + i);
        c.value = v;
        c.font = { name: FONT, bold: i === 0 };
        c.border = BORDER;
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        if (i === 0) c.fill = fill(colorOf(row.pid));
      });
      r += 1;
    });

    r += 1;
    ws.mergeCells(r, 2, r, 6);
    var h2 = ws.getCell(r, 2);
    h2.value = 'Natijalar (eng kichik AWT yashil rangda)';
    h2.font = { name: FONT, size: 12, bold: true, color: { argb: 'FF' + NAVY } };
    h2.fill = fill(LIGHT);
    ws.getRow(r).height = 22;
    r += 1;
    ['Algoritm', 'AWT', 'ATAT', 'Jarayon almashinuvi', 'Tugash vaqti'].forEach(function (h, i) {
      var c = ws.getCell(r, 2 + i);
      c.value = h;
      c.font = { name: FONT, bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = fill(NAVY); c.border = BORDER;
      c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });
    ws.getRow(r).height = 28;
    r += 1;
    var best = Math.min.apply(null, algos.map(function (a) { return results[a].awt; }));
    algos.forEach(function (a) {
      var res = results[a];
      var label = NAMES[a];
      if (a === 'rr') label += ' (TQ = ' + o.tq + ')';
      else label += o.mode === 'custom' ? ' — priority ustuni' : ' — qolgan vaqt';
      var vals = [label, res.awt, res.atat, res.switches, res.total];
      vals.forEach(function (v, i) {
        var c = ws.getCell(r, 2 + i);
        c.value = v;
        c.font = { name: FONT, bold: res.awt === best };
        c.border = BORDER;
        c.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle', wrapText: true, indent: i === 0 ? 1 : 0 };
        if (i === 1 || i === 2) c.numFmt = '0.00';
        if (res.awt === best) c.fill = fill(GREEN);
      });
      ws.getRow(r).height = 24;
      r += 1;
    });
    r += 1;
    ws.mergeCells(r, 2, r, 6);
    var note = ws.getCell(r, 2);
    note.value = 'AWT — o\'rtacha kutish vaqti, ATAT — o\'rtacha aylanish vaqti. Har bir algoritmning batafsil yechimi o\'z varag\'ida.';
    note.font = { name: FONT, italic: true, size: 10, color: { argb: 'FF4A5568' } };
    note.alignment = { wrapText: true, vertical: 'top' };
    ws.getRow(r).height = 30;
    return ws;
  }

  function download(algos, data) {
    if (!algos.length) return Promise.reject(new Error('Hech narsa tanlanmadi'));
    var o = { mode: data.mode, tq: Number(data.tq), orderNo: data.orderNo };
    var results = {};
    algos.forEach(function (a) { results[a] = root.Engine.run(a, data.procs, o); });

    var wb = new root.ExcelJS.Workbook();
    wb.creator = 'Rejalashtirish simulyatori';
    wb.created = new Date();
    if (algos.length > 1) buildSummary(wb, algos, results, o);
    algos.forEach(function (a) { buildSheet(wb, a, results[a], o); });

    return wb.xlsx.writeBuffer().then(function (buf) {
      var blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'Rejalashtirish_natija.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    });
  }

  root.Exporter = { download: download, NAMES: NAMES };
})(window);
