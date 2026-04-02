Run lint and format for both client and server, then commit all staged/unstaged changes and push to the remote.

## Steps

1. Run `npm run lint:client` — stop and report errors if it fails.
2. Run `npm run lint:server` — stop and report errors if it fails.
3. Run `npm run format:client` — apply formatting.
4. Run `npm run format:server` — apply formatting.
5. Run `git status` to show the user what will be committed.
6. If the user provided a message as an argument to `/commitpush`, use it as the commit message. Otherwise, look at the staged/unstaged diff and propose a concise commit message, then ask the user to confirm or edit it before proceeding.
7. Stage all changes — both modified and **new untracked files** — with `git add`. Use `git status --short` to identify all files to stage (including untracked ones), then add them by name (preferred over `git add -A`); avoid staging `.env` or credential files.
8. Commit with the confirmed message.
9. Push to the current branch's remote tracking branch.
10. Report the final `git status` and the pushed commit hash.
