# Pehla Draft

A Claude artifact that turns a story idea into a first draft in Hindi or Hinglish.

1. **Idea**: type the idea and pick a language (scripts are always Hinglish).
2. **Format & length**: page (short story, novella, novel), stage (one-act, full-length play) or screen (Reel / Short, YouTube short, short film, feature, web series). Screen time and page count update together.
3. **Questions**: Claude asks follow-up questions about your story.
4. **Outline**: edit the outline, tick suggestions, approve.
5. **Draft**: written part by part, with rewrite notes. A "Story so far" note after each part keeps names and facts consistent. Download as PDF or Fountain (.txt).

The page runs on the viewer's own Claude plan (no API key). Source: `pehla-draft.html`.

## Writers' Room, Books and Videos

- **Writers' Room**: about 45 writers and craft books (Hindi & Urdu, Indian film, world classics, theatre, craft). Real passages only for out-of-copyright works, copied from Wikisource with sources; living writers get style notes and labelled imitations. Tools: Critic, Lessons, Side by side, Compare drafts, Co-writer style in the draft view.
- **Books**: upload a PDF; its text is saved privately and used in critiques, lessons and "Ask this book".
- **Videos**: upload a video (up to 20 MB) or save a link, plus a transcript or subtitles that Claude learns from.

Source layout: `room.js` and `writers-data.json` are inlined into `pehla-draft.html` by `python3 build.py`.
