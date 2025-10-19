/* script.js
   Interacciones y simulaciones con fallback cuando GSAP no está disponible
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
        // intentar aplicar transform directo en style para svg
        el.style.transform = opts.attr.transform.replace('translate(', 'translate(');
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

  // ELEMENTOS globales (con guards)
  document.addEventListener('DOMContentLoaded', () => {
    const tempRange = document.getElementById('tempRange');
    const tempValue = document.getElementById('tempValue');
    const stateTitle = document.getElementById('stateTitle');
    const stateDesc  = document.getElementById('stateDesc');
    const discSim = document.getElementById('discSim');
    const discCircle = document.getElementById('discCircle');
    const discShadow = document.getElementById('discShadow');
    const scrollToExp = document.getElementById('scrollToExp');
    const contrastToggle = document.getElementById('contrastToggle');

    if (!tempRange || !tempValue || !stateTitle || !stateDesc || !discSim) {
      console.error('Elementos clave no encontrados en DOM. Revisar ids: tempRange, tempValue, stateCard, discSim');
      return;
    }

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
        const simStage = document.getElementById('simStage') || document.body;
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

    // actualizar UI segun temperatura y animar disco
    function updateSim(temp){
      tempValue.textContent = `${temp.toFixed(1)} °C`;

      // determinar texto
      let title, desc;
      if (temp >= -150) {
        title = checkpoints[0].title; desc  = checkpoints[0].desc;
      } else if (temp < -150 && temp > -181) {
        title = checkpoints[1].title; desc  = checkpoints[1].desc;
      } else if (temp <= -181 && temp > -195.8) {
        title = checkpoints[2].title; desc  = checkpoints[2].desc;
      } else {
        title = checkpoints[3].title; desc  = checkpoints[3].desc;
      }

      stateTitle.textContent = title;
      stateDesc.textContent = desc;

      // map temperature [-200,25] -> [yLevitate,yRest]
      const yRest = 0, yLevitate = -54;
      const tMin = -200, tMax = 25;
      const normalized = (temp - tMin) / (tMax - tMin); // 0..1
      const y = yLevitate + (1 - normalized) * (yRest - yLevitate);
      const targetY = y;

      // sombra
      const shadowScale = 1 - ( ( -targetY ) / Math.abs(yLevitate) ) * 0.5;
      const shadowOpacity = 0.35 * (1 - ( -targetY / Math.abs(yLevitate) ) * 0.85);

      // animaciones seguras: mover grupo discSim y cambiar rx/ry de sombra
      if (discSim) {
        // preferimos cambiar transform de estilo (funciona en fallback)
        safeTo(discSim, { duration:0.6, ease:"power2.out", attr:{ transform:`translate(210,${160 + targetY})` }});
      }
      if (discShadow) {
        safeTo(discShadow, { duration:0.45, attr:{ rx: 50 * shadowScale, ry: 12 * shadowScale }, opacity: shadowOpacity});
      }

      // rotación suave del círculo cuando levita
      if (temp <= -195.8) {
        if (hasGSAP && discCircle) {
          gsap.to('#discCircle', { duration: 1.2, rotation: 6, transformOrigin: "50% 50%", yoyo:true, repeat:-1, ease:"sine.inOut" });
        } else if (discCircle) {
          // fallback: simple oscilación con interval
          discCircle.style.transition = 'transform 1.2s ease-in-out';
          discCircle.style.transformOrigin = '50% 50%';
          // alternar ligera rotación
          discCircle.style.transform = 'rotate(6deg)';
          // revert after a bit to simulate yoyo
          setTimeout(()=> discCircle.style.transform = 'rotate(-6deg)', 1200);
        }
      } else {
        // detener animaciones fallback/gsap
        try { if (hasGSAP) gsap.killTweensOf('#discCircle'); } catch(e){}
        if (discCircle) { discCircle.style.transform = 'rotate(0deg)'; }
      }

      // pulso visual al acercarse a checkpoint
      const near = getStateForTemp(temp);
      if (Math.abs(temp - near.temp) < 0.6) {
        // animar tarjeta de estado
        const stateCard = document.getElementById('stateCard');
        if (stateCard) {
          safeTo(stateCard, { duration:0.35, scale:1.0, opacity:1 });
          // pequeño "pop" por JS si no hay gsap
          if (!hasGSAP) {
            stateCard.style.transform = 'scale(1.02)';
            setTimeout(()=> stateCard.style.transform = 'scale(1)', 350);
          }
        }
      }

      // mostrar mini carta explicativa cuando alcance levitación fuerte
      if (temp <= -195.8 && !levitationShown) {
        levitationShown = true;
        showLevitationCard();
      }
    }

    // Init con valor actual
    updateSim(parseFloat(tempRange.value));

    // Events
    tempRange.addEventListener('input', (e) => updateSim(parseFloat(e.target.value)));
    tempRange.addEventListener('change', (e) => updateSim(parseFloat(e.target.value)));

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
  });
})();
