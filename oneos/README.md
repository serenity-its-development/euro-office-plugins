# OneOS editor plugins

AGPL-3.0-or-later (see `LICENSE`, `NOTICE`). Plugins for the Euro-Office (ONLYOFFICE Docs) editor that
OneOS hosts for an organisation.

## oneos-files

A side panel: browse your OneOS files and tags, search them, and insert an image into the document.

**It holds no credential.** It speaks the OneOS office plugin bridge: it posts an intent
(`{oneosPlugin: <guid>, ask, intent, args}`) up to the OneOS frame page hosting the editor, which relays
only intents in its own allow-list for plugins the session enabled; OneOS performs them as the viewer and
answers data (`{oneosPluginAnswer: ask, ok, data | error}`). An inserted image is fetched by the document
server itself, through a command OneOS signs and hands the editor.

| intent | args | answer |
| --- | --- | --- |
| `oneos.files.list` | `{tag?}` | `{rows: [{id, name, kind, image?, contentType?, size?}], tag}` |
| `oneos.files.search` | `{query}` | `{rows, query}` |
| `oneos.files.insert` | `{file, as: 'image'}` | `{inserted: true, file}` |

## Installing on a server

Mount this directory's plugin folders into the document server's `sdkjs-plugins` directory, e.g. in
compose: `- /opt/office/plugins:/var/www/euro-office/documentserver/sdkjs-plugins:ro` with
`/opt/office/plugins/oneos-files` a copy of `oneos-files/`. Then an organisation administrator ticks the
plugin in OneOS (Admin › Office); each editor session then loads it from the server's own address.
