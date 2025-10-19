/* script.js
   Interacciones y simulaciones con fallback cuando GSAP no está disponible
   -> Corregido: no abortar si faltan elementos en el DOM; crear placeholders seguros.
*/

(function(){
  // Helpers para tolerar ausencia de GSAP
  const hasGSAP = typeof window.gsap !== 'undefined';
  function safeTo(target, opts = {}) {
    try {
      if (hasGSAP) {
        window.gsap.to(target, opts);
        return;
      }
      // Fallback simple: animar transform/opacity/rotation usando style + transition
      const el = (typeof target === 'string') ? document.querySelector(target) : target;
      if (!el) return;
      const dur = (opts.duration || 0.6) + 's';
      el.style.transition = `all ${dur} ${opts.ease || 'ease'}`;
      // manejar transform passthrough (nx: opts.x/y or opts.attr.transform)
      if (opts.x !== undefined || opts.y !== undefined) {
        const x = opts.x || 0;
        const y = opts.y || 0;
        el.style.transform = `translate(${x}px, ${y}px)`;
      }
      if (opts.attr && opts.attr.transform) {
        // intentar aplicar transform directo en style para svg/elementos
        try { el.style.transform = opts.attr.transform; } catch(e) {}
      }
      if (opts.rotation !== undefined) {
        el.style.transform = (el.style.transform || '') + ` rotate(${opts.rotation}deg)`;
      }
      if (opts.opacity !== undefined) el.style.opacity = opts.opacity;
      if (opts.attr && opts.attr.rx !== undefined) el.setAttribute && el.setAttribute('rx', opts.attr.rx);
      if (opts.attr && opts.attr.ry !== undefined) el.setAttribute && el.setAttribute('ry', opts.attr.ry);
    } catch (err) {
      console.warn('safeTo fallback error', err);
    }
  }

  // --------- Utilidades para garantizar elementos ---------
  function ensureElement(id, tag = 'div', opts = {}) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement(tag);
      el.id = id;
      // aplicar atributos específicos si se piden
      if (opts.type) el.type = opts.type;
      if (opts.min !== undefined) el.min = opts.min;
      if (opts.max !== undefined) el.max = opts.max;
      if (opts.value !== undefined) el.value = opts.value;
      // oculto por defecto para placeholders
      el.style.display = opts.show ? '' : 'none';
      document.body.appendChild(el);
      console.warn(`Placeholder creado para #${id}`);
    }
    return el;
  }

  // Asegura y devuelve <audio id="ambientAudio"> (usa Alone.mp3)
  function ensureAmbientAudio() {
    let audio = document.getElementById('ambientAudio');
    if (!audio) {
      audio = document.createElement('audio');
      audio.id = 'ambientAudio';
      audio.loop = true;
      audio.preload = 'auto';
      audio.src = 'Alone.mp3'; // colocar Alone.mp3 en /workspaces/EFECTO_MEISSNER/
      audio.style.display = 'none';

      // Eventos para debugging
      audio.addEventListener('error', (ev) => {
        console.error('ERROR audio element:', audio.error, ev);
      });
      audio.addEventListener('stalled', () => console.warn('audio stalled'));
      audio.addEventListener('suspend', () => console.warn('audio suspend'));
      audio.addEventListener('canplay', () => console.info('audio canplay'));
      audio.addEventListener('canplaythrough', () => console.info('audio canplaythrough'));
      audio.addEventListener('play', () => console.info('audio play event fired'));
      audio.addEventListener('pause', () => console.info('audio pause event fired'));

      document.body.appendChild(audio);
      console.info('ambientAudio creado dinámicamente (Alone.mp3)');
    } else {
      // si ya existe, asegurar listeners para debugging
      if (!audio._debugListened) {
        audio.addEventListener('error', (ev) => console.error('ERROR audio element:', audio.error, ev));
        audio.addEventListener('canplaythrough', () => console.info('audio canplaythrough'));
        audio._debugListened = true;
      }
    }
    return audio;
  }

  // Crea un botón de reproducción visible si no existe en el DOM
  function ensurePlayButton() {
    let btn = document.getElementById('playAudio');
    if (!btn) {
      // buscar contenedor nav-actions o crear uno
      let navActions = document.querySelector('.nav-actions');
      if (!navActions) {
        navActions = document.createElement('div');
        navActions.className = 'nav-actions';
        document.querySelector('nav')?.appendChild(navActions);
      }
      btn = document.createElement('button');
      btn.id = 'playAudio';
      btn.type = 'button';
      btn.className = 'btn ghost';
      btn.setAttribute('aria-pressed', 'false');
      btn.textContent = '🔊 Sonido ambiental';
      navActions.appendChild(btn);
      console.info('Botón playAudio creado automáticamente');
    }
    return btn;
  }

  // Comprueba la disponibilidad del archivo Alone.mp3 (fetch) — tolerante a file://
  async function checkAudioFile() {
    const url = 'Alone.mp3';
    try {
      // HEAD puede fallar en file://, intentar GET pequeño
      const res = await fetch(url, { method: 'GET', cache: 'no-cache' });
      if (!res.ok) {
        console.warn(`Fetch de ${url} devolvió status ${res.status}`);
        return false;
      }
      // leer sólo headers al menos; no descargamos entero aquí
      console.info(`${url} disponible (fetch OK)`);
      return true;
    } catch (err) {
      console.warn(`No se pudo fetch ${url}:`, err);
      // Puede fallar bajo file:// — eso no implica necesariamente que el archivo no exista.
      return null;
    }
  }

  // ELEMENTOS globales (con guards)
  document.addEventListener('DOMContentLoaded', () => {
    // Buscar o crear placeholders seguros
    const tempRange = document.getElementById('tempRange') || ensureElement('tempRange','input',{ type:'range', min:-200, max:25, value:25 });
    // si es input, forzar tipo range
    if (tempRange.tagName.toLowerCase() === 'input') tempRange.type = 'range';

    const tempValue = document.getElementById('tempValue') || ensureElement('tempValue','span');
    const stateTitle = document.getElementById('stateTitle') || ensureElement('stateTitle','div');
    const stateDesc  = document.getElementById('stateDesc')  || ensureElement('stateDesc','div');

    // elementos de la simulación (pueden ser SVG o contenedores)
    const discSim = document.getElementById('discSim') || document.querySelector('.disc-sim') || ensureElement('discSim','div');
    const discCircle = document.getElementById('discCircle') || ensureElement('discCircle','div');
    const discShadow = document.getElementById('discShadow') || ensureElement('discShadow','div');

    const scrollToExp = document.getElementById('scrollToExp') || null;
    const contrastToggle = document.getElementById('contrastToggle') || null;

    // ya no abortamos si falta algo - advertimos y continuamos
    // ESTADOS (puntos importantes)
    const checkpoints = [
      { temp: 25,   title: 'Estado: Normal', desc: 'El material no es superconductor aún, la resistencia eléctrica está presente.' },
      { temp: -150, title: 'Enfriamiento', desc: 'Los electrones comienzan a formar pares de Cooper.' },
      { temp: -181, title: 'Transición de fase', desc: 'El material alcanza su temperatura crítica y se vuelve superconductor.' },
      { temp: -195.8, title: 'Levitación cuántica', desc: 'Se expulsa el campo magnético interno. El superconductor entra en levitación cuántica.' }
    ];

    function getStateForTemp(t){
      let closest = checkpoints[0];
      let bestDiff = Math.abs(t - checkpoints[0].temp);
      for(let i=1;i<checkpoints.length;i++){
        const diff = Math.abs(t - checkpoints[i].temp);
        if(diff < bestDiff){ bestDiff = diff; closest = checkpoints[i]; }
      }
      return closest;
    }

    // bandera para carta de levitación
    let levitationShown = false;

    function showLevitationCard() {
      let card = document.getElementById('levitationCard');
      if (!card) {
        card = document.createElement('div');
        card.id = 'levitationCard';
        card.className = 'levitation-card';
        card.style.position = 'absolute';
        card.style.right = '18px';
        card.style.top = '18px';
        card.style.zIndex = '60';
        card.style.background = 'linear-gradient(180deg, rgba(14,20,38,0.95), rgba(30,41,59,0.9))';
        card.style.color = '#e6f7f6';
        card.style.padding = '12px 14px';
        card.style.borderRadius = '10px';
        card.style.boxShadow = '0 10px 32px rgba(6,30,33,0.45)';
        card.style.backdropFilter = 'blur(6px)';
        card.innerHTML = `<strong>Levitación iniciada</strong><div style="font-size:13px;opacity:0.9;margin-top:6px">El imán empieza a levitar porque el material expulsa el campo magnético (Efecto Meissner).</div><button id="levClose" style="position:absolute;right:6px;top:6px;background:transparent;border:0;color:#9fb6b3;cursor:pointer">✕</button>`;
        // colocar dentro del contenedor de la simulación si existe
        const simStage = document.getElementById('simStage') || document.getElementById('sim') || document.body;
        simStage.style.position = simStage.style.position || 'relative';
        simStage.appendChild(card);

        document.getElementById('levClose').addEventListener('click', () => {
          card.remove();
        });
      } else {
        card.style.display = 'block';
      }
      // auto hide
      setTimeout(()=>{ card && (card.style.display = 'none'); }, 6000);
    }

    // Asegurar botón visible y audio
    const btnAudio = ensurePlayButton();
    const ambient = ensureAmbientAudio();

    // Verificación (intenta fetch; si falla por file:// devuelve null)
    checkAudioFile().then(found => {
      if (found === false) {
        alert('No se encontró Alone.mp3 en la ruta relativa. Coloque Alone.mp3 en la carpeta /workspaces/EFECTO_MEISSNER/ y recargue la página.');
        console.error('Alone.mp3 no encontrado (fetch retornó no-ok).');
      } else if (found === null) {
        console.info('No se pudo verificar Alone.mp3 por fetch (probablemente file://). Confirme que el archivo existe junto a index.html.');
      }
    });

    // Listener robusto para el botón (uso de async/await y manejo de errores)
    btnAudio.addEventListener('click', async (e) => {
      e.preventDefault();
      const audio = ensureAmbientAudio(); // volver a obtener por si se creó después
      audio.volume = 0.35;

      // Forzar recarga de metadatos si está en estado dudoso
      try { audio.load(); } catch(e){}

      try {
        if (audio.paused) {
          const p = audio.play();
          if (p && typeof p.then === 'function') {
            await p;
          }
          btnAudio.textContent = '🔇 Detener sonido';
          btnAudio.setAttribute('aria-pressed', 'true');
          console.info('Reproducción iniciada correctamente');
        } else {
          audio.pause();
          btnAudio.textContent = '🔊 Sonido ambiental';
          btnAudio.setAttribute('aria-pressed', 'false');
          console.info('Audio pausado por usuario');
        }
        return;
      } catch (err) {
        console.warn('Intento directo de play() falló:', err);
      }

      // Fallback: intentar play muted (suele permitir autoplay en navegadores estrictos)
      try {
        audio.muted = true;
        const p2 = audio.play();
        if (p2 && typeof p2.then === 'function') await p2;
        // intentar desmutear si no hay bloqueo
        setTimeout(()=>{ try { audio.muted = false; } catch(e){} }, 300);
        btnAudio.textContent = '🔇 Detener sonido';
        btnAudio.setAttribute('aria-pressed', 'true');
        console.info('Reproducción forzada en modo muted');
        return;
      } catch (err2) {
        console.error('Fallback muted play() falló:', err2);
      }

      // Último recurso: informar al usuario y volcar estado en consola
      alert('No fue posible reproducir el audio. Abra la consola (F12) y busque errores relacionados a Alone.mp3 o a políticas de autoplay.');
      console.log('Estado audio element:', {
        src: audio.src,
        readyState: audio.readyState,
        networkState: audio.networkState,
        paused: audio.paused,
        muted: audio.muted,
        error: audio.error
      });
    }, { passive: false });

    // Si hay entradas del sistema que puedan desbloquear reproducción, intentarlo allí también
    ['click','keydown','touchstart'].forEach(ev=>{
      window.addEventListener(ev, async function onceUnlock() {
        const a = document.getElementById('ambientAudio');
        if (a && a.paused) {
          try { await a.play(); a.pause(); } catch(e){}
        }
        window.removeEventListener(ev, onceUnlock);
      });
    });

    // actualizar UI segun temperatura y animar disco
    function updateSim(temp){
      // asegurar valor numérico
      const t = (typeof temp === 'number') ? temp : (parseFloat((tempRange && tempRange.value) || temp) || 25);
      tempValue.textContent = `${t.toFixed(1)} °C`;

      // determinar texto
      let title, desc;
      if (t >= -150) {
        title = checkpoints[0].title; desc  = checkpoints[0].desc;
      } else if (t < -150 && t > -181) {
        title = checkpoints[1].title; desc  = checkpoints[1].desc;
      } else if (t <= -181 && t > -195.8) {
        title = checkpoints[2].title; desc  = checkpoints[2].desc;
      } else {
        title = checkpoints[3].title; desc  = checkpoints[3].desc;
      }

      if (stateTitle) stateTitle.textContent = title;
      if (stateDesc) stateDesc.textContent = desc;

      // map temperature [-200,25] -> [yLevitate,yRest]
      const yRest = 0, yLevitate = -54;
      const tMin = -200, tMax = 25;
      const normalized = (t - tMin) / (tMax - tMin); // 0..1
      const y = yLevitate + (1 - normalized) * (yRest - yLevitate);
      const targetY = y;

      // sombra
      const shadowScale = 1 - ( ( -targetY ) / Math.abs(yLevitate) ) * 0.5;
      const shadowOpacity = 0.35 * (1 - ( -targetY / Math.abs(yLevitate) ) * 0.85);

      // animaciones seguras: mover grupo discSim y cambiar rx/ry de sombra
      if (discSim) {
        safeTo(discSim, { duration:0.6, ease:"power2.out", attr:{ transform:`translate(210,${160 + targetY})` }});
      }
      if (discShadow) {
        safeTo(discShadow, { duration:0.45, attr:{ rx: 50 * shadowScale, ry: 12 * shadowScale }, opacity: shadowOpacity});
      }

      // rotación suave del círculo cuando levita
      if (t <= -195.8) {
        if (hasGSAP && discCircle) {
          try { gsap.to('#discCircle', { duration: 1.2, rotation: 6, transformOrigin: "50% 50%", yoyo:true, repeat:-1, ease:"sine.inOut" }); } catch(e){}
        } else if (discCircle) {
          // fallback: simple oscilación con timeout
          discCircle.style.transition = 'transform 1.2s ease-in-out';
          discCircle.style.transformOrigin = '50% 50%';
          discCircle.style.transform = 'rotate(6deg)';
          setTimeout(()=> discCircle.style.transform = 'rotate(-6deg)', 1200);
        }
      } else {
        // detener animaciones fallback/gsap
        try { if (hasGSAP) gsap.killTweensOf('#discCircle'); } catch(e){}
        if (discCircle) { discCircle.style.transform = 'rotate(0deg)'; }
      }

      // pulso visual al acercarse a checkpoint
      const near = getStateForTemp(t);
      if (Math.abs(t - near.temp) < 0.6) {
        // animar tarjeta de estado
        const stateCard = document.getElementById('stateCard');
        if (stateCard) {
          safeTo(stateCard, { duration:0.35, scale:1.0, opacity:1 });
          if (!hasGSAP) {
            stateCard.style.transform = 'scale(1.02)';
            setTimeout(()=> stateCard.style.transform = 'scale(1)', 350);
          }
        }
      }

      // mostrar mini carta explicativa cuando alcance levitación fuerte
      if (t <= -195.8 && !levitationShown) {
        levitationShown = true;
        showLevitationCard();
      }
    }

    // Init con valor actual (si tempRange existe lo usamos)
    if (tempRange && tempRange.value !== undefined) {
      updateSim(parseFloat(tempRange.value));
    } else {
      updateSim(25);
    }

    // Events
    if (tempRange) {
      tempRange.addEventListener('input', (e) => updateSim(parseFloat(e.target.value)));
      tempRange.addEventListener('change', (e) => updateSim(parseFloat(e.target.value)));
    }

    // Smooth scroll CTA
    if (scrollToExp) {
      scrollToExp.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('#exp')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    // tabs física (ya en HTML)
    document.querySelectorAll('.tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.phys-pane').forEach(p=>p.classList.remove('active'));
        document.getElementById(btn.dataset.target)?.classList.add('active');
      });
    });

    // Modo claro/oscuro
    if (contrastToggle) {
      contrastToggle.addEventListener('click', () => {
        document.body.classList.toggle('light');
        const isLight = document.body.classList.contains('light');
        contrastToggle.textContent = isLight ? 'Modo oscuro' : 'Modo claro';
        document.body.style.background = isLight ? '#f7f9fa' : '';
        document.body.style.color = isLight ? '#071017' : '';
      });
    }

    // Parallax ligero hero
    const hero = document.querySelector('.hero');
    window.addEventListener('scroll', () => {
      const sc = window.scrollY;
      if(hero){
        const depth = Math.min(40, sc * 0.06);
        hero.querySelector('.hero-visual')?.style.transform = `translateY(${depth}px)`;
      }
    });

    // Animaciones iniciales con safeTo/fallback
    const heroText = document.querySelector('.hero-text');
    const heroVisual = document.querySelector('.hero-visual');
    if (heroText) safeTo(heroText, { duration:0.9, x: -20, opacity:1 });
    if (heroVisual) safeTo(heroVisual, { duration:0.9, y: 0, opacity:1 });

    // small: When nav links clicked, collapse menu in mobile (if implemented)
    document.querySelectorAll('.menu a').forEach(a=>{
      a.addEventListener('click', ()=>{ /* no-op for now */ });
    });

    // ensure sim stage animation
    const simStage = document.getElementById('simStage');
    if (simStage) safeTo(simStage, { duration:0.9, y:12, opacity:1, ease:'power2.out' });

  }); // <-- cierre correcto del callback DOMContentLoaded

})(); // <-- cierre de la IIFE
