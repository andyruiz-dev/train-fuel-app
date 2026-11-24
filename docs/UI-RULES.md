# Train & Fuel UI rules

Check these before changing any screen. `tools/screens.js` enforces the ones marked (auto).

0. **Text budget comes first.** Before adding or changing anything, count the words. Prefer a number, icon or one word to a sentence. No explanatory sentences on main screens; put them behind the (i) or a sheet. When adding a line, remove one.
1. **Fits the screen** (auto). Every tab fits the display with no cut-off and no scroll, on 360x740, 390x844 and 412x915. `fitToScreen()` in js/ui.js tightens, drops secondary lines, then shrinks to at most 74%.
2. **Tap targets** (auto): at least 32 CSS px tall; design for 40.
3. **Text size** (auto): nothing under 11px.
4. **Cards stand out** (auto): card fill vs background contrast at least 1.12.
5. **Day names are Title Case** (auto): "Push + Core A".
6. **No sideways page scroll** (auto).
7. **Masthead** (auto): content starts within the top 30% of the screen.
8. One workout move per line: name and sets x reps. Notes live in the how-to sheet.
9. Apply any visual change to every screen, not one. Run `bash tools/check.sh` (includes screens.js) before each PR.
