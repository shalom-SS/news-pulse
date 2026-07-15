const form = document.getElementById('search-form');
const input = document.getElementById('search-input');
const dateRange = document.getElementById('date-range');
const summary = document.getElementById('summary');
const pickup = document.getElementById('pickup');
const status = document.getElementById('status');
const results = document.getElementById('results');
const button = form.querySelector('button');
const trends = document.getElementById('trends');
const momentumVerdict = document.getElementById('momentum-verdict');
const momentumChartEl = document.getElementById('momentum-chart');
const momentumAxisEl = document.getElementById('momentum-axis');
const countryChartEl = document.getElementById('country-chart');
const voicesListEl = document.getElementById('voices-list');

function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// Small circular progress arc showing the score, 0-100.
function scoreArc(score) {
  const r = 19;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, score)) / 100) * c;
  const wrap = document.createElement('div');
  wrap.className = 'score';
  wrap.innerHTML = `
    <svg width="48" height="48" viewBox="0 0 48 48">
      <circle class="track" cx="24" cy="24" r="${r}" fill="none" stroke-width="3"></circle>
      <circle class="arc" cx="24" cy="24" r="${r}" fill="none" stroke-width="3"
        stroke-dasharray="${dash.toFixed(2)} ${c.toFixed(2)}"
        transform="rotate(-90 24 24)"></circle>
      <text class="num" x="24" y="24" text-anchor="middle" dominant-baseline="central">${score}</text>
    </svg>
    <div class="label">Score</div>
  `;
  return wrap;
}

const MOMENTUM_MAX_PX = 60;

function renderMomentum(momentum) {
  momentumChartEl.innerHTML = '';

  momentumVerdict.textContent = momentum.verdict;
  momentumVerdict.className = `verdict ${momentum.verdict}`;

  const maxTotal = Math.max(1, ...momentum.days.map((d) => d.trusted + d.other));

  for (const day of momentum.days) {
    const col = document.createElement('div');
    col.className = 'momentum-col';
    col.title = `${day.label}: ${day.trusted} trusted, ${day.other} other`;

    const stack = document.createElement('div');
    stack.className = 'momentum-stack';

    const trustedPx = day.trusted > 0 ? Math.max(1, Math.round((day.trusted / maxTotal) * MOMENTUM_MAX_PX)) : 0;
    const otherPx = day.other > 0 ? Math.max(1, Math.round((day.other / maxTotal) * MOMENTUM_MAX_PX)) : 0;

    const trustedSeg = document.createElement('div');
    trustedSeg.className = 'momentum-seg-trusted';
    trustedSeg.style.height = `${trustedPx}px`;

    const otherSeg = document.createElement('div');
    otherSeg.className = 'momentum-seg-other';
    otherSeg.style.height = `${otherPx}px`;

    stack.append(trustedSeg, otherSeg);
    col.appendChild(stack);
    momentumChartEl.appendChild(col);
  }

  momentumAxisEl.innerHTML = '';
  const days = momentum.days;
  const first = document.createElement('span');
  first.textContent = days[0].label;
  const mid = document.createElement('span');
  mid.textContent = days[Math.floor(days.length / 2)].label;
  const last = document.createElement('span');
  last.textContent = 'Today';
  momentumAxisEl.append(first, mid, last);
}

function renderCountryChart(coverage) {
  countryChartEl.innerHTML = '';

  for (const row of coverage) {
    const rowEl = document.createElement('div');
    rowEl.className = 'country-row';

    const name = document.createElement('span');
    name.className = 'country-name';
    name.textContent = row.country;

    const track = document.createElement('div');
    track.className = 'country-track';
    const fill = document.createElement('div');
    fill.className = 'country-fill';
    const pct = row.total > 0 ? (row.covered / row.total) * 100 : 0;
    fill.style.width = `${pct}%`;
    track.appendChild(fill);

    const count = document.createElement('span');
    count.className = 'country-count';
    count.textContent = `${row.covered} of ${row.total}`;

    rowEl.append(name, track, count);
    countryChartEl.appendChild(rowEl);
  }
}

