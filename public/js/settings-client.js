(function () {
  function setText(selector, value) {
    if (!value) return;
    document.querySelectorAll(selector).forEach(function (el) { el.textContent = value; });
  }

  function applySettings(settings) {
    window.ZHI_SETTINGS = settings;
    var logoUrl = settings.logoUrl || '/zhi_logo.png';

    document.querySelectorAll('img').forEach(function (img) {
      var src = img.getAttribute('src') || '';
      var alt = (img.getAttribute('alt') || '').toLowerCase();
      if (src.indexOf('zhi_logo') !== -1 || alt.indexOf('zhi logo') !== -1 || img.dataset.setting === 'logo') {
        img.src = logoUrl;
        img.style.display = '';
      }
    });

    setText('[data-setting="collegeName"]', settings.collegeName);
    setText('[data-setting="collegeShortName"]', settings.collegeShortName || settings.collegeName);
    setText('[data-setting="portalSubtitle"]', settings.portalSubtitle);
    setText('.logo-area h1', settings.collegeName);
    setText('.logo-area p', settings.portalSubtitle);
    setText('.sidebar-header h2', settings.collegeShortName || settings.collegeName);

    if (settings.loginBackgroundUrl && document.querySelector('.glass-panel')) {
      document.body.style.background = "linear-gradient(rgba(15,23,42,.85),rgba(15,23,42,.95)), url('" + settings.loginBackgroundUrl + "') center/cover no-repeat fixed";
    }

    if (settings.collegeName && document.title.indexOf('ZHI') !== -1) {
      document.title = document.title.replace(/ZHI College|ZHI Director Panel|Zakir Husain Institute/gi, settings.collegeShortName || settings.collegeName);
    }
  }

  fetch('/api/settings/public')
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (payload) { if (payload && payload.success) applySettings(payload.data); })
    .catch(function () {});
})();
