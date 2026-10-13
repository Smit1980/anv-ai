(() => {
  'use strict';

  const mobileQuery = window.matchMedia('(max-width: 900px)');

  function initNavigation() {
    const button = document.querySelector('.nav-toggle');
    const menu = document.getElementById('site-menu');
    if (!button || !menu) return;

    const main = document.getElementById('main');
    const footer = document.querySelector('footer');
    let opener = null;
    const background = [main, footer].filter(Boolean);
    const setBackgroundInert = value => background.forEach(element => {
      if ('inert' in element) element.inert = value;
    });
    const focusable = () => [button, ...Array.from(menu.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ))].filter(element => !element.hidden && element.offsetParent !== null);

    const close = ({ restoreFocus = false } = {}) => {
      button.setAttribute('aria-expanded', 'false');
      menu.classList.remove('is-open');
      document.body.classList.remove('nav-open');
      setBackgroundInert(false);
      if (restoreFocus && opener) opener.focus();
    };
    const open = () => {
      opener = document.activeElement instanceof HTMLElement ? document.activeElement : button;
      button.setAttribute('aria-expanded', 'true');
      menu.classList.add('is-open');
      document.body.classList.add('nav-open');
      setBackgroundInert(true);
      window.requestAnimationFrame(() => focusable()[0]?.focus());
    };

    button.addEventListener('click', () => {
      if (button.getAttribute('aria-expanded') === 'true') close();
      else open();
    });
    menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => close()));
    document.addEventListener('keydown', event => {
      if (button.getAttribute('aria-expanded') !== 'true' || !mobileQuery.matches) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        close({ restoreFocus: true });
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    const resetForDesktop = () => { if (!mobileQuery.matches) close(); };
    if (mobileQuery.addEventListener) mobileQuery.addEventListener('change', resetForDesktop);
    else window.addEventListener('resize', resetForDesktop);
  }

  function initScenarioTabs() {
    const tabs = Array.from(document.querySelectorAll('[role="tab"][data-scenario]'));
    if (!tabs.length) return;
    const tablist = tabs[0].closest('[role="tablist"]');
    const compact = window.matchMedia('(max-width: 600px)');
    const setOrientation = () => tablist?.setAttribute('aria-orientation', compact.matches ? 'horizontal' : 'vertical');
    setOrientation();
    compact.addEventListener('change', setOrientation);
    const getPanel = tab => {
      const controlId = tab.getAttribute('aria-controls');
      return (controlId && document.getElementById(controlId)) || document.getElementById(`scenario-${tab.dataset.scenario}`);
    };
    const activate = (tab, moveFocus = false) => {
      tabs.forEach(item => {
        const selected = item === tab;
        item.setAttribute('aria-selected', String(selected));
        item.tabIndex = selected ? 0 : -1;
        const panel = getPanel(item);
        if (panel) panel.hidden = !selected;
      });
      if (moveFocus) tab.focus();
    };
    activate(tabs.find(tab => tab.dataset.scenario === 'operations') || tabs.find(tab => tab.getAttribute('aria-selected') === 'true') || tabs[0]);
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => activate(tab));
      tab.addEventListener('keydown', event => {
        let nextIndex = null;
        if (event.key === (compact.matches ? 'ArrowRight' : 'ArrowDown')) nextIndex = (index + 1) % tabs.length;
        if (event.key === (compact.matches ? 'ArrowLeft' : 'ArrowUp')) nextIndex = (index - 1 + tabs.length) % tabs.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = tabs.length - 1;
        if (nextIndex === null) return;
        event.preventDefault();
        activate(tabs[nextIndex], true);
      });
    });
  }

  function initScenarioCtas() {
    const taskField = document.querySelector('#contact-form textarea[name="task"]');
    if (!taskField) return;
    document.querySelectorAll('[data-scenario-cta][data-task]').forEach(link => link.addEventListener('click', () => {
      document.getElementById('contact-form').hidden = false;
      document.getElementById('contact-preview').hidden = true;
      taskField.value = link.dataset.task.trim();
      taskField.dispatchEvent(new Event('input', { bubbles: true }));
    }));
  }

  function initContactForm() {
    const form = document.getElementById('contact-form');
    const error = document.getElementById('form-error');
    const preview = document.getElementById('contact-preview');
    const message = document.getElementById('contact-message');
    const copy = document.getElementById('copy-message');
    const copyStatus = document.getElementById('copy-status');
    const edit = document.getElementById('edit-message');
    if (!form || !error || !preview || !message || !copy) return;
    const fields = ['name', 'role', 'company', 'task'].map(name => form.elements.namedItem(name)).filter(Boolean);
    const clearError = () => {
      error.hidden = true;
      fields.forEach(field => field.removeAttribute('aria-invalid'));
    };
    const setCopyStatus = text => {
      if (!copyStatus) return;
      copyStatus.textContent = text;
      copyStatus.hidden = false;
    };
    const composeMessage = values => [
      'Здравствуйте! Хочу обсудить ИИ-задачу.',
      `Имя: ${values.name}`,
      `Роль: ${values.role}`,
      values.company ? `Компания: ${values.company}` : '',
      `Задача: ${values.task}`
    ].filter(Boolean).join('\n');
    fields.forEach(field => field.addEventListener('input', clearError));
    form.addEventListener('submit', event => {
      event.preventDefault();
      const values = Object.fromEntries(fields.map(field => [field.name, field.value.trim()]));
      const invalid = fields.filter(field => field.required && !values[field.name]);
      if (invalid.length) {
        fields.forEach(field => field.setAttribute('aria-invalid', String(invalid.includes(field))));
        error.textContent = 'Укажите имя, роль и коротко опишите задачу.';
        error.hidden = false;
        invalid[0].focus();
        return;
      }
      clearError();
      message.value = composeMessage(values);
      if ('readOnly' in message) message.readOnly = true;
      form.hidden = true;
      preview.hidden = false;
      if (copyStatus) copyStatus.hidden = true;
      copy.focus();
    });
    copy.addEventListener('click', async () => {
      const text = message.value;
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
        await navigator.clipboard.writeText(text);
        setCopyStatus('Текст скопирован.');
      } catch {
        message.focus();
        message.select();
        let copied = false;
        try { copied = document.execCommand('copy'); } catch { copied = false; }
        setCopyStatus(copied ? 'Текст скопирован.' : 'Выделите текст и скопируйте его вручную.');
      }
    });
    edit?.addEventListener('click', () => {
      preview.hidden = true;
      form.hidden = false;
      if (copyStatus) copyStatus.hidden = true;
      form.elements.namedItem('task')?.focus();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initScenarioTabs();
    initScenarioCtas();
    initContactForm();
  });
})();
