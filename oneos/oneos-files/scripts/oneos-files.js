/*
 * OneOS files — browse and search your OneOS files and insert an image from them.
 * Copyright (C) 2026 Serenity ITS
 *
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU
 * Affero General Public License as published by the Free Software Foundation, either version 3 of
 * the License, or (at your option) any later version. It is distributed WITHOUT ANY WARRANTY; see the
 * GNU Affero General Public License (../../LICENSE) for more details.
 *
 * Every act is an intent through the bridge (scripts/bridge.js):
 *   oneos.files.list   {tag?}          → {rows: [{id, name, kind: 'file'|'tag', image?, contentType?, size?}]}
 *   oneos.files.search {query}         → {rows}
 *   oneos.files.insert {file, as: 'image'} → OneOS hands the editor a signed insertImage; the server fetches it.
 * Nothing is fetched by this plugin.
 */
(function (window) {
	'use strict';

	var ask = function (i, a) { return window.OneOSBridge.ask(i, a); };
	var trail = []; // [{id, name}] — the tags browsed into
	var els = {};

	function $(id) { return document.getElementById(id); }
	function status(text, tone) {
		els.status.textContent = text || '';
		els.status.className = 'of__status' + (tone ? ' of__status--' + tone : '');
	}
	function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
	function sizeLabel(n) {
		if (typeof n !== 'number') return '';
		if (n < 1024) return n + ' B';
		if (n < 1048576) return Math.round(n / 1024) + ' KB';
		return (n / 1048576).toFixed(1) + ' MB';
	}

	function crumbs() {
		clear(els.crumbs);
		var all = [{ id: '', name: 'My files' }].concat(trail);
		all.forEach(function (c, i) {
			if (i) els.crumbs.appendChild(document.createTextNode(' › '));
			var b = document.createElement('button');
			b.type = 'button';
			b.className = 'of__crumb';
			b.textContent = c.name;
			b.disabled = i === all.length - 1;
			b.addEventListener('click', function () { trail = trail.slice(0, i); list(); });
			els.crumbs.appendChild(b);
		});
	}

	function render(rows, empty) {
		clear(els.list);
		if (!rows.length) { status(empty); return; }
		status('');
		rows.forEach(function (r) {
			var li = document.createElement('li');
			li.className = 'of__row';
			var name = document.createElement('span');
			name.className = 'of__name';
			name.textContent = (r.kind === 'tag' ? '# ' : '') + r.name;
			name.title = r.name;
			li.appendChild(name);
			var meta = document.createElement('span');
			meta.className = 'of__meta';
			meta.textContent = r.kind === 'tag' ? 'tag' : sizeLabel(r.size);
			li.appendChild(meta);
			var act = document.createElement('button');
			act.type = 'button';
			act.className = 'of__btn';
			if (r.kind === 'tag') {
				act.textContent = 'Open';
				act.addEventListener('click', function () { trail.push({ id: r.id, name: r.name }); list(); });
			} else if (r.image) {
				act.textContent = 'Insert';
				act.addEventListener('click', function () { insert(r, act); });
			} else {
				act.textContent = 'Insert';
				act.disabled = true;
				act.title = 'Only an image (png, jpg, gif, bmp) can be inserted here';
			}
			li.appendChild(act);
			els.list.appendChild(li);
		});
	}

	function list() {
		crumbs();
		var tag = trail.length ? trail[trail.length - 1].id : '';
		status('Reading your files…');
		clear(els.list);
		ask('oneos.files.list', tag ? { tag: tag } : {}).then(function (d) {
			render(d.rows || [], tag ? 'Nothing carries this tag yet.' : 'You have no files yet.');
		}, function (e) { status(e.message, 'error'); });
	}

	function search(query) {
		trail = [];
		crumbs();
		status('Searching…');
		clear(els.list);
		ask('oneos.files.search', { query: query }).then(function (d) {
			render(d.rows || [], 'No file of yours mentions “' + query + '”.');
		}, function (e) { status(e.message, 'error'); });
	}

	function insert(row, button) {
		button.disabled = true;
		status('Inserting ' + row.name + '…');
		ask('oneos.files.insert', { file: row.id, as: 'image' }).then(function () {
			button.disabled = false;
			status('Inserted ' + row.name + '.', 'ok');
		}, function (e) {
			button.disabled = false;
			status(e.message, 'error');
		});
	}

	/** The editor's theme, carried onto the panel's own variables. */
	function applyTheme(theme) {
		if (!theme) return;
		var root = document.documentElement.style;
		var pick = function (k, v) { if (typeof theme[k] === 'string' && theme[k]) root.setProperty(v, theme[k]); };
		pick('background-normal', '--of-bg');
		pick('text-normal', '--of-text');
		pick('text-secondary', '--of-muted');
		pick('border-regular-control', '--of-border');
		pick('background-toolbar', '--of-surface');
		pick('highlight-button-hover', '--of-hover');
		pick('background-primary-dialog-button', '--of-accent');
		pick('text-inverse', '--of-on-accent');
		document.documentElement.setAttribute('data-theme', theme.type === 'dark' ? 'dark' : 'light');
	}

	window.Asc.plugin.init = function () {
		els = { status: $('of-status'), list: $('of-list'), crumbs: $('of-crumbs'), query: $('of-query') };
		$('of-search').addEventListener('submit', function (ev) {
			ev.preventDefault();
			var q = els.query.value.trim();
			if (q) search(q); else { trail = []; list(); }
		});
		list();
	};
	window.Asc.plugin.button = function () { this.executeCommand('close', ''); };
	window.Asc.plugin.onThemeChanged = function (theme) {
		if (window.Asc.plugin.onThemeChangedBase) window.Asc.plugin.onThemeChangedBase(theme);
		applyTheme(theme);
	};
})(window);
