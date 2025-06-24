Use case 1: support multi version for a SCM
Use case 2 : support multi version for a SCM
Use case 3: Automatic code generation for integrations
Overview
AI Tool Details
Planned Testing
Results and Outcomes
Use case 1: support multi version for a SCM
Find differences in diff version of on Prem SCM and Cloud.

Check cloud version release notes.

compare latest cloud version and a specific enterprise  server version.

Check release notes for enterprise server version.

compare 2 enterprise server version.

Check against the REST APIs that we use in code, runner, environment variable or any breaking change that is mentioned in release notes.

Generate schema diff.

Based on Schema Diff, update the code and create automatic pull request for the code repo.

Use case 2 : support multi version for a SCM
Create a chatbot for Documentation to help with customer queries related to our integrations documented feature, add SCM public doc links

Generate workflow file based on user requested feature.

Use case 3: Automatic code generation for integrations
We can ask agent to add a new feature to any of our integrations repo it should understand the context and make changes and create a automatic pull request.

We can use it for feature parity, for each integration.

Try this to see if we can create new integration using it.






Overview
Brief project description

We have 5 integrations products one for each SCM platform(GitHub, Gitlab, Jenkins, bitbucket, Azure).  Which will eventually grow in future.

The underlining functionality is same but code base and tech stack is different created based on platform.

In order to add any new feature, we have to make code changes in each of them. 

If there is any update or contract change on SCM side like Github Gitlab etc. we have to manually update our code.

We want to update integrations code bases base based on these contexts.

I have already tried with copilot and clause sonnet 3.5 to add new feature but it’s unable to fully understand the context. Therefore unable to add codes in all relevant files.

AI Tool Details
Primary AI tool: Claude Code

Model version: (please stick to Sonnet 4 unless discussing with Drew)

Were any other AI tools already in use for this project before starting this analysis?

Planned Testing
What specific tasks/scenarios you plan to test

It should be able to understand at the context and code against any new any new feature in the integrations product code bases. 

It would be able to connect to GitHub through MCP and create automatic pull request for the change.

Success criteria or what you're measuring

We would like to analyse how it can help us automatically generate code for each integrations without manual intervention. 

How it’s reducing our Go to Market timelines for adding new feature and in future use case creating new integrations.

Testing approach/methodology

Unit test

Integration test

Results and Outcomes
What actually happened

Did it help? How?

Specific examples or metrics

Any unexpected findings

 

 

 

Team capability

Developer

Idea/Area

 

Chatbot for documentation guide. 

generating workflows

 

Customer

ai agent for end to end code generation in context of a feature.

if a feature is added in Action, it can be used for other 4 integrations as well.

Internal- Dev productivity


code quality on the PR

generate test cases based on Jira description or TA page

Internal- Dev productivity

Multiversion SCM diff checker

Internal- Dev productivity

 
