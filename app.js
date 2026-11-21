document.addEventListener('DOMContentLoaded', () => {
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---- часы в HUD ---- */
  const clock = $('#clock');
  if (clock) {
    const tick = () => {
      const d = new Date();
      clock.textContent = [d.getHours(), d.getMinutes(), d.getSeconds()]
        .map(n => String(n).padStart(2, '0')).join(':');
    };
    tick(); setInterval(tick, 1000);
  }

  /* ---- scramble-декодирование заголовков ---- */
  const CHARS = '!<>-_/[]{}=+*^?#01AZ$%&';
  function scramble(el, dur = 1100) {
    const final = el.dataset.text || el.textContent;
    if (REDUCED) { el.textContent = final; return; }
    const start = performance.now();
    (function frame(now) {
      const p = Math.min(1, (now - start) / dur);
      const reveal = Math.floor(p * final.length);
      let out = '';
      for (let i = 0; i < final.length; i++) {
        out += i < reveal ? final[i]
          : (final[i] === ' ' ? ' ' : CHARS[(Math.random() * CHARS.length) | 0]);
      }
      el.textContent = out;
      p < 1 ? requestAnimationFrame(frame) : el.textContent = final;
    })(start);
  }
  $$('[data-scramble]').forEach((el, i) => setTimeout(() => scramble(el), 150 + i * 250));

  /* ---- счётчики ---- */
  function runCounter(el) {
    const target = parseFloat(el.dataset.count);
    const dec = +(el.dataset.decimals || 0);
    const suffix = el.dataset.suffix || '';
    if (REDUCED) { el.textContent = target.toLocaleString('ru-RU', { minimumFractionDigits: dec }) + suffix; return; }
    const start = performance.now(), dur = 1500;
    (function frame(now) {
      const p = Math.min(1, (now - start) / dur);
      const v = target * (1 - Math.pow(1 - p, 3));
      el.textContent = v.toLocaleString('ru-RU', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suffix;
      if (p < 1) requestAnimationFrame(frame);
    })(start);
  }

  /* ---- появление секций, полос, счётчиков ---- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in-view');
      $$('[data-count]', e.target).forEach(runCounter);
      $$('[data-fill]', e.target).forEach(b => b.querySelector('i').style.width = b.dataset.fill + '%');
      io.unobserve(e.target);
    });
  }, { threshold: .2 });
  $$('.reveal, .stats-band, table, .modes-grid, .matches-grid, .hero-stats').forEach(el => io.observe(el));

  /* ---- курсор-свечение ---- */
  const glow = $('#glow');
  if (glow && !REDUCED && matchMedia('(pointer:fine)').matches) {
    let gx = innerWidth / 2, gy = innerHeight / 3, tx = gx, ty = gy;
    addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; });
    (function loop() {
      gx += (tx - gx) * .08; gy += (ty - gy) * .08;
      glow.style.transform = `translate(${gx - 280}px, ${gy - 280}px)`;
      requestAnimationFrame(loop);
    })();
  } else if (glow) glow.remove();

  /* ---- мобильное меню ---- */
  const burger = $('#burger'), nav = $('#nav');
  if (burger) burger.addEventListener('click', () => nav.classList.toggle('open'));

  /* ================= ФОРМЫ (регистрация / вход) ================= */
  const form = $('#auth-form');
  if (form) {
    // показать/скрыть пароль
    $$('.pw-toggle').forEach(btn => btn.addEventListener('click', () => {
      const inp = btn.parentElement.querySelector('input');
      const show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      btn.textContent = show ? 'HIDE' : 'SHOW';
      inp.focus();
    }));

    // индикатор надёжности пароля
    const pw = $('#reg-pass'), meter = $('#strength');
    if (pw && meter) pw.addEventListener('input', () => {
      const v = pw.value;
      let s = 0;
      if (v.length >= 8) s++;
      if (/[A-ZА-ЯЁ]/.test(v)) s++;
      if (/\d/.test(v)) s++;
      if (/[^A-Za-zА-Яа-яЁё0-9]/.test(v)) s++;
      if (v.length === 0) s = 0;
      meter.className = 'strength s' + s;
    });

    // проверка имени (демо)
    const nick = $('#reg-nick'), nickHint = $('#nick-hint');
    const TAKEN = ['admin', 'neoncore', 'moderator', 'support', 'root'];
    let t;
    if (nick) nick.addEventListener('input', () => {
      clearTimeout(t);
      const v = nick.value.trim().toLowerCase();
      if (!v) { nickHint.textContent = ''; nickHint.className = 'hint'; return; }
      nickHint.textContent = '> проверка имени...'; nickHint.className = 'hint';
      t = setTimeout(() => {
        if (v.length < 3) { nickHint.textContent = '> ошибка: минимум 3 символа'; nickHint.className = 'hint err'; }
        else if (TAKEN.includes(v)) { nickHint.textContent = '> имя уже занято'; nickHint.className = 'hint err'; }
        else { nickHint.textContent = '> имя свободно ✓'; nickHint.className = 'hint ok'; }
      }, 550);
    });

    // boot-последовательность при отправке
    const boot = $('#boot');
    function runBoot(mode, name) {
      if (!boot) return;
      const linesEl = $('.boot-lines', boot);
      const finalEl = $('.boot-final', boot);
      const nameEl  = $('.boot-name', boot);
      const barEl   = $('.boot-bar i', boot);
      linesEl.innerHTML = ''; finalEl.textContent = ''; nameEl.textContent = '';
      barEl.style.transition = 'none'; barEl.style.width = '0';
      boot.classList.add('show');
      const lines = [
        '> установка соединения с сервером NEONCORE...',
        '> handshake: OK [24ms]',
        '> шифрование канала: AES-256 ... OK',
        mode === 'register' ? '> запись профиля в реестр платформы... OK' : '> сверка ключей доступа... OK'
      ];
      const step = REDUCED ? 60 : 420;
      lines.forEach((l, i) => setTimeout(() => {
        const d = document.createElement('div'); d.textContent = l; linesEl.appendChild(d);
        barEl.style.transition = `width ${step * (i + 1)}ms linear`;
        requestAnimationFrame(() => barEl.style.width = ((i + 1) / lines.length) * 100 + '%');
      }, step * i));
      setTimeout(() => {
        if (mode === 'register') {
          finalEl.textContent = 'АККАУНТ СОЗДАН';
          nameEl.textContent = `Добро пожаловать на платформу, ${name || 'коллега'}.`;
        } else {
          finalEl.textContent = 'ДОСТУП РАЗРЕШЁН';
          nameEl.textContent = `С возвращением, ${name || 'коллега'}.`;
        }
        scramble(finalEl, 700);
      }, step * lines.length + 250);
      setTimeout(() => boot.classList.remove('show'), step * lines.length + 2400);
    }

    // отправка
    form.addEventListener('submit', e => {
      e.preventDefault();
      form.classList.remove('shake');
      let valid = true;
      $$('.field', form).forEach(f => f.classList.remove('invalid'));
      $$('input[required], select[required]', form).forEach(inp => {
        const bad = !inp.value.trim() ||
          (inp.type === 'email' && !/^\S+@\S+\.\S+$/.test(inp.value));
        if (bad) { valid = false; inp.closest('.field').classList.add('invalid'); }
      });
      const rep = $('#reg-pass2');
      if (rep && pw && rep.value !== pw.value) {
        valid = false; rep.closest('.field').classList.add('invalid');
      }
      const terms = $('#terms');
      if (terms && !terms.checked) { valid = false; terms.closest('.check-row').classList.add('invalid'); }
      if (!valid) {
        void form.offsetWidth;
        form.classList.add('shake');
        return;
      }
      runBoot(form.dataset.mode, nick ? nick.value.trim() : (form.querySelector('#login-id')?.value.trim().split('@')[0]));
      form.reset();
      if (meter) meter.className = 'strength';
      if (nickHint) nickHint.textContent = '';
    });
  }
});