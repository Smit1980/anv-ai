(() => {
  'use strict';

  const canvas = document.getElementById('sculpture');
  const shell = canvas?.closest('.sculpture');
  const toggle = document.getElementById('motion-toggle');
  if (!canvas || !shell) return;

  const context = canvas.getContext('2d');
  if (!context) { if (toggle) toggle.hidden = true; return; }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 600px)');
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let frame = 0;
  let lastTick = 0;
  let lastDraw = 0;
  let activeTime = 0;
  let userPaused = false;
  let inView = true;

  const normalize = vector => {
    const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
    return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
  };
  const subtract = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
  const cross = (a, b) => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  });

  // Trefoil centreline: three visibly interlaced loops, not a torus surface.
  const centre = phase => ({
    x: (1.15 + 0.42 * Math.cos(3 * phase)) * Math.cos(2 * phase),
    y: (1.15 + 0.42 * Math.cos(3 * phase)) * Math.sin(2 * phase),
    z: 0.42 * Math.sin(3 * phase)
  });
  const frameAt = phase => {
    const delta = 0.0008;
    const tangent = normalize(subtract(centre(phase + delta), centre(phase - delta)));
    let binormal = normalize(cross(tangent, { x: 0, y: 0, z: 1 }));
    if (Math.hypot(binormal.x, binormal.y, binormal.z) < 0.01) {
      binormal = normalize(cross(tangent, { x: 0, y: 1, z: 0 }));
    }
    return { tangent, binormal, normal: normalize(cross(binormal, tangent)) };
  };
  const wirePoint = (phase, strand, strandCount) => {
    const base = centre(phase);
    const frame3d = frameAt(phase);
    const twist = phase * 0.22;
    const angle = (strand / strandCount) * Math.PI * 2 + twist;
    const radius = 0.17 + Math.sin(strand * 1.7) * 0.012;
    return {
      x: base.x + radius * (Math.cos(angle) * frame3d.normal.x + Math.sin(angle) * frame3d.binormal.x),
      y: base.y + radius * (Math.cos(angle) * frame3d.normal.y + Math.sin(angle) * frame3d.binormal.y),
      z: base.z + radius * (Math.cos(angle) * frame3d.normal.z + Math.sin(angle) * frame3d.binormal.z)
    };
  };

  // The geometry is constant; only the camera projection changes per frame.
  const segments = 170;
  const strands = 40;
  const geometry = Array.from({ length: strands }, (_, strand) =>
    Array.from({ length: segments + 1 }, (_, step) =>
      wirePoint((step / segments) * Math.PI * 2, strand, strands)));

  const project = (point, angleX, angleY, scale) => {
    const cosY = Math.cos(angleY);
    const sinY = Math.sin(angleY);
    const cosX = Math.cos(angleX);
    const sinX = Math.sin(angleX);
    const x = point.x * cosY - point.z * sinY;
    const z = point.x * sinY + point.z * cosY;
    const y = point.y * cosX - z * sinX;
    const depth = z * cosX + point.y * sinX;
    const perspective = 3.8 / (4.8 - depth);
    return { x: width / 2 + x * scale * perspective, y: height / 2 + y * scale * perspective, depth };
  };

  const resize = () => {
    const bounds = shell.getBoundingClientRect();
    width = Math.max(1, Math.round(bounds.width));
    height = Math.max(1, Math.round(bounds.height));
    pixelRatio = Math.min(window.devicePixelRatio || 1, mobile.matches ? 1 : 1.5);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  };

  const draw = seconds => {
    context.clearRect(0, 0, width, height);
    const glow = context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.min(width, height) * 0.55);
    glow.addColorStop(0, 'rgba(225, 117, 45, 0.16)');
    glow.addColorStop(0.55, 'rgba(161, 69, 26, 0.05)');
    glow.addColorStop(1, 'rgba(8, 19, 33, 0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);

    const angleY = seconds * 0.08 + 0.68;
    const angleX = -0.5;
    const scale = Math.min(width, height) * 0.255;
    const lines = geometry.map(wire => wire.map(point => project(point, angleX, angleY, scale)));
    lines.sort((a, b) => a.reduce((sum, point) => sum + point.depth, 0) - b.reduce((sum, point) => sum + point.depth, 0));
    context.lineCap = 'round';
    context.lineJoin = 'round';
    lines.forEach((wire, index) => {
      const depth = wire.reduce((sum, point) => sum + point.depth, 0) / wire.length;
      const light = Math.max(0.2, Math.min(1, 0.57 + depth * 0.16));
      const hue = 18 + (index / (lines.length - 1)) * 12;
      context.beginPath();
      wire.forEach((point, step) => step ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
      context.strokeStyle = `hsla(${hue}, 82%, ${37 + light * 34}%, ${0.25 + light * 0.6})`;
      context.lineWidth = 0.68 + light * 1.18;
      context.stroke();
    });
    shell.classList.add('is-rendered');
  };

  const isSystemPaused = () => reducedMotion.matches || mobile.matches;
  const isPaused = () => userPaused || isSystemPaused();
  const updateToggle = () => {
    if (!toggle) return;
    const paused = isPaused();
    toggle.hidden = isSystemPaused();
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute('aria-label', paused ? 'Включить движение скульптуры' : 'Поставить движение скульптуры на паузу');
    toggle.textContent = paused ? 'Движение ↻' : 'Пауза Ⅱ';
  };
  const stopClock = () => { lastTick = 0; };
  const animate = timestamp => {
    frame = 0;
    if (isPaused() || !inView || document.hidden) {
      stopClock();
      return;
    }
    if (!lastTick) lastTick = timestamp;
    activeTime += Math.min(timestamp - lastTick, 100) / 1000;
    lastTick = timestamp;
    if (timestamp - lastDraw >= 33) {
      lastDraw = timestamp;
      draw(activeTime);
    }
    frame = window.requestAnimationFrame(animate);
  };
  const requestFrame = () => {
    if (!frame && !isPaused() && inView && !document.hidden) frame = window.requestAnimationFrame(animate);
  };
  const syncMotion = () => {
    updateToggle();
    if (isPaused()) {
      stopClock();
      draw(activeTime);
    } else requestFrame();
  };

  toggle?.addEventListener('click', () => {
    userPaused = !userPaused;
    syncMotion();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopClock();
    requestFrame();
  });
  const observer = new IntersectionObserver(entries => {
    inView = entries[0]?.isIntersecting ?? false;
    if (!inView) stopClock();
    requestFrame();
  }, { threshold: 0.1 });
  observer.observe(shell);
  const updateMotionPreference = () => syncMotion();
  reducedMotion.addEventListener?.('change', updateMotionPreference);
  mobile.addEventListener?.('change', updateMotionPreference);
  new ResizeObserver(() => { resize(); draw(activeTime); }).observe(shell);
  resize();
  draw(activeTime);
  syncMotion();
})();