function renderArticles(articles, meta, trend) {
  results.innerHTML = '';
  summary.hidden = false;

  if (trend) {
    trends.hidden = false;
    renderMomentum(trend.momentum);
    renderCountryChart(trend.coverageByCountry);
  }

  pickup.innerHTML = `Covered by <strong>${meta.sourcesCovered}</strong> of my ${meta.totalSources} sources`;

  const parts = [`${articles.length} result${articles.length === 1 ? '' : 's'}`];
  if (meta.filteredOutBySource) {
    parts.push(`${meta.filteredOutBySource} outside my trusted sources`);
  }
  status.textContent = parts.join(' · ');

  if (articles.length === 0) {
    return;
  }

  for (const article of articles) {
    const li = document.createElement('li');
    li.className = 'card';

    li.appendChild(scoreArc(article.score));

    const body = document.createElement('div');
    body.className = 'card-body';

    const title = document.createElement('a');
    title.className = 'card-title';
    title.href = article.link;
    title.target = '_blank';
    title.rel = 'noopener noreferrer';
    title.textContent = article.title;

    const metaLine = document.createElement('div');
    metaLine.className = 'card-meta';

    const src = document.createElement('span');
    src.textContent = `${article.source.name} · ${article.source.country}`;

    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.textContent = '·';

    const date = document.createElement('span');
    date.textContent = formatDate(article.date);

    const tier = document.createElement('span');
    tier.className = `tier tier-${article.source.tier}`;
    tier.textContent = `Tier ${article.source.tier}`;

    metaLine.append(src, dot, date, tier);

    const why = document.createElement('div');
    why.className = 'card-why';
    why.textContent = article.reason;

    body.append(title, metaLine, why);
    li.appendChild(body);
    results.appendChild(li);
  }
}

function voiceItemsBlock(label, items) {
  const frag = document.createDocumentFragment();

  const labelEl = document.createElement('div');
  labelEl.className = 'voice-items-label';
  labelEl.textContent = label;
  frag.appendChild(labelEl);

  const list = document.createElement('ul');
  list.className = 'voice-items';
  for (const item of items) {
    const li = document.createElement('li');
    li.className = 'voice-item';

    const a = document.createElement('a');
    a.href = item.link;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = item.title;

    const date = document.createElement('span');
    date.className = 'voice-item-date';
    date.textContent = formatDate(item.date);

    li.append(a, date);
    list.appendChild(li);
  }
  frag.appendChild(list);
  return frag;
}

function renderVoices(voices) {
  voicesListEl.innerHTML = '';

  for (const voice of voices) {
    const hasPosts = voice.posts && voice.posts.length > 0;
    const hasMentions = voice.mentions && voice.mentions.length > 0;
    const collapsed = !hasPosts && !hasMentions;

    const el = document.createElement('div');
    el.className = collapsed ? 'voice collapsed' : 'voice';

    const name = document.createElement('span');
    name.className = 'voice-name';
    name.textContent = voice.name;

    const affiliation = document.createElement('span');
    affiliation.className = 'voice-affiliation';
    affiliation.textContent = voice.affiliation;

    el.append(name, affiliation);

    if (hasPosts) {
      el.appendChild(voiceItemsBlock('Latest', voice.posts));
    }
    if (hasMentions) {
      el.appendChild(voiceItemsBlock('In the news', voice.mentions));
    }

    voicesListEl.appendChild(el);
  }
}

// Voices loads independently of the search form — it tracks people, not
// search queries, and a failure here must never disturb the main search UI.
async function loadVoices() {
  try {
    const res = await fetch('/api/voices');
    if (!res.ok) return;
    const data = await res.json();
    renderVoices(data.voices || []);
  } catch {
    // Silent — Voices is secondary to the main search flow.
  }
}

loadVoices();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const query = input.value.trim();
  if (!query) return;

  button.disabled = true;
  status.textContent = '';
  pickup.textContent = '';
  summary.hidden = true;
  trends.hidden = true;
  results.innerHTML = '';
  status.textContent = 'Searching…';
  summary.hidden = false;

  try {
    const range = dateRange.value;
    const res = await fetch(
      `/api/search?q=${encodeURIComponent(query)}&range=${encodeURIComponent(range)}`
    );
    const data = await res.json();
    if (!res.ok) {
      status.textContent = data.error || 'Something went wrong.';
      return;
    }
    renderArticles(data.articles, data.meta, data.trend);
  } catch (err) {
    status.textContent = 'Could not reach the server.';
  } finally {
    button.disabled = false;
  }
});
