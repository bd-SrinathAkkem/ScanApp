AI Coding Assistant Testing Template

Status
Current
Date
📋 Approval
✅ Approved
Apr 22, 2025
🧪 Testing
⏳ In progress
_____
Overview

Managing SCA and SAST scan pipelines present significant challenges for customers, particularly in terms of bulk onboarding, orchestration, and maintenance. An automated solution that streamlines these processes would significantly reduce overhead while enabling rapid workflow implementation and delivering an enhanced user experience
Users want the app to automatically onboard projects for automated SCA and SAST scans under on to GitHub and our platforms
Users desire automatic management of SCA and SAST tooling upgrades by the app.
Users wish to incrementally analyze their sources for security vulnerabilities, license violations, vulnerabilities in AI models usage (in the future)
Users prefer to analyze source internally using a hosted runners setup.
Users would like to view the SCA and SAST results both in Github Advanced Security and in our current platforms Black Duck SCA, Coverity and Polaris (persistent data)
Actionability (remediation) through Automatic Fix PRs and PR comments on all branches.
Continuous onboarding of new repos/projects once the App is installed (after initial onboarding across entire Github organization)
AI Tool Details

Primary AI tool(s): Roo Code + CoPilot
Internally available LLM gateway with multiple models.
Planned Testing, Results and Outcomes

What specific tasks/scenarios you plan to test
Complete UI/UX and App server side code generation for individual components for React and NodeJs 
End to end integration with Figma designs
Using Architect mode for design
Building threat models based on architecture
Automate browser actions
AI assisted code reviews.
Many more..
Success criteria or what you're measuring
Generate code based from natural language descriptions - Yes
Automate repeated tasks - Yes
Worfklow automation - Yes
Very important - Finding common context across internal systems we use for development - No
Figma integration - Few minor challenges (will add more context here…)
Complex reasoning and long context customizations - No
