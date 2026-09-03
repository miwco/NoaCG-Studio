---
v: 1
source: walk
raised: 2026-09-04
state: unstarted
asked: "which background services actually hold the memory npm run reclaim cannot free, and what each costs if it is off"
---
# The watchdogs behind the reclaimer, named and measured

**Filed:** 2026-09-04, walking
`docs/acceptance/owner-queue/2026-09-02-reclaim-ram-from-background-apps.md`. That item ended with
an offer - *"Say the word and I will write down exactly which ones and what each one costs you if
it is off"* - which is a piece of writing asking permission to be written. This is it, written.
The item is closed; nothing here needs an answer before it is useful.

Everything below was measured on this machine on 2026-09-04, with 3967 MB free. `npm run reclaim`
would have closed ten processes holding 314 MB and honestly reported that **0 MB of it stays
free**, because each one has something that puts it back. These are the somethings.

## What is actually running, and what it costs

| What | Processes | Held | How it starts |
|---|---|---|---|
| Adobe Creative Cloud, whole family | 11 | **299 MB** | user startup, not a Windows service |
| the two node servers Creative Cloud bundles | 1 | 97 MB | started by Creative Cloud on demand |
| Western Digital Discovery | 6 | **100 MB** | user startup + its own helper |
| ASUS Armoury Crate | 2 + `ROG Live Service` | 23 MB | Windows service, automatic |
| `AdobeUpdateService` | 1 | 3 MB | Windows service, automatic |

Adobe's 299 MB breaks down as Creative Cloud UI Helper 121 MB across four processes, Adobe Desktop
Service 79 MB, Creative Cloud 69 MB, Creative Cloud Helper 17 MB, AdobeIPCBroker 5 MB, CCXProcess
3 MB, AdobeUpdateService 3 MB, AdobeNotificationClient 2 MB. **Roughly 420 MB in total across the
three vendors, and about 520 MB counting Adobe's bundled node servers.**

## The important correction: two of the three are not services at all

`Adobe Desktop Service.exe` and `Creative Cloud.exe` run out of `C:\Program Files\Adobe\...` as
ordinary **user startup programs**, and so does `WD Discovery.exe`. The reclaimer's note that the
remaining memory "is in the services themselves" and that turning them off is "a Windows settings
change" is half right: only the ASUS one and Adobe's small updater are Windows services. The two
that hold the real memory are startup entries, which makes them **easier** to switch off than the
item implies, and reversible from the same screen.

## What to switch off, and what it costs

**Adobe Creative Cloud - about 400 MB, and the only one worth doing.** Turn off *Launch Creative
Cloud at login* in the Creative Cloud desktop app under Account, Preferences, General; or disable
"Adobe Creative Cloud" in Task Manager's Startup apps tab. What it costs: fonts sync, file sync and
update notifications stop happening in the background. **Photoshop, Illustrator and the rest still
open and still work** - the desktop app starts on demand when you launch one, or when you open it
yourself. If Adobe Fonts are active in a document, start Creative Cloud before that work.

**Western Digital Discovery - about 100 MB.** Same route: disable "WD Discovery" in Task Manager's
Startup apps. What it costs: no automatic notice when a WD drive is attached, and no background
firmware-update checks. **The drives themselves mount and work normally** - this is a
notifications-and-updates layer, not a driver.

**ASUS Armoury Crate - about 23 MB, and not worth touching.** `ArmouryCrateService` and
`ROG Live Service` are automatic Windows services. Turning them off costs keyboard lighting, fan
curves and any ASUS hotkeys, for a fifth of what Adobe costs. Leave it.

**`AdobeUpdateService` - 3 MB.** Not worth a settings change on its own; it goes quiet anyway once
Creative Cloud is out of startup.

## The honest total

Adobe and WD together are about **500 MB**, on a machine whose job queue refuses to start a browser
job below 4 GB free. That is meaningful - it is roughly one queued job - but it is still less than
the Codex desktop app alone, which the reclaimer measures at around 700 MB across eleven processes
and deliberately holds back because a conversation might be open in it.

**So the ordering the reclaimer already prints is the right one**, and this note does not change
it: the list is worth more than the button, the Codex app is the largest single thing on the
machine, and these two startup entries are the largest thing that can go away permanently rather
than for a few seconds.

## What would make this a mechanism rather than a note

The reclaimer names processes and closes them. It cannot see that four of those processes exist
only because a startup entry puts them there, so it reports "comes back" without being able to say
what would stop it coming back. Reading `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` and
the Startup-apps state, and printing "this one returns because <entry> starts it - disable it in
Task Manager's Startup apps" beside each `comes back` line, would fold this note into the tool and
keep it measured instead of dated.
