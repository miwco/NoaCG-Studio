---
kind: owner-action
date: 2026-08-26
---

# Optional: a marketplace address that is not your handle

**Nothing is blocked and nothing is broken.** The install command works and is documented, handle
and all:

```bash
claude plugin marketplace add miwco/NoaCG-Studio
claude plugin install noacg@noacg-studio
```

Both were run end to end against the published marketplace and removed again before being written
down. `owner/repo` is the documented Claude Code shorthand, and one of the three marketplaces
already configured on this machine is a personal handle, so it reads as ordinary rather than as a
hobby project. Your ruling stands: this was a vanity reason, and it was not worth breaking the
plugin route over.

This file stays only because you said you would look at it if it turned out to be easy and free.
**It is both.** If you ever want the handle gone, these are the two ways, and neither has to happen
today.

**A - a GitHub organisation.** Create a free org and transfer the repository to it. The command
becomes `claude plugin marketplace add noacg/NoaCG-Studio`, and the handle also leaves every
`github.com/miwco/...` link: `/docs`, the landing, the terms and privacy pages, the npm
`repository` field, and roughly 500 exported template footers. Free, about ten minutes.
GitHub redirects the old URLs, so nothing breaks the moment you do it.

**The one thing to do in the same sitting:** the npm trusted-publisher entry names `miwco` as the
organisation (see `2026-08-25-trusted-publishing-for-the-cli.md`). Update it when you transfer, or
the next CLI release fails to authenticate. That is the only sharp edge in this option.

**B - host the marketplace file at noacg.studio.** You said this one sounds good if it works, and
it does work: `claude plugin marketplace add` accepts a plain HTTPS URL to a `marketplace.json`,
so `claude plugin marketplace add https://noacg.studio/marketplace.json` would be the command. A
bare domain is not accepted, so it has to be the full path to the file. Free, a small branch plus
a Vercel route.

**The catch, and it is why A is the better one:** a URL-hosted marketplace cannot use a relative
plugin `source`, so the file itself would have to name
`{"source": "github", "repo": "miwco/NoaCG-Studio"}`. The handle stops being something anyone
types, but stays readable in the file, and every `github.com/miwco/...` link elsewhere is
untouched. B moves the handle; A removes it.

**If you want the professional signal rather than the name change**, the higher-value ten minutes
is the npm trusted-publisher step in `2026-08-25-trusted-publishing-for-the-cli.md`. That puts a
provenance badge on `@noacg/cli` linking every published version to the commit it was built from,
which is a much stronger "this is a real project" mark than a username in a URL.
