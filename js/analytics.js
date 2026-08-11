/* ==========================================================================
   PDF Toolkit AI — analytics.js
   Google Analytics 4 loader.
   --------------------------------------------------------------------------
   GA4 Measurement ID is configured: G-BCJDR6RK7E
   (set from analytics.google.com → Admin → Data Streams).
   Tracking is active; the guard on line 19 only skips loading while the ID
   still equals the G-REPLACE-ME placeholder.
   ========================================================================== */
(function () {
  'use strict';
  var MEASUREMENT_ID = 'G-BCJDR6RK7E';

  // Avoid double-loading if the snippet is ever inlined twice.
  if (window.__pdf_ga_loaded) return;
  window.__pdf_ga_loaded = true;

  // Don't run the real tracker with the placeholder ID.
  if (MEASUREMENT_ID.indexOf('G-REPLACE-ME') !== -1) return;

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', MEASUREMENT_ID, {
    anonymize_ip: true,
    page_path: location.pathname + location.search
  });

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(MEASUREMENT_ID);
  document.head.appendChild(s);
})();
