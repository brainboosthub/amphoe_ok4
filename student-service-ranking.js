(() => {
  'use strict';

  // Web App เดิมของระบบหลัก (ไม่ต้องสร้าง Apps Script แยก)
  const STUDENT_SERVICE_API_URL =
    'https://script.google.com/macros/s/AKfycbzq9SWm2mEBe_gsusJKNEj7hlORO29BejRrOI7CoapwBj145UCyUBccmzdv4pzLAHlW/exec';

  const LEVELS = ['ประถม', 'ม.ต้น', 'ม.ปลาย'];
  const MEDALS = ['🥇', '🥈', '🥉'];
  const CACHE_KEY = 'studentServiceTop3:v1';
  const CACHE_AGE = 5 * 60 * 1000;
  let rankingData = null;

  const escapeHtml = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function readCache() {
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
      return cached && Date.now() - cached.savedAt < CACHE_AGE
        ? cached.data
        : null;
    } catch (_) {
      return null;
    }
  }

  function writeCache(data) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data }));
    } catch (_) {}
  }

  function renderCard(card, level) {
    const type = card.dataset.rankingType;
    const ranking = card.querySelector('.student-service-ranking');
    const rows = rankingData && rankingData[type] && Array.isArray(rankingData[type][level])
      ? rankingData[type][level].slice(0, 3)
      : [];

    card.querySelectorAll('.student-service-tabs button').forEach(button => {
      const active = button.dataset.level === level;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });

    if (!rows.length) {
      ranking.innerHTML = '<span class="student-service-ranking-status">ยังไม่มีข้อมูล</span>';
      return;
    }

    ranking.innerHTML = rows.map((row, index) => `
      <span title="${escapeHtml(row.teacher)}">
        ${MEDALS[index]} ${escapeHtml(row.teacher)}
      </span>
      <b title="${escapeHtml(row.district)}">
        ${escapeHtml(row.district || '-')}
      </b>
    `).join('');
  }

  function renderAll() {
    document.querySelectorAll('[data-ranking-type]').forEach(card => {
      const active = card.querySelector('.student-service-tabs .is-active');
      renderCard(card, active ? active.dataset.level : LEVELS[0]);
    });
  }

  function showError(message) {
    document.querySelectorAll('[data-ranking-type] .student-service-ranking').forEach(box => {
      box.innerHTML = `<span class="student-service-ranking-status">${escapeHtml(message)}</span>`;
    });
  }

  async function loadRankings() {
    rankingData = readCache();
    if (rankingData) {
      renderAll();
      return;
    }

    if (!/^https:\/\/script\.google\.com\/macros\/s\//.test(STUDENT_SERVICE_API_URL)) {
      showError('กรุณาตั้งค่า URL Apps Script');
      return;
    }

    try {
      const separator = STUDENT_SERVICE_API_URL.includes('?') ? '&' : '?';
      const response = await fetch(
        `${STUDENT_SERVICE_API_URL}${separator}mode=studentServiceTop3&_t=${Date.now()}`,
        { method: 'GET', cache: 'no-store' }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (!result || (!result.worksheet && !result.quiz)) {
        throw new Error('รูปแบบข้อมูลไม่ถูกต้อง');
      }

      rankingData = result;
      writeCache(result);
      renderAll();
    } catch (error) {
      console.error('Student service ranking:', error);
      showError('โหลดอันดับไม่สำเร็จ');
    }
  }

  document.addEventListener('click', event => {
    const tab = event.target.closest('.student-service-tabs button');
    if (!tab) return;
    const card = tab.closest('[data-ranking-type]');
    if (card && rankingData) renderCard(card, tab.dataset.level);
  });

  document.addEventListener('DOMContentLoaded', loadRankings);
})();
