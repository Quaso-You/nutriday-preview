/* 食刻 · Nutriday. Eazo visual language, proposal-aligned prototype flow. */
(() => {
  'use strict';
  const C = window.NutridayCore;
  if (!C) throw new Error('推荐规则未加载');
  const STORE = 'nutriday:visual-v1';
  const app = document.getElementById('app');
  const tabs = [['today', 'cloche', '今日'], ['discover', 'compass', '发现'], ['chat', 'record', '记录'], ['mine', 'person', '我的']];
  const paths = {
    pepper: '<path d="M16.7 5.4c-2.1.1-2.6-1.8-1.7-3.2-2.3.2-3.3 2-2.6 4.2-3.3-.4-6.5 1.3-7.6 4.4-1.4 4 .7 8.2 4.3 9.1 1.5.4 2.2-.2 2.9-1.6 1-2.1 1.9-3.1 4.2-4.2 2.6-1.3 3.8-5.2 1.3-7.2Z"/><path d="M12.4 6.4c1.1 1 2.7 1.2 4.1.5"/>',
    allergy: '<circle cx="12" cy="12" r="9"/><path d="M6 18 18 6M10 9c-1.5 1.2-1 3.4.7 3.6m3.6-1c1.6.2 2.2 2.4.7 3.3"/>',
    coins: '<ellipse cx="12" cy="5" rx="7" ry="2.3"/><path d="M5 5v4c0 1.3 3.1 2.3 7 2.3s7-1 7-2.3V5M5 9v4c0 1.3 3.1 2.3 7 2.3s7-1 7-2.3V9M5 13v4c0 1.3 3.1 2.3 7 2.3s7-1 7-2.3v-4"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M7.5 3v4M16.5 3v4M3.5 10h17m-12 5 2 2 4-4"/>',
    cloche: '<path d="M4 17h16M6 15a6 6 0 0 1 12 0M12 9V7m-2 0h4M4.5 19.5h15"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.2 5-4.8 2 2.2-5 4.8-2Z"/>',
    record: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v3H9zm-.5 8h7m-7 4h7"/>',
    person: '<circle cx="12" cy="8" r="3.2"/><path d="M5.5 20c.3-4 2.7-6 6.5-6s6.2 2 6.5 6"/>'
  };
  const icon = name => `<svg class="line-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ''}</svg>`;
  const photos = { b1: './assets/breakfast-demo.png', l2: './assets/lunch-demo.png', d1: './assets/dinner-demo.png' };
  const photo = dish => photos[dish?.id] || '';
  const mealImage = dish => photo(dish) ? `<img src="${photo(dish)}" alt="${esc(dish.name)}示意图">` : '<div class="image-pending" aria-label="餐品图片待补">图片待补</div>';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const money = value => `¥${Number(value || 0).toFixed(Number(value) % 1 ? 1 : 0)}`;
  const today = () => C.dayKey();
  const defaultProfile = () => ({ onboarded: false, taste: '适中', preferences: [], allergies: [], avoid: [], budget: 30, goal: '均衡饮食', schedule: [], times: { breakfast: '08:00', lunch: '12:00', dinner: '18:00' }, events: [] });
  const fresh = () => ({ profile: defaultProfile(), plan: {}, planDate: '', logs: {}, subscription: false, filter: '全部', tab: 'today', detail: '', chatOpen: false, modal: null, modalMeal: '', modalDishId: '', message: '', storageError: false });
  let state = fresh();
  const ui = { scroll: { today: 0, discover: 0, chat: 0, mine: 0 }, draft: '', messages: [], pending: null };
  let toastTimer;

  function cleanProfile(raw) {
    const profile = defaultProfile();
    if (!raw || typeof raw !== 'object') return profile;
    profile.onboarded = raw.onboarded === true;
    profile.taste = ['清淡', '适中', '偏重'].includes(raw.taste) ? raw.taste : '适中';
    for (const [key, options] of [['preferences', C.PREFERENCES], ['allergies', C.ALLERGIES], ['avoid', C.AVOIDS], ['schedule', C.SCHEDULES]]) {
      profile[key] = Array.isArray(raw[key]) ? [...new Set(raw[key].filter(x => options.includes(x)))] : [];
    }
    profile.budget = Number.isFinite(raw.budget) && raw.budget >= 5 && raw.budget <= 200 ? Math.round(raw.budget) : 30;
    profile.goal = C.GOALS.includes(raw.goal) ? raw.goal : '均衡饮食';
    for (const meal of C.MEALS) {
      const value = raw.times?.[meal.id];
      if (typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)) profile.times[meal.id] = value;
    }
    profile.events = Array.isArray(raw.events) ? raw.events.filter(e => e && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && ['考试', '训练'].includes(e.type)).slice(0, 20).map(e => ({ date: e.date, type: e.type })) : [];
    return profile;
  }
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (raw) {
        state.profile = cleanProfile(raw.profile);
        state.plan = raw.plan && typeof raw.plan === 'object' ? raw.plan : {};
        state.planDate = raw.planDate || '';
        state.logs = raw.logs && typeof raw.logs === 'object' ? raw.logs : {};
        state.subscription = raw.subscription === true;
        state.filter = ['全部', '食堂', '全家便当'].includes(raw.filter) ? raw.filter : '全部';
      }
    } catch { state.message = '旧记录无法读取，请重新填写画像。'; }
    ensurePlan();
  }
  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify({ profile: state.profile, plan: state.plan, planDate: state.planDate, logs: state.logs, subscription: state.subscription, filter: state.filter }));
      state.storageError = false;
    } catch { state.storageError = true; }
  }
  function ensurePlan(force = false) {
    const date = today();
    if (force || state.planDate !== date || C.MEALS.some(m => state.plan[m.id] && !C.eligibleDish(C.mealById(state.plan[m.id]) || { availableToday: false }, state.profile).ok)) {
      state.plan = C.buildPlan(state.profile, C.SAMPLE_MENU, date);
      state.planDate = date;
      if (state.profile.onboarded) save();
    }
  }
  function notify(message) {
    state.message = message;
    render();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { state.message = ''; render(); }, 3200);
  }
  function loggedToday() { return state.logs[today()] || {}; }
  function report() { return C.weeklyReport(state.logs, state.profile); }
  function labelFor(dish) { return dish.dataStatus === '演示菜单' ? '营养估算' : dish.nutritionSource; }

  function statusBar() {
    return `<div class="status-bar" aria-hidden="true"><span>${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}</span><span class="status-icons">▮▮▮  ◉  <b>100</b></span></div>`;
  }
  function brand(compact = false) {
    return `<div class="brand-lockup ${compact ? 'compact' : ''}"><span class="brand-icon" aria-hidden="true"></span><div><strong>食刻</strong><small>Nutriday</small></div></div>`;
  }
  const chatButton = () => `<button class="header-action chat-entry" data-act="open-chat" aria-label="打开食刻聊天"><svg class="chat-line-icon" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 4.7c-7 0-12.3 4.6-12.3 10.7 0 3.3 1.5 6 4.1 8l-1.3 4.4 4.9-2.3c1.4.5 2.9.7 4.6.7 7 0 12.3-4.6 12.3-10.8C28.3 9.3 23 4.7 16 4.7Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="11" cy="15.5" r="1.15" fill="currentColor"/><circle cx="16" cy="15.5" r="1.15" fill="currentColor"/><circle cx="21" cy="15.5" r="1.15" fill="currentColor"/></svg></button>`;
  function header() {
    return `${statusBar()}<header class="app-header">${brand(true)}${chatButton()}</header>`;
  }
  function checkOptions(name, options, selected) {
    return `<div class="chips form-chips">${options.map(value => `<label class="form-chip"><input type="checkbox" name="${name}" value="${esc(value)}" ${selected.includes(value) ? 'checked' : ''}><span>${esc(value)}</span></label>`).join('')}</div>`;
  }
  function profileForm(first) {
    const p = state.profile;
    return `<form id="profile-form" class="profile-form"><div class="group"><div class="group-label">饮食偏好</div>${checkOptions('preferences', C.PREFERENCES, p.preferences)}</div><div class="group"><div class="group-label">过敏原</div>${checkOptions('allergies', C.ALLERGIES, p.allergies)}</div><div class="group"><div class="group-label">忌口</div>${checkOptions('avoid', C.AVOIDS, p.avoid)}</div><div class="group"><label class="group-label" for="profile-budget">每餐预算上限</label><div class="budget-line"><span>¥</span><input id="profile-budget" name="budget" type="number" min="5" max="200" step="1" value="${p.budget}" required></div></div><div class="group"><label class="group-label" for="profile-goal">目前目标</label><select id="profile-goal" name="goal">${C.GOALS.map(value => `<option ${p.goal === value ? 'selected' : ''}>${value}</option>`).join('')}</select></div><div class="group"><div class="group-label">平常作息</div>${checkOptions('schedule', C.SCHEDULES, p.schedule)}<div class="calendar-times">${C.MEALS.map(m => `<label>${m.name}<input type="time" name="time-${m.id}" value="${p.times[m.id]}" required></label>`).join('')}</div></div><button class="primary" type="submit">保存</button></form>`;
  }
  function welcomeHero() {
    return `<div class="welcome-hero"><div class="welcome-brand">${brand(false)}<span class="brand-spark" aria-hidden="true"></span></div><div class="welcome-campus"><img src="./assets/campus-onboarding-no-sign.png" alt="" aria-hidden="true"></div></div>`;
  }
  function onboarding() {
    const p = state.profile;
    const allergy = p.allergies.length || p.avoid.length;
    const taste = ['清淡', '适中', '偏重'].map(x => `<button class="mini-choice ${p.taste === x ? 'selected' : ''}" data-act="taste" data-value="${x}" aria-pressed="${p.taste === x}">${x}</button>`).join('');
    const budget = [15, 20, 30].map(x => `<button class="mini-choice ${p.budget === x ? 'selected' : ''}" data-act="budget" data-value="${x}" aria-pressed="${p.budget === x}">≤${x}</button>`).join('');
    return `${statusBar()}<main class="welcome-scroll">${welcomeHero()}<section class="welcome-content"><h1>Know About You</h1><p>告诉食刻你的饮食习惯，为你推荐更合适的校园餐。</p><div class="quick-rows"><div class="quick-row"><span class="row-icon">${icon('pepper')}</span><strong>口味偏好</strong><div class="row-options">${taste}</div><button class="row-arrow" data-act="edit-profile" aria-label="更多口味偏好">›</button></div><div class="quick-row"><span class="row-icon">${icon('allergy')}</span><strong>过敏与忌口</strong><div class="row-options"><button class="mini-choice ${!allergy ? 'selected' : ''}" data-act="allergy-none">无</button><button class="mini-choice ${allergy ? 'selected' : ''}" data-act="edit-profile">有</button></div><button class="row-arrow" data-act="edit-profile" aria-label="编辑过敏与忌口">›</button></div><div class="quick-row"><span class="row-icon">${icon('coins')}</span><strong>每餐预算</strong><div class="row-options">${budget}</div><button class="row-arrow" data-act="edit-profile" aria-label="其他预算">›</button></div><div class="quick-row"><span class="row-icon">${icon('calendar')}</span><strong>作息与目标</strong><span class="row-summary">早8点 · 三餐规律 · ${esc(p.goal)}</span><button class="row-arrow" data-act="edit-profile" aria-label="设置作息与目标">›</button></div></div></section><button class="welcome-save primary" data-act="save-welcome">保存画像</button></main>${state.modal ? modal() : ''}${state.message ? `<div class="toast" role="status">${esc(state.message)}</div>` : ''}`;
  }
  function recommendationReason(dish, meal) {
    const parts = [];
    const matched = state.profile.preferences.filter(tag => dish.tags.includes(tag));
    if (matched.length) parts.push(`匹配${matched.join('、')}偏好`);
    if (C.activeSchedule(state.profile).includes('训练') && dish.nutrition.protein >= 25) parts.push(`蛋白质约 ${dish.nutrition.protein}g`);
    if (C.activeSchedule(state.profile).includes('考试') && dish.tags.includes('清淡')) parts.push('考试日优先展示清淡选项');
    if (state.profile.goal === '控制预算') parts.push(`价格 ${money(dish.price)}，在预算内`);
    if (!parts.length) parts.push(`${meal.name}可选，价格在每餐预算内`);
    return `${parts.join('；')}。`;
  }
  function mealCard(meal) {
    const dish = C.mealById(state.plan[meal.id]);
    if (!dish) return `<article class="meal-card unavailable"><div class="meal-card-copy"><span class="meal-label">${meal.name}</span><h3>暂无可推荐餐品</h3><small>请核对过敏与预算设置</small><button class="subtle-link" data-act="edit-profile">调整画像 ›</button></div></article>`;
    const logged = loggedToday()[meal.id];
    return `<article class="meal-card"><button class="meal-photo" data-act="detail" data-id="${dish.id}" aria-label="查看${esc(dish.name)}">${mealImage(dish)}</button><div class="meal-card-copy"><span class="meal-label">${meal.name}</span><button class="meal-name" data-act="detail" data-id="${dish.id}">${esc(dish.name)}</button><strong class="meal-price">${money(dish.price)}</strong><div class="meal-card-foot"><span class="recommend-pill">${logged ? '已记录' : '推荐'}</span><button data-act="swap" data-meal="${meal.id}" aria-label="${meal.name}换一道">↻ 换一道</button></div></div></article>`;
  }
  function todayPage() {
    const p = state.profile, plan = C.planTotals(state.plan);
    return `<div class="today-intro"><div><h1>What to Eat<br>Today</h1><button class="profile-chip" data-act="edit-profile">${icon('person')} ${esc(p.goal)} · ${money(p.budget)}/餐　›</button></div><img src="./assets/campus-watercolor.png" alt="" aria-hidden="true"></div><div class="section-title"><h2>今日三餐</h2><span>演示菜单</span></div><div class="meal-list">${C.MEALS.map(mealCard).join('')}</div><div class="plan-total"><span>今日预计摄入</span><strong>${plan.kcal.toLocaleString('zh-CN')} <small>kcal</small></strong><i></i><span>蛋白质 <b>${Math.round(plan.protein)} g</b></span></div><p class="micro-note">餐品图片与营养数值为演示资料；就餐前请核对现场供应和过敏原。</p>`;
  }
  function discoverPage() {
    const menu = C.SAMPLE_MENU.filter(d => state.filter === '全部' || d.source === state.filter);
    return `<div class="page-heading"><small>校园菜单</small><h1>发现好好吃的</h1></div><div class="filter-row">${['全部', '食堂', '全家便当'].map(x => `<button class="filter-chip ${state.filter === x ? 'active' : ''}" data-act="filter" data-value="${x}" aria-pressed="${state.filter === x}">${x}</button>`).join('')}</div><div class="discover-list">${menu.map(d => { const ok = C.eligibleDish(d, state.profile).ok; return `<article class="discover-card"><button class="discover-photo" data-act="detail" data-id="${d.id}" aria-label="查看${esc(d.name)}">${mealImage(d)}</button><div class="discover-copy"><span class="small-caps">${esc(d.source)} · ${C.MEALS.find(m => m.id === d.meal).name}</span><h3>${esc(d.name)}</h3><div class="discover-price">${money(d.price)}</div><div class="discover-foot"><span class="${ok ? 'recommend-pill' : 'not-recommend'}">${ok ? '推荐' : '不推荐'}</span><button data-act="choose" data-id="${d.id}" ${ok ? '' : 'disabled'}>${ok ? '选这道' : '暂不可选'}</button></div></div></article>`; }).join('')}</div><p class="micro-note">当前为演示菜单；餐品图片、供应和营养数值待团队核对。</p>`;
  }
  function chatPage() {
    const actual = C.logTotals(loggedToday()), r = report();
    return `<div class="page-heading"><small>我的记录</small><h1>吃得怎么样</h1></div><div class="record-summary"><span>今天已记录 <b>${actual.count}/3 餐</b></span><div><strong>${Math.round(actual.kcal)}</strong><small>kcal</small></div><div><strong>${Math.round(actual.protein)}</strong><small>g 蛋白质</small></div></div><div class="section-title"><h2>今日三餐</h2><span>自愿打卡</span></div><div class="record-list">${C.MEALS.map(m => { const log = loggedToday()[m.id]; return `<div class="record-row"><span>${esc(state.profile.times[m.id])}</span><div><strong>${m.name}</strong><small>${log ? esc(log.name) : '还未记录'}</small></div><button data-act="log" data-meal="${m.id}">${log ? '编辑' : '＋ 记录'}</button></div>`; }).join('')}</div><div class="section-title"><h2>本周概览</h2></div><div class="week-card"><div class="week-days">${r.days.map((d, i) => `<div><span>${['一','二','三','四','五','六','日'][i]}</span><b class="${d > today() ? 'future' : state.logs[d] && Object.keys(state.logs[d]).length ? 'marked' : ''}">${d.slice(-2)}</b></div>`).join('')}</div><div class="week-numbers"><span><strong>${r.meals}</strong> 餐记录</span><span><strong>${r.withinBudget}</strong> 餐预算内</span></div>${r.average ? `<p>完整记录日均：约 ${r.average.kcal} kcal · 蛋白质 ${r.average.protein}g</p>` : '<p>完整记录一天三餐后，这里会显示营养趋势。</p>'}</div><button class="subtle-link full" data-nav="mine">查看下周规划与日历提醒　›</button><p class="micro-note">未打卡的餐次不会当作零摄入。营养数值均为估算。</p>`;
  }
  function chatScreen() {
    const suggestion = [
      ['▣', '预算改为20', '预算 20'],
      ['⌁', '今天训练', '今天训练'],
      ['♧', '不吃蒜', '不吃蒜']
    ];
    const nav = state.profile.onboarded ? `<nav class="tab-bar" role="tablist" aria-label="主导航">${tabs.map(([id, iconName, label]) => `<button role="tab" id="tab-${id}" aria-selected="${state.tab === id}" data-nav="${id}" class="${state.tab === id ? 'active' : ''}"><span aria-hidden="true">${icon(iconName)}</span><strong>${label}</strong></button>`).join('')}</nav>` : '';
    return `${statusBar()}<header class="chat-header"><button data-act="back-chat" aria-label="返回">‹</button>${brand(true)}<strong>聊聊</strong><button class="chat-record-jump" data-nav="chat" aria-label="查看记录">▤</button></header><main class="chat-view"><div class="chat-hero"><div><h1>和食刻聊聊</h1><p>调整饮食偏好、预算或今日安排</p></div><img src="./assets/campus-watercolor.png" alt="" aria-hidden="true"></div><div class="chat-suggestions">${suggestion.map(([icon, label, value]) => `<button data-act="chat-prompt" data-value="${value}"><span>${icon}</span><strong>${label}</strong></button>`).join('')}</div><div class="chat-transcript">${ui.messages.map(m => `<div class="chat-message ${m.self ? 'self' : 'assistant'}">${m.self ? '' : `<img src="./assets/fork-clock.png" alt="">`}<span>${esc(m.text)}</span></div>`).join('')}${ui.pending ? `<div class="chat-message assistant"><img src="./assets/fork-clock.png" alt=""><div class="chat-pending"><strong>${esc(ui.pending.label)}？</strong><div><button class="secondary" data-act="chat-cancel">取消</button><button class="primary" data-act="chat-confirm">确认并重算</button></div></div></div>` : ''}</div></main><div class="chat-composer"><form id="chat-form"><label for="chat-input" class="sr-only">告诉食刻你的需求</label><input id="chat-input" maxlength="200" value="${esc(ui.draft)}" placeholder="告诉我你的需求…" ${ui.pending ? 'disabled' : ''}><button type="submit" aria-label="发送" ${ui.pending ? 'disabled' : ''}>↑</button></form></div>${nav}${state.message ? `<div class="toast" role="status">${esc(state.message)}</div>` : ''}`;
  }
  function weeklyCard() {
    const r = report();
    return `<section class="section report-card"><div class="heading"><div><span class="number">本周记录</span><h2>一周，吃得怎么样</h2></div></div><div class="report-grid"><div><strong>${r.meals}</strong><small>已记录餐次</small></div><div><strong>${r.loggedDays}</strong><small>有记录的天数</small></div><div><strong>${r.withinBudget}/${r.meals}</strong><small>预算内餐次</small></div></div><p class="hint">未记录的餐次不按 0 摄入计算，也不影响获取推荐。</p>${r.average ? `<p>完整记录 ${r.completeDays} 天的日均估算：${r.average.kcal} 千卡、蛋白质 ${r.average.protein}g、脂肪 ${r.average.fat}g、碳水 ${r.average.carb}g、膳食纤维 ${r.average.fiber}g。</p><p class="hint">趋势与缺口仅作演示参考；样本不足时不下健康结论。</p>` : '<p>还没有完整记录的三餐日，暂不判断营养缺口或变化趋势。</p>'}</section>`;
  }
  function subscriptionCard() {
    const r = report();
    return `<section class="section"><div class="heading"><div><span class="number">长期跟踪</span><h2>下周饮食计划</h2></div></div><p class="hint">开启后，根据每周自愿记录生成下一周的规则建议；演示版不收费、不自动推送。</p><button class="${state.subscription ? 'secondary' : 'primary'}" data-act="subscription">${state.subscription ? '已开启 · 点击关闭' : '开启每周规划'}</button>${state.subscription ? `<div class="next-week">${C.nextWeekSuggestions(r, state.profile).map(x => `<p>🥐 ${esc(x)}</p>`).join('')}</div>` : ''}</section>`;
  }
  function calendarCard() {
    const events = state.profile.events.filter(e => e.date >= today()).sort((a, b) => a.date.localeCompare(b.date));
    return `<section class="section"><div class="heading"><div><span class="number">日历与特别提醒</span><h2>重要日子，提前想好</h2></div></div><p class="hint">为考试或训练设置日期；当天会加入推荐排序条件。日历文件是静态提醒，更改安排后需重新导入。</p><form id="event-form" class="event-form"><label>日期<input type="date" name="date" min="${today()}" required></label><label>安排<select name="type"><option>考试</option><option>训练</option></select></label><button class="secondary" type="submit">添加</button></form>${events.length ? `<div class="event-list">${events.map((e, i) => `<div><span>${e.date} · ${e.type}</span><button class="textbtn" data-act="remove-event" data-date="${e.date}" data-type="${e.type}">删除</button></div>`).join('')}</div>` : ''}<button class="primary" data-act="calendar-download">下载三餐与特别提醒日历</button><p class="hint">仅生成 .ics 文件，导入由你确认；无法自动更新推荐菜品或营养缺口。</p></section>`;
  }
  function minePage() {
    const p = state.profile;
    return `<section class="section"><div class="heading"><div><span class="number">01 / 个人画像</span><h2>口味与安全边界</h2></div><button class="textbtn" data-act="edit-profile">编辑</button></div><dl class="profile-summary"><dt>口味偏好</dt><dd>${esc([p.taste, ...p.preferences.filter(x => x !== p.taste)].join('、'))}</dd><dt>过敏</dt><dd>${esc(p.allergies.join('、') || '无')}</dd><dt>忌口</dt><dd>${esc(p.avoid.join('、') || '无')}</dd><dt>每餐预算</dt><dd>${money(p.budget)}</dd><dt>作息与目标</dt><dd>${esc([p.goal, ...p.schedule].join(' · '))}</dd></dl><p class="hint">实际就餐前，请核对现场供应与过敏原标签。</p></section>${weeklyCard()}${subscriptionCard()}${calendarCard()}<section class="section"><div class="heading"><h2>本机数据</h2></div><div class="data-actions"><button class="secondary" data-act="export">导出数据</button><button class="secondary danger" data-act="reset">重置全部</button></div></section>`;
  }
  function detailPage() {
    const dish = C.mealById(state.detail);
    if (!dish) { state.detail = ''; return todayPage(); }
    const ok = C.eligibleDish(dish, state.profile).ok;
    return `${statusBar()}<header class="detail-header"><button data-act="back-detail" aria-label="返回">‹</button><span>食刻 <small>Nutriday</small></span>${chatButton()}</header><main class="detail-scroll"><div class="detail-photo">${mealImage(dish)}</div><div class="detail-body"><div class="detail-title"><h1>${esc(dish.name)}</h1><span class="${ok ? 'recommend-pill' : 'not-recommend'}">${ok ? '推荐' : '不推荐'}</span></div><p class="detail-venue">⌖　${esc(dish.venue)}</p><div class="nutrition-strip"><strong>${money(dish.price)}</strong><i></i><span><b>${dish.nutrition.kcal}</b> kcal</span><i></i><span>蛋白质 <b>${dish.nutrition.protein}</b> g</span></div><p class="estimate-note">营养为估算 · 餐品图片为示意图</p></div></main><div class="detail-actions"><button class="secondary" data-act="swap" data-meal="${dish.meal}" ${ok ? '' : 'disabled'}>↻　换一道</button><button class="primary" data-act="log" data-meal="${dish.meal}" ${ok ? '' : 'disabled'}>✓　吃了这餐 · 打卡</button></div>${modal()}${state.message ? `<div class="toast" role="status">${esc(state.message)}</div>` : ''}`;
  }
  function modal() {
    if (!state.modal) return '';
    let content = '';
    if (state.modal === 'profile') content = `<h2>调整个人画像</h2>${profileForm(false)}`;
    if (state.modal === 'log') {
      const meal = C.MEALS.find(m => m.id === state.modalMeal), previous = loggedToday()[meal.id];
      const dish = C.mealById(state.modalDishId) || previous;
      content = `<h2>记录${meal.name}</h2><p>${esc(dish.name)} · ${money(dish.price)}<br><small>所选方案只是默认值，请确认实际吃的份量。</small></p><form id="log-form"><label>实际份量<select name="portion"><option value="0.5" ${previous?.portion === .5 ? 'selected' : ''}>半份</option><option value="1" ${!previous || previous.portion === 1 ? 'selected' : ''}>一份</option><option value="1.5" ${previous?.portion === 1.5 ? 'selected' : ''}>一份半</option></select></label><button class="primary" type="submit">保存这餐</button></form>${previous ? '<button class="textbtn danger" data-act="remove-log">删除这餐记录</button>' : ''}`;
    }
    if (state.modal === 'reset') content = '<h2>重置全部本机数据？</h2><p>会清除画像、三餐方案、特别安排、打卡和订阅状态。此操作不能在应用内撤销。</p><button class="primary" data-act="confirm-reset">确认重置</button>';
    return `<div class="overlay" data-act="backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="${state.modal === 'profile' ? '编辑画像' : state.modal === 'log' ? '记录餐食' : '重置数据'}"><div class="top"><small>食刻 · Nutriday</small><button class="modal-close" data-act="close" aria-label="关闭">×</button></div>${content}</section></div>`;
  }
  function render() {
    if (!app) return;
    ensurePlan();
    const current = app.querySelector('.tab-page:not([hidden])');
    if (current?.dataset.page) ui.scroll[current.dataset.page] = current.scrollTop;
    if (state.chatOpen) { app.innerHTML = chatScreen(); const view = app.querySelector('.chat-view'); if (view) view.scrollTop = view.scrollHeight; return; }
    if (!state.profile.onboarded) { app.innerHTML = onboarding(); return; }
    if (state.detail) { app.innerHTML = detailPage(); return; }
    const pages = { today: todayPage, discover: discoverPage, chat: chatPage, mine: minePage };
    app.innerHTML = `${header()}<main class="app-views">${Object.entries(pages).map(([id, fn]) => `<section class="tab-page ${id === 'chat' ? 'chat-page' : ''}" data-page="${id}" id="page-${id}" role="tabpanel" aria-labelledby="tab-${id}" ${state.tab === id ? '' : 'hidden'}>${fn()}</section>`).join('')}</main><nav class="tab-bar" role="tablist" aria-label="主导航">${tabs.map(([id, iconName, label]) => `<button role="tab" id="tab-${id}" aria-controls="page-${id}" aria-selected="${state.tab === id}" data-nav="${id}" class="${state.tab === id ? 'active' : ''}"><span aria-hidden="true">${icon(iconName)}</span><strong>${label}</strong></button>`).join('')}</nav>${modal()}${state.message ? `<div class="toast" role="status">${esc(state.message)}</div>` : ''}${state.storageError ? '<p class="storage-alert" role="alert">本机存储不可用，本次修改可能无法保留。</p>' : ''}`;
    app.querySelectorAll('.tab-page').forEach(page => { page.scrollTop = ui.scroll[page.dataset.page] || 0; });
  }

  function parseIntent(text) {
    const budget = text.match(/预算\s*(\d{1,3})/);
    if (budget && +budget[1] >= 5 && +budget[1] <= 200) return { type: 'budget', value: +budget[1], label: `每餐预算改为 ¥${budget[1]}` };
    const avoid = text.match(/不吃\s*(葱|姜|蒜|辣)/);
    if (avoid) return { type: 'avoid', value: avoid[1], label: `忌口加入${avoid[1]}` };
    const schedule = text.match(/今天\s*(训练|考试)/);
    if (schedule) return { type: 'schedule', value: schedule[1], label: `今日安排加入${schedule[1]}` };
    return null;
  }
  function calendarText() {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    const start = today().replace(/-/g, '');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nutriday//Meal Reminder//ZH', 'CALSCALE:GREGORIAN'];
    C.MEALS.forEach(m => {
      lines.push('BEGIN:VEVENT', `UID:nutriday-${m.id}@local`, `DTSTAMP:${stamp}`, `DTSTART:${start}T${state.profile.times[m.id].replace(':', '')}00`, 'DURATION:PT20M', 'RRULE:FREQ=DAILY', `SUMMARY:${m.name}时间到了 · 食刻`, 'DESCRIPTION:打开食刻查看建议；实际菜单及过敏原请核对标签。', 'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:PT0S', `DESCRIPTION:${m.name}提醒`, 'END:VALARM', 'END:VEVENT');
    });
    state.profile.events.forEach((e, index) => lines.push('BEGIN:VEVENT', `UID:nutriday-event-${index}-${e.date}@local`, `DTSTAMP:${stamp}`, `DTSTART:${e.date.replace(/-/g, '')}T080000`, 'DURATION:PT30M', `SUMMARY:${e.type}安排 · 食刻`, 'DESCRIPTION:打开食刻查看当天推荐。', 'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:PT0S', `DESCRIPTION:${e.type}安排提醒`, 'END:VALARM', 'END:VEVENT'));
    lines.push('END:VCALENDAR');
    const encoder = new TextEncoder();
    const fold = line => {
      let result = '', bytes = 0;
      for (const char of line) {
        const size = encoder.encode(char).length;
        if (bytes + size > 73) { result += '\r\n '; bytes = 1; }
        result += char; bytes += size;
      }
      return result;
    };
    return lines.map(fold).join('\r\n') + '\r\n';
  }
  function download(name, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a'); link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  document.addEventListener('submit', event => {
    if (event.target.id === 'profile-form') {
      event.preventDefault();
      const data = new FormData(event.target);
      const profile = cleanProfile({ ...state.profile, onboarded: state.profile.onboarded, preferences: data.getAll('preferences'), allergies: data.getAll('allergies'), avoid: data.getAll('avoid'), budget: Number(data.get('budget')), goal: data.get('goal'), schedule: data.getAll('schedule'), times: Object.fromEntries(C.MEALS.map(m => [m.id, data.get(`time-${m.id}`)])) });
      state.profile = profile; state.modal = null; state.tab = 'today'; ensurePlan(true); save(); notify('画像已更新。');
    } else if (event.target.id === 'log-form') {
      event.preventDefault();
      const meal = state.modalMeal, dish = C.mealById(state.modalDishId) || loggedToday()[meal];
      if (!dish) return;
      const portion = Number(new FormData(event.target).get('portion'));
      state.logs[today()] ||= {};
      state.logs[today()][meal] = { dishId: dish.id || dish.dishId, name: dish.name, price: dish.price, nutrition: { ...dish.nutrition }, portion, at: Date.now() };
      state.modal = null; save(); notify('这餐已记录，可随时编辑或删除。');
    } else if (event.target.id === 'event-form') {
      event.preventDefault();
      const data = new FormData(event.target), date = String(data.get('date')), type = String(data.get('type'));
      if (date < today() || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !['考试', '训练'].includes(type)) return;
      if (!state.profile.events.some(e => e.date === date && e.type === type)) state.profile.events.push({ date, type });
      ensurePlan(true); save(); notify('特别安排已加入日历。');
    } else if (event.target.id === 'chat-form') {
      event.preventDefault(); const text = ui.draft.trim(); if (!text || ui.pending) return;
      ui.messages.push({ self: true, text }); ui.pending = parseIntent(text); ui.draft = '';
      if (!ui.pending) ui.messages.push({ self: false, text: '这句我没太懂，试试在“我的”里修改画像。' });
      render();
    }
  });
  document.addEventListener('input', event => {
    if (event.target.id === 'chat-input') ui.draft = event.target.value;
  });
  document.addEventListener('click', event => {
    const nav = event.target.closest('[data-nav]');
    if (nav) { state.tab = nav.dataset.nav; state.detail = ''; state.chatOpen = false; render(); return; }
    const button = event.target.closest('[data-act]'); if (!button) return;
    const action = button.dataset.act;
    if (action === 'open-chat') { state.chatOpen = true; render(); return; }
    if (action === 'back-chat') { state.chatOpen = false; render(); return; }
    if (action === 'chat-prompt') {
      if (ui.pending) return;
      const prompt = button.dataset.value;
      ui.messages.push({ self: true, text: prompt });
      ui.pending = parseIntent(prompt);
      render(); return;
    }
    if (action === 'taste') { state.profile.taste = button.dataset.value; state.profile.preferences = button.dataset.value === '清淡' ? ['清淡'] : []; render(); return; }
    if (action === 'budget') { state.profile.budget = Number(button.dataset.value); render(); return; }
    if (action === 'allergy-none') { state.profile.allergies = []; state.profile.avoid = []; render(); return; }
    if (action === 'save-welcome') { state.profile.onboarded = true; ensurePlan(true); save(); render(); return; }
    if (action === 'detail') { state.detail = button.dataset.id; render(); return; }
    if (action === 'back-detail') { state.detail = ''; render(); return; }
    if (action === 'backdrop' && event.target !== button) return;
    if (action === 'close' || action === 'backdrop') { state.modal = null; render(); return; }
    if (action === 'edit-profile') { state.modal = 'profile'; render(); return; }
    if (action === 'filter') { state.filter = button.dataset.value; save(); render(); return; }
    if (action === 'swap') {
      const meal = button.dataset.meal, choices = C.rankedForMeal(meal, state.profile);
      if (choices.length < 2) { notify('当前可选项不足两道。'); return; }
      const index = choices.findIndex(d => d.id === state.plan[meal]);
      state.plan[meal] = choices[(index + 1) % choices.length].id; if (state.detail) state.detail = state.plan[meal]; save(); notify('已换一道'); return;
    }
    if (action === 'choose') { const dish = C.mealById(button.dataset.id); if (dish && C.eligibleDish(dish, state.profile).ok) { state.plan[dish.meal] = dish.id; state.tab = 'today'; state.detail = ''; save(); notify('已加入今日三餐'); } return; }
    if (action === 'log') { state.modal = 'log'; state.modalMeal = button.dataset.meal; state.modalDishId = loggedToday()[state.modalMeal]?.dishId || state.plan[state.modalMeal]; render(); return; }
    if (action === 'remove-log') { delete state.logs[today()]?.[state.modalMeal]; state.modal = null; save(); notify('已删除这餐记录。'); return; }
    if (action === 'subscription') { state.subscription = !state.subscription; save(); notify(state.subscription ? '每周规划已开启，演示版不会收费。' : '每周规划已关闭。'); return; }
    if (action === 'remove-event') { state.profile.events = state.profile.events.filter(e => !(e.date === button.dataset.date && e.type === button.dataset.type)); ensurePlan(true); save(); notify('特别安排已删除。'); return; }
    if (action === 'calendar-download') { download('食刻-三餐提醒.ics', calendarText(), 'text/calendar;charset=utf-8'); notify('日历文件已生成，请在日历应用中确认导入。'); return; }
    if (action === 'export') { download(`Nutriday-个人数据-${today()}.json`, JSON.stringify({ format: 'nutriday-proposal-v2', exportedAt: new Date().toISOString(), profile: state.profile, logs: state.logs, subscription: state.subscription }, null, 2), 'application/json'); notify('个人数据已导出，请注意文件中包含健康自述。'); return; }
    if (action === 'reset') { state.modal = 'reset'; render(); return; }
    if (action === 'confirm-reset') { localStorage.removeItem(STORE); state = fresh(); ui.messages = []; ui.pending = null; ui.draft = ''; render(); return; }
    if (action.startsWith('clear-')) {
      const field = action.slice(6);
      if (field === 'logs') state.logs = {};
      else if (field === 'events') state.profile.events = [];
      else if (field === 'allergies') state.profile.allergies = [];
      else if (field === 'avoid') state.profile.avoid = [];
      ensurePlan(true); save(); notify('该项本机数据已清除。'); return;
    }
    if (action === 'chat-cancel') { ui.pending = null; ui.messages.push({ self: false, text: '已取消，方案没有改变。' }); render(); return; }
    if (action === 'chat-confirm' && ui.pending) {
      const intent = ui.pending;
      if (intent.type === 'budget') state.profile.budget = intent.value;
      if (intent.type === 'avoid' && !state.profile.avoid.includes(intent.value)) state.profile.avoid.push(intent.value);
      if (intent.type === 'schedule' && !state.profile.events.some(e => e.date === today() && e.type === intent.value)) state.profile.events.push({ date: today(), type: intent.value });
      ui.pending = null; ui.messages.push({ self: false, text: `${intent.label}，已重新计算。` }); ensurePlan(true); save(); render(); return;
    }
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && state.modal) { state.modal = null; render(); } });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { ensurePlan(); render(); } });
  load(); render();
})();
