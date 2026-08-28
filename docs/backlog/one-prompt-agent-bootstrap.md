# One paste-to-agent prompt bootstraps the agent door

Owner ruling, 2026-08-28 walk (section itself accepted as good): *"we could just have one
prompt that they copy to their agent, and the agent does all the work... The prompt would then
install the CLI tool... It would just tell the user that it's ready to start creating
graphics... Let's have one prompt that they can paste to their agent, and the agent fixes all
installations."* Commands stay available in Reference. The bootstrap prompt must be
tool-agnostic (detect Claude Code / Codex / other-MCP), fall back to npx so the first session
works before the plugin loads, verify itself, and end by telling the user to describe their
graphic. Task spawned same day.
