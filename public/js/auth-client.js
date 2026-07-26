(function () {
  const TOKEN_KEY = 'authToken';
  const USER_KEY = 'authUser';
  const originalFetch = window.fetch.bind(window);

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || '';
  }

  function isApiUrl(url) {
    try {
      const parsed = new URL(url, window.location.origin);
      return parsed.pathname.startsWith('/api');
    } catch (_) {
      return typeof url === 'string' && url.startsWith('/api');
    }
  }

  function shouldRedirectOnAuthFailure(url) {
    const parsed = new URL(url, window.location.origin);
    return parsed.pathname !== '/api/login' && parsed.pathname !== '/api/forgot-password' && parsed.pathname !== '/api/reset-password';
  }

  window.fetch = function authenticatedFetch(resource, options) {
    const requestUrl = typeof resource === 'string' ? resource : resource.url;
    const opts = { ...(options || {}) };

    if (isApiUrl(requestUrl)) {
      const headers = new Headers(opts.headers || (resource instanceof Request ? resource.headers : undefined));
      const token = getToken();
      if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
      opts.headers = headers;
      opts.credentials = opts.credentials || 'same-origin';
    }

    const request = resource instanceof Request ? new Request(resource, opts) : resource;
    return originalFetch(request, opts).then((response) => {
      if ((response.status === 401 || response.status === 403) && isApiUrl(requestUrl) && shouldRedirectOnAuthFailure(requestUrl)) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        window.location.href = '/index.html';
      }
      return response;
    });
  };

  window.ZHIAuth = {
    saveLogin(result) {
      if (result.token) localStorage.setItem(TOKEN_KEY, result.token);
      if (result.user) localStorage.setItem(USER_KEY, JSON.stringify(result.user));
      if (result.role) localStorage.setItem('userRole', result.role);
      if (result.user?.name || result.staffName || result.studentName) localStorage.setItem('userName', result.user?.name || result.staffName || result.studentName);
      if (result.user?.profilePicUrl || result.profilePicUrl) localStorage.setItem('profilePicUrl', result.user?.profilePicUrl || result.profilePicUrl);
      if (result.staffId) localStorage.setItem('staffId', result.staffId);
      if (result.studentId) localStorage.setItem('studentId', result.studentId);
    },
    token: getToken,
    user() {
      try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch (_) { return null; }
    },
    async logout() {
      try { await fetch('/api/logout', { method: 'POST' }); } catch (_) {}
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem('userRole');
      localStorage.removeItem('userName');
      localStorage.removeItem('staffId');
      localStorage.removeItem('studentId');
      window.location.href = '/index.html';
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('a[href$=".html"]').forEach(function (link) {
      const href = link.getAttribute('href');
      if (href && href !== 'index.html' && !href.startsWith('http')) {
        link.setAttribute('href', href.replace(/\.html$/i, ''));
      }
    });
  });
})();
