// Runicore Status — incident page (uses assets/common.js)
(async function () {
  const titleEl = document.getElementById('evtTitle');
  const cardEl = document.getElementById('evtCard');
  const statusEl = document.getElementById('evtStatus');
  const metaEl = document.getElementById('evtMeta');
  const descEl = document.getElementById('evtDesc');
  const commentsEl = document.getElementById('evtComments');
  const linksEl = document.getElementById('serviceLinks');
  const labelsEl = document.getElementById('evtLabels');
  const { fmtTs, fmtDuration, modeOf, liveMinutes, setFooterYear, fetchJson, esc, EMOJI_RE } = window.Runicore;

  setFooterYear();

  const params = new URLSearchParams(location.search);
  const issueNum = Number(params.get('issue') || 0);

  // Service favicon/emoji from summary.json (same source as the index list).
  function svcIconHtml(entry, sumBySlug) {
    const svc = sumBySlug[entry.slug];
    if (svc && svc.icon) {
      return '<img class="ev-fav" src="api/' + entry.slug + '/' + svc.icon + '" alt="" onerror="this.style.display=\'none\'">';
    }
    const src = svc ? svc.name : (entry.name || '');
    const m = src.match(EMOJI_RE);
    return (m && m[0]) ? '<span class="ev-fav emoji">' + m[0] + '</span>' : '';
  }

  // Service name without the leading emoji (already shown in the favicon).
  function cleanName(entry, sumBySlug) {
    const svc = sumBySlug[entry.slug];
    const nm = (svc ? svc.name : entry.name) || entry.name || 'Сервис';
    return nm.replace(EMOJI_RE, '').trim() || nm;
  }

  // Title: names of the main (isGroup) services; fallback to all affected ones.
  function renderTitle(affected, sumBySlug) {
    const heads = affected.filter((e) => sumBySlug[e.slug] && sumBySlug[e.slug].isGroup);
    const titleEntries = heads.length ? heads : affected;
    // Keep icon and name unbreakable on mobile.
    titleEl.innerHTML = titleEntries
      .map((e) =>
        '<span class="svc-name-wrap">' + svcIconHtml(e, sumBySlug) +
        '<span class="svc-name">' + esc(cleanName(e, sumBySlug)) + '</span></span>')
      .join('<span class="title-sep">, </span>');
    document.title = titleEntries.map((e) => cleanName(e, sumBySlug)).join(', ') + ' — Событие — Runicore';
  }

  // Badges under the title: duration "🕑 …" first, then labels by priority.
  // Display priority (left to right): RKN > incident > maintenance > annulled;
  // hidden is never shown. The card MODE is a separate thing — see monitor.py.
  const LABEL_TEXT = { incident: 'Сбой', maintenance: 'Техработы', annulled: 'Аннулировано', hidden: 'Скрыто', rkn: 'РКН' };
  const LABEL_PRIORITY = ['rkn', 'incident', 'maintenance', 'annulled'];
  // Labels in display priority order; unknown labels go last.
  function byLabelPriority(list) {
    const unknown = LABEL_PRIORITY.length;
    return (list || []).slice().sort((a, b) => {
      const ia = LABEL_PRIORITY.indexOf(a);
      const ib = LABEL_PRIORITY.indexOf(b);
      return (ia < 0 ? unknown : ia) - (ib < 0 ? unknown : ib);
    });
  }
  // prebuilt — ready-made markup; otherwise build badges from the label list.
  function renderLabelBadges(prebuilt, list) {
    if (!labelsEl) return;
    if (prebuilt) { labelsEl.innerHTML = prebuilt; labelsEl.style.display = ''; return; }
    const items = byLabelPriority(list || []).filter((l) => LABEL_TEXT[l]);
    if (!items.length) { labelsEl.style.display = 'none'; labelsEl.innerHTML = ''; return; }
    labelsEl.innerHTML = items.map((l) =>
      '<span class="evt-lb evt-lb-' + l + '">' + esc(LABEL_TEXT[l] || l) + '</span>').join('');
    labelsEl.style.display = '';
  }

  function renderCard(info, active) {
    const mode = modeOf(info, info.maintenance);
    cardEl.className = 'evt ' + mode;
    const started = fmtTs(info.opened);
    const resolved = fmtTs(info.resolved);
    let status;
    if (mode === 'maintenance') status = active ? 'Идут плановые работы' : 'Завершены';
    else if (mode === 'annulled') status = active ? 'Идет аннулирование' : 'Аннулировано';
    // RKN: active — "Возможны ограничения", resolved — "Ограничения сняты".
    else if (mode === 'rkn') status = active ? 'Возможны ограничения' : 'Ограничения сняты';
    else status = active ? 'Сервис недоступен' : 'Исправлен';
    // Full title: "Label · Status"; skip the status when it duplicates the label.
    const lbText = LABEL_TEXT[mode] || '';
    statusEl.textContent = (lbText && lbText !== status) ? lbText + ' · ' + status : status;

    // Badges: duration "🕑 …", then labels by priority.
    const parts = ['С ' + started + ' МСК'];
    if (resolved) parts.push('По ' + resolved + ' МСК');
    metaEl.innerHTML = parts.map((p) => '<span class="nb">' + p + '</span>').join('<span class="msep">·</span>');
    const mins = liveMinutes(info, active);
    const lbList = byLabelPriority((info.labels || []).filter((l) => LABEL_TEXT[l]));
    let badges = '';
    if (mins) badges += '<span class="evt-lb evt-lb-dur">🕑 ' + esc(fmtDuration(mins)) + '</span>';
    badges += lbList.map((l) => '<span class="evt-lb evt-lb-' + l + '">' + esc(LABEL_TEXT[l]) + '</span>').join('');
    renderLabelBadges(badges, lbList);

    const desc = (info.desc || '').trim();
    const metaText = parts.join('\n');
    const duplicatesMeta = !desc || metaText.includes(desc.replace(/^- /gm, '').trim());
    descEl.textContent = duplicatesMeta ? '' : desc;
    descEl.style.display = duplicatesMeta ? 'none' : '';
  }

  // Buttons for all affected services (including subgroups) at the bottom.
  function renderServiceLinks(affected, sumBySlug) {
    if (!linksEl) return;
    linksEl.innerHTML = '';
    const seen = new Set();
    for (const e of affected) {
      if (!e.slug || seen.has(e.slug)) continue;
      seen.add(e.slug);
      const a = document.createElement('a');
      a.className = 'service-btn';
      a.href = 'site.html?site=' + encodeURIComponent(e.slug);
      a.innerHTML = svcIconHtml(e, sumBySlug) + '<span>' + esc(cleanName(e, sumBySlug)) + '</span>';
      linksEl.appendChild(a);
    }
    linksEl.style.display = seen.size ? '' : 'none';
  }

  // Admin comments from GitHub Issues (api/issue-comments.json), newest first.
  function renderComments(list) {
    if (!commentsEl) return;
    commentsEl.innerHTML = '';
    const items = (list || []).filter((c) => c && (c.body || '').trim()).slice().reverse();
    if (!items.length) { commentsEl.style.display = 'none'; return; }
    commentsEl.style.display = '';
    for (const c of items) {
      const item = document.createElement('div');
      item.className = 'comment';
      const when = fmtTs(c.created_at);
      const head = document.createElement('div');
      head.className = 'comment-head';
      head.innerHTML = '<b>' + esc('Администратор:') + '</b>' +
        (when ? '<span class="comment-time">' + esc(when + ' МСК') + '</span>' : '');
      const body = document.createElement('div');
      body.className = 'comment-body';
      body.textContent = c.body;
      item.appendChild(head);
      item.appendChild(body);
      commentsEl.appendChild(item);
    }
  }

  try {
    const [incidents, log, comments, summary] = await Promise.all([
      fetchJson('api/incidents.json').catch(() => ({})),
      fetchJson('api/incidents-log.json').catch(() => []),
      fetchJson('api/issue-comments.json').catch(() => ({})),
      fetchJson('history/summary.json').catch(() => []),
    ]);
    const byIssue = comments || {};
    const sumBySlug = {};
    for (const s of summary) sumBySlug[s.slug] = s;

    // All affected services of this issue (active or from the log).
    const act = Object.values(incidents || {}).filter((i) => i.issue_number === issueNum);
    const affected = act.length ? act : (log || []).filter((i) => i.issue_number === issueNum);
    if (!affected.length) {
      titleEl.textContent = 'Событие не найдено';
      statusEl.textContent = 'Возможно, оно скрыто или ещё не синхронизировано.';
      return;
    }
    const active = !!act.length;
    // Card representative: the group head, otherwise the first entry.
    const heads = affected.filter((e) => sumBySlug[e.slug] && sumBySlug[e.slug].isGroup);
    const rep = heads.length ? heads[0] : affected[0];

    renderTitle(affected, sumBySlug);
    renderCard(rep, active);
    renderComments(byIssue[String(issueNum)]);
    renderServiceLinks(affected, sumBySlug);
  } catch (e) {
    titleEl.textContent = 'Не удалось загрузить событие';
  }
})();
