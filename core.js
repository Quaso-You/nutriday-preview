/* Nutriday prototype rules. The bundled menu is illustrative, not a real campus menu. */
(function (root) {
  'use strict';

  const MEALS = [
    { id: 'breakfast', name: '早餐', time: '08:00' },
    { id: 'lunch', name: '午餐', time: '12:00' },
    { id: 'dinner', name: '晚餐', time: '18:00' }
  ];
  const ALLERGIES = ['牛奶', '鸡蛋', '花生', '坚果', '大豆', '小麦', '鱼类', '甲壳类海鲜'];
  const AVOIDS = ['葱', '姜', '蒜', '辣'];
  const PREFERENCES = ['清淡', '高蛋白', '素食'];
  const GOALS = ['均衡饮食', '运动补给', '控制预算'];
  const SCHEDULES = ['早八', '训练', '晚自习'];
  const METRICS = ['kcal', 'protein', 'fat', 'carb', 'fiber'];

  const sample = (id, source, venue, meal, name, price, ingredients, allergens, tags, nutrition, known = true) => ({
    id, source, venue, meal, name, price, ingredients, allergens, tags,
    nutrition: { kcal: nutrition[0], protein: nutrition[1], fat: nutrition[2], carb: nutrition[3], fiber: nutrition[4] },
    ingredientsComplete: known, allergensComplete: known, availableToday: true,
    nutritionSource: '演示估算', dataStatus: '演示菜单'
  });
  const SAMPLE_MENU = [
    sample('b1', '食堂', '校内食堂（示例）', 'breakfast', '香菇菜包＋豆浆', 8, ['香菇', '小麦', '大豆'], ['小麦', '大豆'], ['清淡', '素食'], [340, 18, 8, 53, 8]),
    sample('b2', '全家便当', '校内全家（示例）', 'breakfast', '鸡蛋饭团', 12, ['米饭', '鸡蛋', '海苔'], ['鸡蛋'], ['高蛋白'], [390, 17, 10, 58, 3]),
    sample('b3', '食堂', '食堂 B（示例）', 'breakfast', '鸡肉全麦三明治', 16, ['鸡肉', '小麦', '鸡蛋', '牛奶'], ['小麦', '鸡蛋', '牛奶'], ['高蛋白'], [430, 25, 12, 53, 4]),
    sample('l1', '食堂', '食堂 A（示例）', 'lunch', '番茄豆腐杂粮饭', 18, ['番茄', '豆腐', '大豆', '糙米', '葱'], ['大豆'], ['素食', '清淡'], [560, 24, 15, 80, 9]),
    sample('l2', '食堂', '校内食堂（示例）', 'lunch', '鸡肉杂粮饭', 26, ['鸡胸肉', '西兰花', '胡萝卜', '杂粮饭', '姜', '蒜'], [], ['高蛋白', '清淡'], [560, 32, 17, 70, 8]),
    sample('l3', '全家便当', '校内全家（示例）', 'lunch', '牛肉便当', 25, ['牛肉', '米饭', '酱料'], [], ['高蛋白'], [650, 30, 20, 83, 4], false),
    sample('d1', '食堂', '校内食堂（示例）', 'dinner', '番茄豆腐饭', 16, ['番茄', '豆腐', '大豆', '青菜', '米饭'], ['大豆'], ['素食', '清淡'], [520, 28, 14, 75, 10]),
    sample('d2', '食堂', '食堂 B（示例）', 'dinner', '清蒸鱼双蔬饭', 26, ['鱼类', '青菜', '胡萝卜', '米饭', '姜'], ['鱼类'], ['高蛋白', '清淡'], [570, 35, 16, 70, 7]),
    sample('d3', '全家便当', '校内全家（示例）', 'dinner', '鸡肉杂粮便当', 22, ['鸡肉', '杂粮', '蔬菜', '酱料'], [], ['高蛋白'], [590, 31, 18, 74, 5], false)
  ];

  function dayKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  function zeroNutrition() { return { kcal: 0, protein: 0, fat: 0, carb: 0, fiber: 0 }; }
  function addNutrition(acc, nutrition, factor = 1) {
    for (const key of METRICS) acc[key] += Math.round((nutrition[key] || 0) * factor * 10) / 10;
    return acc;
  }
  function mealById(id, menu = SAMPLE_MENU) { return menu.find(d => d.id === id) || null; }
  function activeSchedule(profile, date = dayKey()) {
    const scheduled = profile.events?.filter(e => e.date === date).map(e => e.type) || [];
    return [...new Set([...(profile.schedule || []), ...scheduled])];
  }
  function eligibleDish(dish, profile) {
    if (!dish.availableToday) return { ok: false, reason: 'supply' };
    const restrictions = [...(profile.allergies || []), ...(profile.avoid || [])];
    if (restrictions.length && (!dish.ingredientsComplete || !dish.allergensComplete)) return { ok: false, reason: 'unknown' };
    if (restrictions.some(item => dish.allergens.includes(item) || dish.ingredients.some(ingredient => ingredient.includes(item)) || (item === '辣' && dish.tags.includes('辣')))) return { ok: false, reason: 'restriction' };
    if (profile.preferences?.includes('素食') && !dish.tags.includes('素食')) return { ok: false, reason: 'restriction' };
    if (dish.price > profile.budget) return { ok: false, reason: 'budget' };
    return { ok: true, reason: '' };
  }
  function filterMenu(profile, menu = SAMPLE_MENU) {
    const counts = { supply: 0, unknown: 0, restriction: 0, budget: 0 };
    const available = [];
    for (const dish of menu) {
      const result = eligibleDish(dish, profile);
      if (result.ok) available.push(dish); else counts[result.reason]++;
    }
    return { available, counts };
  }
  function scoreDish(dish, profile, before, date = dayKey()) {
    let score = 0;
    const schedule = activeSchedule(profile, date);
    for (const tag of profile.preferences || []) if (dish.tags.includes(tag)) score += 12;
    if (profile.goal === '运动补给') score += dish.nutrition.protein * 0.8;
    else if (profile.goal === '控制预算') score += (profile.budget - dish.price) * 1.4;
    else score += dish.nutrition.fiber * 1.2 + dish.nutrition.protein * 0.25;
    if (schedule.includes('训练')) score += dish.nutrition.protein * 0.25;
    if (schedule.includes('早八') && dish.meal === 'breakfast') score += dish.source === '全家便当' ? 3 : 1;
    if (schedule.includes('考试')) score += dish.tags.includes('清淡') ? 9 : 0;
    if (before.protein < 35 && dish.meal === 'dinner') score += dish.nutrition.protein * 0.4;
    score -= Math.max(0, dish.price - profile.budget * 0.8) * 0.3;
    return score;
  }
  function rankedForMeal(meal, profile, before = zeroNutrition(), menu = SAMPLE_MENU, date = dayKey()) {
    return filterMenu(profile, menu).available.filter(d => d.meal === meal)
      .sort((a, b) => scoreDish(b, profile, before, date) - scoreDish(a, profile, before, date) || a.id.localeCompare(b.id));
  }
  function buildPlan(profile, menu = SAMPLE_MENU, date = dayKey()) {
    const plan = {}, before = zeroNutrition();
    for (const meal of MEALS) {
      const chosen = rankedForMeal(meal.id, profile, before, menu, date)[0];
      plan[meal.id] = chosen?.id || null;
      if (chosen) addNutrition(before, chosen.nutrition);
    }
    return plan;
  }
  function planTotals(plan, menu = SAMPLE_MENU) {
    const nutrition = zeroNutrition(); let price = 0, count = 0;
    for (const meal of MEALS) {
      const dish = mealById(plan[meal.id], menu);
      if (!dish) continue;
      addNutrition(nutrition, dish.nutrition); price += dish.price; count++;
    }
    return { ...nutrition, price, count };
  }
  function logTotals(dayLogs) {
    const nutrition = zeroNutrition(); let price = 0, count = 0;
    for (const meal of MEALS) {
      const entry = dayLogs?.[meal.id];
      if (!entry) continue;
      addNutrition(nutrition, entry.nutrition, entry.portion || 1);
      price += entry.price * (entry.portion || 1); count++;
    }
    return { ...nutrition, price: Math.round(price * 10) / 10, count, complete: count === 3 };
  }
  function weekDays(today = new Date()) {
    const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    base.setDate(base.getDate() - (base.getDay() + 6) % 7);
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(base); d.setDate(base.getDate() + i); return dayKey(d); });
  }
  function weeklyReport(logs, profile, today = new Date()) {
    const week = weekDays(today);
    const days = week.filter(key => key <= dayKey(today));
    let meals = 0, loggedDays = 0, completeDays = 0, withinBudget = 0;
    const fullNutrition = zeroNutrition();
    for (const key of days) {
      const entries = logs[key] || {}, totals = logTotals(entries);
      meals += totals.count;
      if (totals.count) loggedDays++;
      if (totals.complete) { completeDays++; addNutrition(fullNutrition, totals); }
      for (const meal of MEALS) if (entries[meal.id] && entries[meal.id].price * (entries[meal.id].portion || 1) <= profile.budget) withinBudget++;
    }
    const average = completeDays ? Object.fromEntries(METRICS.map(k => [k, Math.round(fullNutrition[k] / completeDays)])) : null;
    return { days: week, meals, loggedDays, completeDays, withinBudget, average, missing: days.length * 3 - meals };
  }
  function nextWeekSuggestions(report, profile) {
    if (!report.completeDays) return ['先自愿记录一天完整三餐，下周建议才有足够依据。'];
    const suggestions = [];
    if (report.average.protein < 65) suggestions.push('下周优先比较含豆制品、蛋或瘦肉的餐食，并核对过敏信息。');
    if (report.average.fiber < 20) suggestions.push('下周可在可选菜品中增加蔬菜和杂粮。');
    if (report.withinBudget < report.meals) suggestions.push(`已有餐次超过每餐 ¥${profile.budget}，下周优先展示预算内选项。`);
    if (!suggestions.length) suggestions.push('保持目前的选餐节奏；继续观察偏好和预算是否需要调整。');
    return suggestions;
  }

  const api = { MEALS, ALLERGIES, AVOIDS, PREFERENCES, GOALS, SCHEDULES, SAMPLE_MENU, METRICS,
    dayKey, zeroNutrition, addNutrition, mealById, activeSchedule, eligibleDish, filterMenu,
    scoreDish, rankedForMeal, buildPlan, planTotals, logTotals, weekDays, weeklyReport, nextWeekSuggestions };
  root.NutridayCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
