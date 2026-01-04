/**
 * Plaid for Healthcare Connect Widget SDK
 *
 * Embeddable widget for connecting patient health records.
 * Similar to Plaid Link, but for healthcare data.
 *
 * Usage:
 *   const connect = PFHConnect.create({
 *     token: 'wt_xxxx', // Widget token from your server
 *     onSuccess: (publicToken, metadata) => {
 *       // Exchange public_token on your server
 *       console.log('Success!', publicToken);
 *     },
 *     onExit: (error, metadata) => {
 *       // User exited without completing
 *     }
 *   });
 *
 *   connect.open();
 */

(function(window) {
  'use strict';

  const SDK_VERSION = '1.0.0';
  const DEFAULT_API_HOST = window.location.origin;

  // Widget state
  let widgetWindow = null;
  let widgetIframe = null;
  let widgetOverlay = null;

  /**
   * Create a new Connect Widget instance
   */
  function create(config) {
    validateConfig(config);

    const options = {
      token: config.token,
      apiHost: config.apiHost || DEFAULT_API_HOST,
      onSuccess: config.onSuccess || function() {},
      onExit: config.onExit || function() {},
      onEvent: config.onEvent || function() {},
      onLoad: config.onLoad || function() {},
      display: config.display || 'popup', // 'popup' or 'overlay'
      receivedRedirectUri: config.receivedRedirectUri || null
    };

    return {
      open: () => openWidget(options),
      exit: () => closeWidget(options, null),
      destroy: () => destroyWidget()
    };
  }

  /**
   * Validate configuration
   */
  function validateConfig(config) {
    if (!config) {
      throw new Error('PFHConnect: Configuration object is required');
    }
    if (!config.token) {
      throw new Error('PFHConnect: token is required');
    }
  }

  /**
   * Open the widget
   */
  function openWidget(options) {
    const widgetUrl = `${options.apiHost}/connect-widget.html?widget_token=${encodeURIComponent(options.token)}&mode=widget`;

    if (options.display === 'popup') {
      openPopup(widgetUrl, options);
    } else {
      openOverlay(widgetUrl, options);
    }

    // Emit OPEN event
    options.onEvent('OPEN', { timestamp: new Date().toISOString() });

    // Setup message listener
    setupMessageListener(options);
  }

  /**
   * Open widget in popup window
   */
  function openPopup(url, options) {
    const width = 500;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    widgetWindow = window.open(
      url,
      'pfh-connect-widget',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
    );

    if (!widgetWindow) {
      console.error('PFHConnect: Failed to open popup. Please allow popups for this site.');
      options.onExit({ error: 'popup_blocked' }, {});
      return;
    }

    // Check if popup was closed
    const checkClosed = setInterval(() => {
      if (widgetWindow && widgetWindow.closed) {
        clearInterval(checkClosed);
        closeWidget(options, { error: 'user_closed' });
      }
    }, 500);
  }

  /**
   * Open widget in overlay (iframe)
   */
  function openOverlay(url, options) {
    // Create overlay backdrop
    widgetOverlay = document.createElement('div');
    widgetOverlay.id = 'pfh-connect-overlay';
    widgetOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: pfhFadeIn 0.2s ease-out;
    `;

    // Create iframe container
    const container = document.createElement('div');
    container.style.cssText = `
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      width: 100%;
      max-width: 500px;
      height: 90vh;
      max-height: 700px;
      overflow: hidden;
      animation: pfhSlideUp 0.3s ease-out;
    `;

    // Create iframe
    widgetIframe = document.createElement('iframe');
    widgetIframe.id = 'pfh-connect-iframe';
    widgetIframe.src = url;
    widgetIframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pfhFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes pfhSlideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);

    container.appendChild(widgetIframe);
    widgetOverlay.appendChild(container);
    document.body.appendChild(widgetOverlay);

    // Close on backdrop click
    widgetOverlay.addEventListener('click', (e) => {
      if (e.target === widgetOverlay) {
        closeWidget(options, { error: 'user_closed' });
      }
    });

    // Close on ESC
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        closeWidget(options, { error: 'user_closed' });
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    // Call onLoad when iframe loads
    widgetIframe.onload = () => {
      options.onLoad();
    };
  }

  /**
   * Setup message listener for postMessage communication
   */
  function setupMessageListener(options) {
    const messageHandler = (event) => {
      // Verify origin
      if (options.apiHost && !event.origin.includes(new URL(options.apiHost).host)) {
        // Allow same origin
        if (event.origin !== window.location.origin) {
          return;
        }
      }

      const data = event.data;

      // Only handle our messages
      if (!data || data.source !== 'pfh-connect-widget') {
        return;
      }

      switch (data.type) {
        case 'SUCCESS':
          options.onSuccess(data.public_token, {
            provider: data.provider,
            timestamp: new Date().toISOString()
          });
          options.onEvent('SUCCESS', data);
          closeWidget(options, null);
          break;

        case 'CLOSE':
          closeWidget(options, null);
          break;

        case 'TRY_AGAIN':
          // Reopen the widget
          destroyWidget();
          openWidget(options);
          break;

        case 'ERROR':
          options.onEvent('ERROR', data);
          closeWidget(options, { error: data.error, errorCode: data.errorCode });
          break;

        case 'PROVIDER_SELECTED':
          options.onEvent('PROVIDER_SELECTED', {
            provider: data.provider,
            timestamp: new Date().toISOString()
          });
          break;

        default:
          // Unknown message type
          break;
      }
    };

    window.addEventListener('message', messageHandler);

    // Store handler for cleanup
    window._pfhMessageHandler = messageHandler;
  }

  /**
   * Close the widget
   */
  function closeWidget(options, error) {
    // Remove message listener
    if (window._pfhMessageHandler) {
      window.removeEventListener('message', window._pfhMessageHandler);
      delete window._pfhMessageHandler;
    }

    // Close popup
    if (widgetWindow && !widgetWindow.closed) {
      widgetWindow.close();
    }
    widgetWindow = null;

    // Remove overlay
    if (widgetOverlay && widgetOverlay.parentNode) {
      widgetOverlay.parentNode.removeChild(widgetOverlay);
    }
    widgetOverlay = null;
    widgetIframe = null;

    // Call onExit if there was an error or user closed
    if (error) {
      options.onExit(error, {
        timestamp: new Date().toISOString()
      });
    }

    // Emit EXIT event
    options.onEvent('EXIT', { error, timestamp: new Date().toISOString() });
  }

  /**
   * Destroy widget resources
   */
  function destroyWidget() {
    if (window._pfhMessageHandler) {
      window.removeEventListener('message', window._pfhMessageHandler);
      delete window._pfhMessageHandler;
    }

    if (widgetWindow && !widgetWindow.closed) {
      widgetWindow.close();
    }
    widgetWindow = null;

    if (widgetOverlay && widgetOverlay.parentNode) {
      widgetOverlay.parentNode.removeChild(widgetOverlay);
    }
    widgetOverlay = null;
    widgetIframe = null;
  }

  // Expose SDK
  window.PFHConnect = {
    create: create,
    version: SDK_VERSION
  };

})(window);
