"""Inline writers-data.json and room.js into pehla-draft.html (run after editing either)."""
import re, json, pathlib
root = pathlib.Path(__file__).parent
page = root / "pehla-draft.html"
s = page.read_text()
data = json.dumps(json.loads((root / "writers-data.json").read_text()), ensure_ascii=False).replace("</", "<\\/")
room = (root / "room.js").read_text()
s = re.sub(r"<!--DATA:BEGIN-->.*?<!--DATA:END-->", lambda m: "<!--DATA:BEGIN-->" + data + "<!--DATA:END-->", s, flags=re.S)
s = re.sub(r"/\*ROOM:BEGIN\*/.*?/\*ROOM:END\*/", lambda m: "/*ROOM:BEGIN*/\n" + room + "\n/*ROOM:END*/", s, flags=re.S)
page.write_text(s)
print("built", page, len(s), "bytes")
