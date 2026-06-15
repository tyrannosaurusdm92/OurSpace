(function (global) {
  'use strict';

  const DEFAULT_TIMEOUT_MS = 12000;

  function nowIso() {
    return new Date().toISOString();
  }

  function sanitizeId(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'item';
  }

  function safeJson(text) {
    try { return JSON.parse(text); } catch (error) { return { ok: false, raw: text }; }
  }

  function withTimeout(promise, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs || DEFAULT_TIMEOUT_MS);
    return {
      signal: controller.signal,
      run: promise(controller.signal).finally(() => clearTimeout(timer))
    };
  }

  class OurSpaceBackendBridge {
    constructor(options) {
      this.mainBackendUrl = options.mainBackendUrl || '';
      this.onyxAlertsBackendUrl = options.onyxAlertsBackendUrl || '';
      this.clientId = options.clientId || `client_${Math.random().toString(36).slice(2)}_${Date.now()}`;
      this.offlineKey = options.offlineKey || 'ourspaceMessengerOfflineQueue.v1';
      this.timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
    }

    async sendMessage(message) {
      const payload = this._envelope('message.create', message);
      return this._postWithFallback(this.mainBackendUrl, payload, 'messages');
    }

    async listMessages(params) {
      const payload = this._envelope('message.list', params || {});
      return this._postWithFallback(this.mainBackendUrl, payload, 'messages', { readOnly: true });
    }

    async createChannel(channel) {
      const payload = this._envelope('channel.create', channel);
      return this._postWithFallback(this.mainBackendUrl, payload, 'channels');
    }

    async sendSignal(signal) {
      const payload = this._envelope('call.signal', signal);
      return this._postWithFallback(this.mainBackendUrl, payload, 'signals');
    }

    async listSignals(params) {
      const payload = this._envelope('call.signal.list', params || {});
      return this._postWithFallback(this.mainBackendUrl, payload, 'signals', { readOnly: true });
    }

    async sendOnyxAlert(alert) {
      const payload = this._envelope('onyx.alert', alert);
      return this._postWithFallback(this.onyxAlertsBackendUrl, payload, 'onyx_alerts');
    }

    async flushQueue() {
      const queue = this._loadQueue();
      if (!queue.length) return { ok: true, sent: 0 };
      const remaining = [];
      let sent = 0;
      for (const item of queue) {
        try {
          const result = await this._postDirect(item.url, item.payload);
          if (result.ok !== false) sent += 1;
          else remaining.push(item);
        } catch (error) {
          remaining.push(item);
        }
      }
      this._saveQueue(remaining.slice(-100));
      return { ok: remaining.length === 0, sent, remaining: remaining.length };
    }

    _envelope(action, data) {
      return {
        action,
        source: 'ourspace_messenger_plugin',
        clientId: this.clientId,
        createdAt: nowIso(),
        data
      };
    }

    async _postWithFallback(url, payload, bucket, options) {
      if (!url) {
        this._queue(url, payload, bucket);
        return { ok: false, offline: true, reason: 'No backend URL configured.', queued: true };
      }
      try {
        return await this._postDirect(url, payload);
      } catch (jsonError) {
        try {
          return await this._postAsForm(url, payload);
        } catch (formError) {
          if (!options || !options.readOnly) this._queue(url, payload, bucket);
          return {
            ok: false,
            offline: true,
            queued: !options?.readOnly,
            reason: formError && formError.message ? formError.message : 'Backend request failed.'
          };
        }
      }
    }

    async _postDirect(url, payload) {
      const task = withTimeout((signal) => fetch(url, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: { 'Content-Type': 'text/plain;charset=utf-8', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
        signal
      }), this.timeoutMs);
      const response = await task.run;
      const text = await response.text();
      const data = safeJson(text);
      if (!response.ok) throw new Error(`Backend HTTP ${response.status}`);
      return data && typeof data === 'object' ? data : { ok: true, raw: text };
    }

    async _postAsForm(url, payload) {
      const form = new FormData();
      form.append('payload', JSON.stringify(payload));
      form.append('action', payload.action || 'message.create');
      form.append('source', payload.source || 'ourspace_messenger_plugin');
      form.append('clientId', payload.clientId || this.clientId);
      form.append('createdAt', payload.createdAt || nowIso());
      form.append('data', JSON.stringify(payload.data || {}));
      const task = withTimeout((signal) => fetch(url, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        body: form,
        signal
      }), this.timeoutMs);
      const response = await task.run;
      const text = await response.text();
      if (!response.ok) throw new Error(`Backend HTTP ${response.status}`);
      return safeJson(text);
    }

    _loadQueue() {
      try { return JSON.parse(localStorage.getItem(this.offlineKey) || '[]'); }
      catch (error) { return []; }
    }

    _saveQueue(queue) {
      try { localStorage.setItem(this.offlineKey, JSON.stringify(queue)); }
      catch (error) { /* storage can be full or disabled */ }
    }

    _queue(url, payload, bucket) {
      const queue = this._loadQueue();
      queue.push({ id: `${sanitizeId(bucket)}_${Date.now()}_${Math.random().toString(36).slice(2)}`, url, payload });
      this._saveQueue(queue.slice(-100));
    }
  }

  global.OurSpaceBackendBridge = OurSpaceBackendBridge;
})(window);
