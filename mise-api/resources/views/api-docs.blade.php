<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" type="image/x-icon" href="{{ asset('favicon.ico') }}">
    <title>MISE — Documentation API</title>
    <style>
        :root {
            color-scheme: light;
            --bg: #F1F2EF;
            --surface: #FFFFFF;
            --border: #D2D4CE;
            --text: #1B1D1F;
            --text-dim: #585F65;
            --text-faint: #8B9096;
            --accent: #1F6E99;
            --code-bg: #23282D;
            --code-text: #ECEEEF;
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            background: var(--bg);
            color: var(--text);
            font-family: -apple-system, "Segoe UI", system-ui, sans-serif;
            line-height: 1.5;
        }
        .wrap { max-width: 860px; margin: 0 auto; padding: 48px 24px 80px; }
        h1 { font-size: 26px; font-weight: 900; letter-spacing: -.5px; margin: 0 0 4px; }
        h1 span { color: var(--accent); }
        .sub { color: var(--text-dim); font-size: 14.5px; margin: 0 0 28px; }
        .info-box {
            background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
            padding: 16px 20px; margin-bottom: 32px; font-size: 13.5px; color: var(--text-dim);
        }
        .info-box code {
            background: var(--code-bg); color: var(--code-text); padding: 2px 6px; border-radius: 4px;
            font-size: 12.5px;
        }
        .resource { margin-bottom: 28px; }
        .resource h2 {
            font-size: 15px; font-weight: 700; margin: 0 0 4px;
            font-family: ui-monospace, "IBM Plex Mono", monospace;
        }
        .resource p { color: var(--text-dim); font-size: 13.5px; margin: 0 0 10px; }
        table { width: 100%; border-collapse: collapse; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
        th, td { text-align: left; padding: 9px 14px; font-size: 13px; border-bottom: 1px solid var(--border); }
        tr:last-child td { border-bottom: none; }
        th { color: var(--text-faint); font-weight: 600; text-transform: uppercase; font-size: 10.5px; letter-spacing: .05em; }
        td.method { font-family: ui-monospace, "IBM Plex Mono", monospace; font-weight: 700; }
        td.method[data-m="GET"] { color: #1F6E99; }
        td.method[data-m="POST"] { color: #48693F; }
        td.method[data-m="PUT/PATCH"] { color: #9C5A28; }
        td.method[data-m="DELETE"] { color: #A5382C; }
        td.uri { font-family: ui-monospace, "IBM Plex Mono", monospace; }
        footer { color: var(--text-faint); font-size: 12px; margin-top: 40px; }
    </style>
</head>
<body>
    <div class="wrap">
        <h1>MISE<span>.</span> — API</h1>
        <p class="sub">Documentation sommaire des endpoints de l'API MISE.</p>

        <div class="info-box">
            Base URL : <code>{{ url('/api') }}</code> — API REST JSON. <code>auth/login</code> et
            <code>auth/users</code> sont publiques, tout le reste requiert un token Sanctum
            (<code>Authorization: Bearer &lt;token&gt;</code>, obtenu via <code>POST auth/login</code>)
            et, pour certaines actions d'écriture, le rôle <code>admin</code>. Envoyer
            <code>Accept: application/json</code>. Les champs attendus par ressource sont
            validés côté serveur (erreurs 422 avec détails en JSON).
        </div>

        @foreach ($resources as $resource => $routes)
            <div class="resource">
                <h2>/api/{{ $resource }}</h2>
                @if (isset($descriptions[$resource]))
                    <p>{{ $descriptions[$resource] }}</p>
                @endif
                <table>
                    <thead>
                        <tr>
                            <th style="width: 90px">Méthode</th>
                            <th>URL</th>
                            <th style="width: 110px">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($routes as $route)
                            <tr>
                                <td class="method" data-m="{{ $route['method'] }}">{{ $route['method'] }}</td>
                                <td class="uri">{{ $route['uri'] }}</td>
                                <td>{{ $route['action'] }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        @endforeach

        <footer>MISE — outil interne de cuisine, généré depuis les routes enregistrées de l'API.</footer>
    </div>
</body>
</html>
