<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Discord</title>
    <style>
        :root { color-scheme: dark; }
        body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #1a1b1e;
            color: #f2f3f5;
            font: 500 14px/1.5 "gg sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
        }
        .card { text-align: center; padding: 32px 40px; }
        .spinner {
            width: 34px; height: 34px; margin: 0 auto 16px;
            border: 3px solid rgba(255, 255, 255, .14);
            border-top-color: #5865f2;
            border-radius: 50%;
            animation: spin .7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        p { margin: 0; color: #b5bac1; }
        @media (prefers-reduced-motion: reduce) { .spinner { animation-duration: 3s; } }
    </style>
</head>
<body>
    <div class="card">
        <div class="spinner"></div>
        <p>Finishing up. You can close this window.</p>
    </div>

    <script>
        (function () {
            var message = {
                source: 'dezerx-discord',
                status: @json($status),
                username: @json($username),
            };

            try {
                if (window.opener && !window.opener.closed) {
                    window.opener.postMessage(message, @json($origin));
                }
            } catch (error) {
            }

            window.setTimeout(function () {
                window.close();
            }, 400);
        })();
    </script>
</body>
</html>
