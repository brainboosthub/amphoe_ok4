(() => {
  'use strict';

const WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbxrisIGnewRP8cqrj_-Imv3KtkrXFu-cdUPHN2bqoYVpyJZaV1_K3U6d9o15uc6NBcJlw/exec';

  const MAX_ITEMS = 20; //แสดงจำกัดจำนวน
  const $ = id => document.getElementById(id);

const esc = value =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const num = value => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  const formatNumber = value =>
    num(value).toLocaleString('th-TH');


  /* ============================
     รับข้อมูลจาก Apps Script
  ============================ */

  window.receiveLearningAreas = function(result) {

    clearTimeout(window.lsbLoadTimer);

    const grid = $('lsbAreaGrid');

    if (!grid) return;

    if (!result || result.success !== true) {

      console.error(
        'Learning areas:',
        result
      );

      grid.innerHTML = `
        <div class="lsb-loading">
          ไม่สามารถโหลดข้อมูลได้
        </div>
      `;

      return;
    }


    const areas =
      Array.isArray(result.areas)
        ? result.areas
        : [];


    if (!areas.length) {

      grid.innerHTML = `
        <div class="lsb-loading">
          ยังไม่มีรายการแหล่งเรียนรู้
        </div>
      `;

      return;
    }


    /* แสดงสูงสุด 9 รายการแรก */

    const displayAreas =
      areas.slice(0, MAX_ITEMS);


    grid.innerHTML =
      displayAreas
        .map(area => areaCard(area))
        .join('');


    /* เปิดรายการแหล่งเรียนรู้ของตำบลที่เลือก */

    const openArea = card => {
      const areaName = card.dataset.areaName;

      if (!areaName) return;

      const url = new URL(
        'learning.html',
        window.location.href
      );

      // ไม่ส่ง Spreadsheet ID ไปใน URL
      // learning.html จะค้นหา ID จากชื่อตำบลภายในระบบ
      url.searchParams.set('area', areaName);

      window.open(
        url.href,
        '_blank',
        'noopener,noreferrer'
      );
    };

    grid
      .querySelectorAll('[data-area-sheet]')
      .forEach(card => {
        card.addEventListener('click', () => openArea(card));

        card.addEventListener('keydown', event => {
          if (event.key !== 'Enter' && event.key !== ' ') return;

          event.preventDefault();
          openArea(card);
        });

      });

  };


  /* ============================
     สร้างการ์ดตำบล
  ============================ */

function areaCard(area) {

  const name =
    area.name || '-';

  const spreadsheetId =
    area.spreadsheetId || '';

  const mapImage =
    area.mapImage || '';

  const sourceCount =
    num(area.sourceCount);


  return `
    <article
      class="lsb-area-card"
      data-area-sheet="${esc(spreadsheetId)}"
      data-area-name="${esc(name)}"
      tabindex="0"
      role="button"
    >

      <div class="lsb-area-image">

        ${
          mapImage
            ? `
              <img
                src="${esc(mapImage)}"
                alt="${esc(name)}"
                loading="lazy"
              >
            `
            : `
              <div class="lsb-no-map">
                ไม่มีภาพแผนที่
              </div>
            `
        }

      </div>

      <div class="lsb-area-info">

        <h3>
          ${esc(name)}
        </h3>

        <div class="lsb-area-stat">
          จำนวนแหล่งเรียนรู้
          <strong>
            ${formatNumber(sourceCount)}
          </strong>
        </div>

      </div>

    </article>
  `;
}


  /* ============================
     โหลดข้อมูล
  ============================ */

  function loadLearningAreas() {

    const grid =
      $('lsbAreaGrid');

    if (!grid) {
      console.error(
        'ไม่พบ element #lsbAreaGrid'
      );
      return;
    }


    document
      .getElementById('lsbAreaJsonp')
      ?.remove();


    clearTimeout(
      window.lsbLoadTimer
    );


    window.lsbLoadTimer =
      setTimeout(() => {

        grid.innerHTML = `
          <div class="lsb-loading">
            หมดเวลารอข้อมูล
          </div>
        `;

      }, 30000);


    const script =
      document.createElement('script');


    script.id =
      'lsbAreaJsonp';

    script.async = true;


    script.src =
      WEB_APP_URL +
      '?mode=learningAreas' +
      '&callback=window.receiveLearningAreas' +
      '&_=' +
      Date.now();


    console.log(
      'Learning Areas URL:',
      script.src
    );


    script.onerror = () => {

      clearTimeout(
        window.lsbLoadTimer
      );

      console.error(
        'โหลด Learning Areas API ไม่สำเร็จ:',
        script.src
      );

      grid.innerHTML = `
        <div class="lsb-loading">
          ไม่สามารถเชื่อมต่อข้อมูลได้
        </div>
      `;

      script.remove();

    };


    document.body.appendChild(script);
  }


  if (document.readyState === 'loading') {

    document.addEventListener(
      'DOMContentLoaded',
      loadLearningAreas
    );

  } else {

    loadLearningAreas();

  }

})();
