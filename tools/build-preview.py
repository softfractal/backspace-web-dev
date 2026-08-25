#!/usr/bin/env python3
"""Build single-file, self-contained copies of the backspace pages.

Every external reference (stylesheet, script, fonts, cursors, icons,
wordmark) is inlined as a data: URI, so a page cannot break when it is
emailed, re-zipped, flattened, or opened by double-click. Source files
are never modified — output goes to a separate build directory.
"""
import base64, os, re, sys

SRC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.abspath(os.path.join(SRC, os.pardir, os.pardir, "build", "backspace-preview"))
PAGES = ["home.html", "software.html", "community.html"]

MIME = {".woff2": "font/woff2", ".png": "image/png", ".svg": "image/svg+xml",
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}

def data_uri(path):
    ext = os.path.splitext(path)[1].lower()
    with open(path, "rb") as f:
        return "data:%s;base64,%s" % (MIME[ext], base64.b64encode(f.read()).decode())

def inline_css(css):
    """CSS lives in shared/, so its url(../assets/x) resolves from SRC/assets."""
    def sub(m):
        raw = m.group(1).strip().strip('"').strip("'")
        if raw.startswith(("data:", "about:")):
            return m.group(0)
        rel = raw[3:] if raw.startswith("../") else raw
        p = os.path.join(SRC, rel)
        if not os.path.isfile(p):
            print("  !! css asset missing:", raw); return m.group(0)
        return "url(%s)" % data_uri(p)
    return re.sub(r"url\(([^)]*)\)", sub, css)

def inline_js(js):
    """JS references assets/... relative to the page."""
    def sub(m):
        raw = m.group(0)
        p = os.path.join(SRC, raw)
        if not os.path.isfile(p):
            print("  !! js asset missing:", raw); return raw
        return data_uri(p)
    return re.sub(r"assets/[A-Za-z0-9_./-]+\.(?:png|svg|jpg|jpeg|webp)", sub, js)

css = inline_css(open(os.path.join(SRC, "shared/bs-chrome.css")).read())
js  = inline_js(open(os.path.join(SRC, "shared/bs-chrome.js")).read())

os.makedirs(OUT, exist_ok=True)
for page in PAGES:
    html = open(os.path.join(SRC, page)).read()

    html = html.replace('<link rel="stylesheet" href="shared/bs-chrome.css">',
                        "<style>\n%s\n</style>" % css)
    html = html.replace('<script src="shared/bs-chrome.js"></script>',
                        "<script>\n%s\n</script>" % js)

    # page-level image references (the wordmark)
    def img_sub(m):
        raw = m.group(2)
        p = os.path.join(SRC, raw)
        return '%s="%s"' % (m.group(1), data_uri(p)) if os.path.isfile(p) else m.group(0)
    html = re.sub(r'(src|href)="(assets/[^"]+)"', img_sub, html)

    # a self-contained page carries no build note about shared files
    html = html.replace("<head>", "<head>\n<!-- SELF-CONTAINED PREVIEW BUILD — every asset inlined;\n     no folders, no server, no internet required. Generated from\n     the source tree; not the build of record. -->", 1)

    out_path = os.path.join(OUT, page)
    open(out_path, "w").write(html)
    leftover = re.findall(r'(?:src|href)="(?!data:|#|home\.html|software\.html|community\.html)[^"]+"', html)
    leftover += re.findall(r"url\((?!data:|about:|\"about:)[^)]*\)", html)
    print("%-16s %7.0f KB   external refs left: %s"
          % (page, os.path.getsize(out_path)/1024, leftover if leftover else "NONE"))
