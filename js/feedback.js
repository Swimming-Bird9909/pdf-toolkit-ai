/* ==========================================================================
   PDF Toolkit AI — Share Your Voice (Feedback Module)
   Self-contained: injects button + modal, handles FormSubmit.co AJAX
   ========================================================================== */
(function () {
  'use strict';

  var FORM_ENDPOINT = 'https://formsubmit.co/ajax/qiuliang087@gmail.com';

  /* ---------- SVG Icons ---------- */
  var ICON_SPEECH = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var ICON_BULB = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5"/></svg>';
  var ICON_BUG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="6" width="8" height="13" rx="4"/><path d="M19 7l-3 2"/><path d="M5 7l3 2"/><path d="M19 13h-3"/><path d="M5 13h3"/><path d="M19 17l-3-2"/><path d="M5 17l3-2"/><path d="M12 6V4"/><path d="M10 4h4"/></svg>';
  var ICON_EDIT = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';

  /* ---------- Inject nav button ---------- */
  function injectButton() {
    if (document.querySelector('.feedback-trigger')) return;
    var navCta = document.querySelector('.nav-cta');
    if (!navCta) return;

    var btn = document.createElement('button');
    btn.className = 'feedback-trigger';
    btn.type = 'button';
    btn.innerHTML = ICON_SPEECH + '<span>Share Your Voice</span>';
    btn.addEventListener('click', openModal);
    navCta.insertBefore(btn, navCta.firstChild);
  }

  /* ---------- Inject modal ---------- */
  function injectModal() {
    if (document.querySelector('.feedback-overlay')) return;

    var overlay = document.createElement('div');
    overlay.className = 'feedback-overlay';
    overlay.innerHTML =
      '<div class="feedback-modal" role="dialog" aria-labelledby="fb-title">' +
        '<button class="feedback-close" type="button" aria-label="Close">&times;</button>' +
        '<div class="feedback-header">' +
          '<h2 id="fb-title">Share Your Voice</h2>' +
          '<p>Tell us what you need, what\u2019s broken, or what could be better. We read every message.</p>' +
        '</div>' +
        '<form class="feedback-form" id="feedbackForm">' +
          '<input type="text" name="_honey" style="display:none" tabindex="-1" autocomplete="off">' +
          '<input type="hidden" name="_subject" value="New Feedback - PDF Toolkit AI">' +
          '<input type="hidden" name="_template" value="table">' +
          '<input type="hidden" name="_captcha" value="false">' +
          '<div class="feedback-types">' +
            '<label class="feedback-type">' +
              '<input type="radio" name="feedback_type" value="Feature Request" checked>' +
              '<span class="type-card">' +
                '<span class="type-icon">' + ICON_BULB + '</span>' +
                '<span class="type-label">Feature Request</span>' +
                '<span class="type-desc">I want a new tool or feature</span>' +
              '</span>' +
            '</label>' +
            '<label class="feedback-type">' +
              '<input type="radio" name="feedback_type" value="Bug Report">' +
              '<span class="type-card">' +
                '<span class="type-icon">' + ICON_BUG + '</span>' +
                '<span class="type-label">Bug Report</span>' +
                '<span class="type-desc">Something isn\u2019t working right</span>' +
              '</span>' +
            '</label>' +
            '<label class="feedback-type">' +
              '<input type="radio" name="feedback_type" value="Suggestion">' +
              '<span class="type-card">' +
                '<span class="type-icon">' + ICON_EDIT + '</span>' +
                '<span class="type-label">Suggestion</span>' +
                '<span class="type-desc">Ideas to improve the site</span>' +
              '</span>' +
            '</label>' +
          '</div>' +
          '<div class="feedback-field">' +
            '<label for="fb-message">Your feedback <span class="req">*</span></label>' +
            '<textarea id="fb-message" name="feedback_message" rows="5" required placeholder="Tell us what you think..."></textarea>' +
          '</div>' +
          '<div class="feedback-field">' +
            '<label for="fb-email">Your email <span class="opt">(optional)</span></label>' +
            '<input type="email" id="fb-email" name="user_email" placeholder="you@example.com">' +
          '</div>' +
          '<button type="submit" class="btn btn-primary btn-block feedback-submit">Send Feedback</button>' +
        '</form>' +
        '<div class="feedback-success" id="fb-success">' +
          '<div class="success-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>' +
          '<h3>Thank you!</h3>' +
          '<p>Your feedback has been sent. We appreciate you taking the time to help us improve.</p>' +
          '<button class="btn btn-ghost" id="fb-close-success" type="button">Close</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });
    overlay.querySelector('.feedback-close').addEventListener('click', closeModal);
    overlay.querySelector('#fb-close-success').addEventListener('click', closeModal);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('active')) closeModal();
    });
    overlay.querySelector('#feedbackForm').addEventListener('submit', handleSubmit);
  }

  /* ---------- Open / Close ---------- */
  function openModal() {
    var overlay = document.querySelector('.feedback-overlay');
    if (!overlay) return;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(function () {
      var ta = overlay.querySelector('#fb-message');
      if (ta) ta.focus();
    }, 200);
  }

  function closeModal() {
    var overlay = document.querySelector('.feedback-overlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    // Reset form after animation
    setTimeout(function () {
      var form = overlay.querySelector('#feedbackForm');
      var success = overlay.querySelector('#fb-success');
      if (form) {
        form.reset();
        form.style.display = '';
      }
      if (success) success.style.display = '';
    }, 250);
  }

  /* ---------- Submit ---------- */
  function handleSubmit(e) {
    e.preventDefault();
    var form = e.target;
    var submitBtn = form.querySelector('.feedback-submit');
    var data = {
      _honey: '',
      _subject: 'New Feedback - PDF Toolkit AI',
      _template: 'table',
      _captcha: 'false',
      feedback_type: form.feedback_type.value,
      feedback_message: form.feedback_message.value,
      user_email: form.user_email.value || 'Not provided',
      page_url: window.location.href
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(data)
    })
      .then(function (r) { return r.json(); })
      .then(function () { showSuccess(form); })
      .catch(function () { showSuccess(form); });
  }

  function showSuccess(form) {
    form.style.display = 'none';
    var success = document.getElementById('fb-success');
    if (success) success.style.display = 'flex';
  }

  /* ---------- Init ---------- */
  function init() {
    injectButton();
    injectModal();
    if (window.location.hash === '#feedback') openModal();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
