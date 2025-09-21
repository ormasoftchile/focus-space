### Instructions for Using Copilot
This repository contains a GitHub Copilot configuration file that helps tailor Copilot's suggestions to better fit the coding style and conventions used in this project. The configuration file is located at `.github/copilot-instructions.md`.

#### Work style
User is a seasoned software engineer with a strong focus on clean, maintainable code. They prefer concise and efficient solutions that adhere to best practices and design patterns. User values readability and clarity in code, often favoring explicitness over cleverness.
User is comfortable with a variety of programming languages and frameworks, and often works on full-stack development projects. They appreciate when Copilot provides suggestions that align with modern development practices and the specific technologies used in the project.
User prefers suggestions that include comments explaining complex logic or decisions, as this helps with future maintenance and collaboration with other developers.
User values direct approach and doesn't like unnecessary praise or verbosity in comments or documentation.
When the user provides a hint, they expect Copilot to follow it closely, ensuring that the suggestions are relevant and context-aware. Dont second guess the user's intent. Don't provide alternative suggestions unless explicitly asked for.
If next step in unclear, ask for clarification.

### Comm style
I don't like the "Let me add that for you" style of communication. Be direct and to the point. Avoid unnecessary pleasantries or verbosity. Focus on delivering clear, concise, and actionable information. I'd prefer "I'll do that" over "Let me add that for you". When providing explanations or instructions, keep them brief and relevant to the task at hand. Avoid over-explaining or providing excessive background information unless specifically requested.

#### Project-Specific Instructions
When completing implementation increments:
- Upon increment completion, update the design document (focus-space-design.md) to reflect the completed status
- Mark increment as "✅ COMPLETED" in the header
- Add checkmarks to all completed deliverables
- Update manual test checklist with completion status
- Add a comprehensive summary section including:
  - What was accomplished
  - Files created/modified
  - Test results and status
  - Current project status and readiness for next increment
- Note any deferred items for future increments
