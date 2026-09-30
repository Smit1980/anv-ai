function initNavigation() {
  const button = document.querySelector('.nav-toggle');
  const menu = document.querySelector('.nav-links');
  if (!button || !menu) return;
  const close = () => {
    button.setAttribute('aria-expanded', 'false');
    menu.classList.remove('is-open');
    document.body.classList.remove('nav-open');
  };
  button.addEventListener('click', () => {
    const next = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(next));
    menu.classList.toggle('is-open', next);
    document.body.classList.toggle('nav-open', next);
  });
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', close));
}

function initModel() {
  const title = document.getElementById('model-title');
  const text = document.getElementById('model-text');
  const controls = document.querySelectorAll('.model__control');
  if (!title || !text || !controls.length) return;
  controls.forEach(control => control.addEventListener('click', () => {
    controls.forEach(item => item.classList.toggle('is-active', item === control));
    title.innerHTML = control.dataset.title || '';
    text.textContent = control.dataset.text || '';
  }));
}

function initContactForm() {
  const form = document.getElementById('contact-form');
  const error = document.getElementById('form-error');
  const preview = document.getElementById('contact-preview');
  const messageTarget = document.getElementById('contact-message');
  const copy = document.getElementById('copy-message');
  if (!form || !error || !preview || !messageTarget || !copy) return;
  form.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(form);
    const valid = ['name', 'role', 'task'].every(name => String(data.get(name) || '').trim());
    error.hidden = valid;
    if (!valid) return;
    const company = String(data.get('company') || '').trim();
    const message = [
      'Здравствуйте! Хочу обсудить ИИ-задачу.',
      `Имя: ${String(data.get('name')).trim()}`,
      `Роль: ${String(data.get('role')).trim()}`,
      company ? `Компания: ${company}` : '',
      `Задача: ${String(data.get('task')).trim()}`,
    ].filter(Boolean).join('\n');
    messageTarget.textContent = message;
    form.hidden = true;
    preview.hidden = false;
    copy.focus();
  });
  copy.addEventListener('click', async () => {
    await navigator.clipboard.writeText(messageTarget.textContent || '');
    copy.textContent = 'Скопировано';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initModel();
  initContactForm();
});
