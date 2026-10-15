/*
 * OneOS files — the plugin side of the OneOS office plugin bridge.
 * Copyright (C) 2026 Serenity ITS
 *
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU
 * Affero General Public License as published by the Free Software Foundation, either version 3 of
 * the License, or (at your option) any later version. It is distributed WITHOUT ANY WARRANTY; see the
 * GNU Affero General Public License (../../LICENSE) for more details.
 *
 * ★ This plugin holds NO credential: no bearer, cookie, grant or token of OneOS ever reaches it. It
 * posts an INTENT ({oneosPlugin: <guid>, ask, intent, args}) up to the OneOS frame page that hosts the
 * editor; that page relays only intents in its own allow-list for plugins the session enabled, and
 * OneOS performs them AS THE VIEWER and answers DATA ({oneosPluginAnswer: ask, ok, data | error}).
 * Bytes never pass through here: an inserted image is fetched by the document server itself, through
 * a signed command OneOS hands the editor.
 *
 * The bridge protocol is documented in OneOS (runtimes/cf/worker/src/office_frame.rs).
 */
(function (window) {
	'use strict';

	var GUID = 'asc.{64F70E8B-F1FB-4681-A5DF-C95120E7E513}';
	var TIMEOUT_MS = 30000;
	var pending = {};
	var next = 1;

	/** The windows above the editor: the OneOS frame page is among them (never the editor itself). */
	function above() {
		var out = [];
		var w = window.parent;
		for (var i = 0; i < 6; i++) {
			var up = null;
			try { up = w.parent; } catch (e) { break; }
			if (!up || up === w) break;
			out.push(up);
			w = up;
		}
		return out;
	}

	window.addEventListener('message', function (ev) {
		var m = ev.data;
		if (!m || typeof m !== 'object' || !('oneosPluginAnswer' in m)) return;
		if (above().indexOf(ev.source) === -1) return;
		var p = pending[m.oneosPluginAnswer];
		if (!p) return;
		delete pending[m.oneosPluginAnswer];
		clearTimeout(p.timer);
		if (m.ok === true) p.resolve(m.data || {});
		else p.reject(new Error(String(m.error || 'refused')));
	});

	/** Ask OneOS one intent; resolves with its data, rejects with its refusal (said in words). */
	function ask(intent, args) {
		return new Promise(function (resolve, reject) {
			var id = 'of-' + (next++);
			var targets = above();
			if (!targets.length) { reject(new Error('this plugin is not running inside a OneOS editor')); return; }
			var timer = setTimeout(function () {
				delete pending[id];
				reject(new Error('OneOS did not answer — open this document from OneOS'));
			}, TIMEOUT_MS);
			pending[id] = { resolve: resolve, reject: reject, timer: timer };
			var msg = { oneosPlugin: GUID, ask: id, intent: intent, args: args || {} };
			// The frame page's origin is opaque (sandboxed), so it cannot be named; it checks ours.
			targets.forEach(function (t) { t.postMessage(msg, '*'); });
		});
	}

	window.OneOSBridge = { ask: ask, GUID: GUID };
})(window);
