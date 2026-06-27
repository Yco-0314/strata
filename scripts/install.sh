#!/usr/bin/env bash
# Architect installer — symlink each canonical skill into an agent's skills dir, so one
# source-of-truth folder fans out to N hosts and an edit propagates everywhere (no drift).
# Borrowed from the vercel `skills` CLI install model; copy-mode fallback for Windows/sandboxes.
#
#   scripts/install.sh                 # dry-run: print what would happen (default)
#   scripts/install.sh --apply         # create the symlinks (Claude Code: ~/.claude/skills)
#   scripts/install.sh --host codex --apply   # Codex: ~/.agents/skills
#   scripts/install.sh --apply --copy  # copy instead of symlink (Windows / no-symlink sandboxes)
#   scripts/install.sh --target DIR    # install into a custom DIR
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST="claude"
TARGET=""
APPLY=0
COPY=0

while [ $# -gt 0 ]; do
  case "$1" in
    --apply) APPLY=1 ;;
    --copy) COPY=1 ;;
    --host) HOST="$2"; shift ;;
    --target) TARGET="$2"; shift ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
  shift
done

if [ -z "$TARGET" ]; then
  case "$HOST" in
    claude) TARGET="${HOME}/.claude/skills" ;;
    codex)  TARGET="${HOME}/.agents/skills" ;;
    *) echo "unknown host: $HOST (use claude|codex, or pass --target DIR)" >&2; exit 2 ;;
  esac
fi

mode=$([ "$COPY" = 1 ] && echo copy || echo symlink)
echo "Architect install  (mode: $mode, apply: $APPLY)"
echo "  source: $ROOT/skills"
echo "  target: $TARGET"
echo

count=0
# Each leaf skill dir (contains SKILL.md) installs as <target>/<skill-name>.
while IFS= read -r skilldir; do
  name="$(basename "$skilldir")"
  dest="$TARGET/$name"
  count=$((count + 1))
  if [ "$APPLY" = 0 ]; then
    echo "  would link  $name  ->  ${skilldir#$ROOT/}"
    continue
  fi
  mkdir -p "$TARGET"
  rm -rf "$dest"
  if [ "$COPY" = 1 ]; then
    cp -R "$skilldir" "$dest"
    echo "  copied   $name"
  elif ln -s "$skilldir" "$dest" 2>/dev/null; then
    echo "  linked   $name"
  else
    # symlink failed (Windows / sandbox) -> fall back to copy automatically
    cp -R "$skilldir" "$dest"
    echo "  copied   $name  (symlink unavailable, fell back to copy)"
  fi
done < <(find "$ROOT/skills" -name SKILL.md -exec dirname {} \; | sort)

echo
echo "$count skills $([ "$APPLY" = 1 ] && echo installed to "$TARGET" || echo "would be installed (run with --apply)")"
if [ "$APPLY" = 1 ]; then
  if [ "$HOST" = "codex" ]; then
    echo "Codex: for ponytail's always-on behavior, append it to a project's instructions:"
    echo "  cat \"$ROOT/skills/l0-constitution/ponytail/SKILL.md\" >> .agents/AGENTS.md"
    echo "(Codex has no hooks/plugins; the node tools run from the shell.)"
  else
    echo "Claude Code: wire the two hooks in ~/.claude/settings.json (SessionStart + PostToolUse) — see README.md / CONTEXT-MAP.md (L6)."
  fi
fi
exit 0
